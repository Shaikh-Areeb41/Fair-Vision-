from fastapi import APIRouter, HTTPException
from database import datasets_collection
from bson import ObjectId
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, confusion_matrix

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])

@router.post("/{dataset_id}/train")
async def train_and_analyze(dataset_id: str):
    try:
        # 1. Fetch Dataset
        obj_id = ObjectId(dataset_id)
        dataset = await datasets_collection.find_one({"_id": obj_id})
        
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
            
        config = dataset.get("configuration")
        if not config:
            raise HTTPException(status_code=400, detail="Dataset not configured.")

        target_col = config["target_column"]
        sensitive_col = config["sensitive_attribute"]
        privileged_val = config["privileged_group"]

        # 2. Load & Clean Data
        df = pd.DataFrame(dataset["full_data"])
        df.replace("?", np.nan, inplace=True)
        df.dropna(inplace=True)

        # 3. Encode Data CORRECTLY
        sensitive_mapping = {} 

        # A. Encode the Target 
        le_target = LabelEncoder()
        df[target_col] = le_target.fit_transform(df[target_col].astype(str))
        
        # B. Encode the Sensitive Attribute
        le_sex = LabelEncoder()
        df[sensitive_col] = le_sex.fit_transform(df[sensitive_col].astype(str))
        
        # Capture the numeric code for the privileged group
        mapping = dict(zip(le_sex.classes_, le_sex.transform(le_sex.classes_)))
        if privileged_val in mapping:
             sensitive_mapping['priv'] = mapping[privileged_val]

        # 4. Train Model with One-Hot Encoding
        X = df.drop(columns=[target_col])
        y = df[target_col]
        
        # Exclude sensitive_col from dummies because we already encoded it
        X = pd.get_dummies(X, columns=[c for c in X.columns if X[c].dtype == 'object' and c != sensitive_col])

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        model = LogisticRegression(max_iter=1000)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        # 5. Calculate Standard Metrics
        overall_accuracy = accuracy_score(y_test, y_pred)

        # 6. Calculate Fairness Metrics (SRS Requirements)
        test_df = X_test.copy()
        test_df['actual'] = y_test
        test_df['predicted'] = y_pred
        
        priv_code = sensitive_mapping.get('priv')
        
        # Initialize default values in case group not found
        tpr_priv, fpr_priv, sr_priv, acc_priv, prec_priv = 0, 0, 0, 0, 0
        tpr_unpriv, fpr_unpriv, sr_unpriv, acc_unpriv, prec_unpriv = 0, 0, 0, 0, 0
        dpd, fprd, eod, di = 0, 0, 0, 0

        if priv_code is not None:
            # Split groups
            priv_group = test_df[test_df[sensitive_col] == priv_code]
            unpriv_group = test_df[test_df[sensitive_col] != priv_code]

            # --- UPDATED HELPER FUNCTION ---
            def get_metrics(group):
                if len(group) == 0: return 0, 0, 0, 0, 0
                
                cm = confusion_matrix(group['actual'], group['predicted'], labels=[0, 1])
                
                # Handle edge case where CM is smaller than 2x2
                if cm.shape != (2, 2): 
                    # Attempt to pad if possible, or return 0
                    tn, fp, fn, tp = 0, 0, 0, 0
                    if cm.shape == (1, 1):
                        # Very simplified fallback for tiny samples
                        if group['actual'].iloc[0] == 0: tn = cm[0,0]
                        else: tp = cm[0,0]
                else:
                    tn, fp, fn, tp = cm.ravel()
                
                total = len(group)
                
                # Calculations
                tpr = tp / (tp + fn) if (tp + fn) > 0 else 0  # Recall
                fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
                sr = (tp + fp) / total if total > 0 else 0
                
                # NEW METRICS ADDED HERE
                acc = (tp + tn) / total if total > 0 else 0
                prec = tp / (tp + fp) if (tp + fp) > 0 else 0
                
                return tpr, fpr, sr, acc, prec

            # Unpack the 5 values
            tpr_priv, fpr_priv, sr_priv, acc_priv, prec_priv = get_metrics(priv_group)
            tpr_unpriv, fpr_unpriv, sr_unpriv, acc_unpriv, prec_unpriv = get_metrics(unpriv_group)

            # --- SRS METRICS ---
            dpd = abs(sr_priv - sr_unpriv)
            fprd = abs(fpr_priv - fpr_unpriv)
            eod = abs(tpr_priv - tpr_unpriv) + abs(fpr_priv - fpr_unpriv)
            di = sr_unpriv / sr_priv if sr_priv > 0 else 0

        result = {
            "accuracy": round(overall_accuracy, 4),
            "dpd": round(dpd, 4),
            "fprd": round(fprd, 4),
            "eod": round(eod, 4),
            "di": round(di, 4),
            
            # --- OLD KEYS (Keep for backward compatibility) ---
            "privileged_rate": round(sr_priv, 4),
            "unprivileged_rate": round(sr_unpriv, 4),
            
            # --- NEW KEYS (REQUIRED FOR CHARTS) ---
            "privileged_accuracy": round(acc_priv, 4),
            "unprivileged_accuracy": round(acc_unpriv, 4),
            
            "privileged_tpr": round(tpr_priv, 4),
            "unprivileged_tpr": round(tpr_unpriv, 4),
            
            "privileged_fpr": round(fpr_priv, 4),
            "unprivileged_fpr": round(fpr_unpriv, 4),
            
            "privileged_precision": round(prec_priv, 4),
            "unprivileged_precision": round(prec_unpriv, 4),
            
            "message": "Analysis complete"
        }

        # Persist results
        try:
            await datasets_collection.update_one(
                {"_id": obj_id},
                {"$set": {"analysis": result, "status": "Analyzed"}}
            )
        except Exception as up_err:
            print(f"Warning: Failed to persist analysis: {up_err}")

        return result

    except Exception as e:
        print(f"Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")