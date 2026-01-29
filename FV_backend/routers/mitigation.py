from fastapi import APIRouter, HTTPException
from database import datasets_collection
from bson import ObjectId
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.metrics import accuracy_score, confusion_matrix

router = APIRouter(prefix="/api/mitigation", tags=["Mitigation"])

# Helper to calculate group-specific metrics
def calc_metrics(y_true, y_pred):
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    # Handle single class edge cases
    if cm.shape != (2, 2):
        return 0.0, 0.0, 0.0
        
    tn, fp, fn, tp = cm.ravel()
    total = tn + fp + fn + tp
    
    if total == 0: return 0.0, 0.0, 0.0

    acc = (tp + tn) / total
    tpr = tp / (tp + fn) if (tp + fn) > 0 else 0  # True Positive Rate (Recall)
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0  # False Positive Rate
    
    return acc, tpr, fpr

@router.post("/{dataset_id}/apply")
async def apply_mitigation(dataset_id: str):
    try:
        if not ObjectId.is_valid(dataset_id):
             raise HTTPException(status_code=400, detail="Invalid Dataset ID")
        
        obj_id = ObjectId(dataset_id)
        dataset = await datasets_collection.find_one({"_id": obj_id})
        
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
            
        # 1. Get Data & Config
        data_source = dataset.get("full_data") or dataset.get("preview")
        if not data_source:
             raise HTTPException(status_code=400, detail="No data available for mitigation.")

        df = pd.DataFrame(data_source)
        df.replace("?", np.nan, inplace=True)
        df.dropna(inplace=True)
        
        config = dataset.get("configuration") or {}
        # Fallback to root keys
        if not config:
            config = {
                "target_column": dataset.get("target_column"),
                "sensitive_attribute": dataset.get("sensitive_attribute"),
                "privileged_group": dataset.get("privileged_group"),
            }

        target_col = config.get("target_column")
        sensitive_col = config.get("sensitive_attribute")
        priv_group_val = config.get("privileged_group")

        if not target_col or not sensitive_col:
             raise HTTPException(status_code=400, detail="Dataset configuration missing.")

        # 2. Preprocessing
        le_target = LabelEncoder()
        df[target_col] = le_target.fit_transform(df[target_col].astype(str))
        
        le_sex = LabelEncoder()
        df[sensitive_col] = le_sex.fit_transform(df[sensitive_col].astype(str))
        
        # Identify codes
        priv_code = None
        mapping = dict(zip(le_sex.classes_, le_sex.transform(le_sex.classes_)))
        if priv_group_val in mapping:
             priv_code = mapping[priv_group_val]

        # --- FIX STARTS HERE ---
        X = df.drop(columns=[target_col])
        y = df[target_col]
        
        # *** SAFETY LOOP: Convert ALL remaining text columns to numbers ***
        # This replaces pd.get_dummies and prevents the crash.
        for col in X.columns:
            # Check if the column is NOT a number (e.g., text, category, object)
            if not pd.api.types.is_numeric_dtype(X[col]):
                le_temp = LabelEncoder()
                # Force conversion to string first, then encode to number
                X[col] = le_temp.fit_transform(X[col].astype(str))
        # --- FIX ENDS HERE ---

        # 3. Train Baseline Model
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
        model = make_pipeline(StandardScaler(), LogisticRegression(solver='lbfgs', max_iter=1000))
        model.fit(X_train, y_train)
        
        # Get Probabilities
        y_probs = model.predict_proba(X_test)[:, 1]
        
        test_df = X_test.copy()
        test_df['actual'] = y_test
        test_df['prob'] = y_probs
        
        # 4. MITIGATION: Threshold Optimization
        if priv_code is None:
             # Fallback if config is messy: assume 0 or 1
             priv_code = 1 if 1 in test_df[sensitive_col].unique() else 0

        priv_rows = test_df[test_df[sensitive_col] == priv_code]
        unpriv_rows = test_df[test_df[sensitive_col] != priv_code]
        
        # Base Selection Rate (Privileged)
        priv_selection_rate = (priv_rows['prob'] > 0.5).mean()
        
        # Find Best Threshold for Unprivileged
        best_thresh = 0.5
        min_diff = 1.0
        
        for thresh in np.linspace(0.01, 0.99, 100):
            unpriv_rate = (unpriv_rows['prob'] > thresh).mean()
            diff = abs(unpriv_rate - priv_selection_rate)
            if diff < min_diff:
                min_diff = diff
                best_thresh = thresh
                
        # 5. Apply New Thresholds
        priv_preds = (priv_rows['prob'] > 0.5).astype(int)
        unpriv_preds = (unpriv_rows['prob'] > best_thresh).astype(int)
        
        # 6. Calculate Detailed Metrics
        acc_priv, tpr_priv, fpr_priv = calc_metrics(priv_rows['actual'], priv_preds)
        acc_unpriv, tpr_unpriv, fpr_unpriv = calc_metrics(unpriv_rows['actual'], unpriv_preds)

        # Combine for overall
        final_preds = np.concatenate([priv_preds, unpriv_preds])
        final_actuals = np.concatenate([priv_rows['actual'], unpriv_rows['actual']])
        new_acc = accuracy_score(final_actuals, final_preds)
        
        new_sr_priv = priv_preds.mean()
        new_sr_unpriv = unpriv_preds.mean()
        new_dpd = abs(new_sr_priv - new_sr_unpriv)
        
        result = {
            "projected_accuracy": round(new_acc, 4),
            "projected_dpd": round(new_dpd, 4),
            "applied_threshold_priv": 0.5,
            "applied_threshold_unpriv": round(best_thresh, 4),
            
            # Selection Rates
            "privileged_rate": round(new_sr_priv, 4),
            "unprivileged_rate": round(new_sr_unpriv, 4),
            
            # --- DETAILED METRICS FOR CHARTS ---
            "privileged_accuracy": round(acc_priv, 4),
            "unprivileged_accuracy": round(acc_unpriv, 4),
            
            "privileged_tpr": round(tpr_priv, 4),
            "unprivileged_tpr": round(tpr_unpriv, 4),
            
            "privileged_fpr": round(fpr_priv, 4),
            "unprivileged_fpr": round(fpr_unpriv, 4),
            
            "strategy": "Threshold Optimization"
        }
        
        # Save to DB
        await datasets_collection.update_one(
            {"_id": obj_id},
            {"$set": {"mitigation": result}}
        )
        
        return result

    except Exception as e:
        print(f"Mitigation Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))