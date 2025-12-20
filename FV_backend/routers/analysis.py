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
        # Initialize the mapping dictionary
        sensitive_mapping = {} 

        # A. Encode the Target (Income)
        le_target = LabelEncoder()
        df[target_col] = le_target.fit_transform(df[target_col].astype(str))
        
        # B. Encode the Sensitive Attribute (Sex)
        # We need this to be 0s and 1s for the metrics later
        le_sex = LabelEncoder()
        df[sensitive_col] = le_sex.fit_transform(df[sensitive_col].astype(str))
        
        # Capture the numeric code for the privileged group (e.g., Male = 1)
        mapping = dict(zip(le_sex.classes_, le_sex.transform(le_sex.classes_)))
        if privileged_val in mapping:
             sensitive_mapping['priv'] = mapping[privileged_val]

        # 4. Train Model with One-Hot Encoding
        # Separate X and y
        X = df.drop(columns=[target_col])
        y = df[target_col]
        
        # Apply One-Hot Encoding to categorical features 
        # (Exclude sensitive_col because we already label-encoded it above)
        X = pd.get_dummies(X, columns=[c for c in X.columns if X[c].dtype == 'object' and c != sensitive_col])

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        model = LogisticRegression(max_iter=1000)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        # 5. Calculate Standard Metrics
        accuracy = accuracy_score(y_test, y_pred)

        # 6. Calculate Fairness Metrics (SRS Requirements)
        test_df = X_test.copy()
        test_df['actual'] = y_test
        test_df['predicted'] = y_pred
        
        priv_code = sensitive_mapping.get('priv')
        
        if priv_code is not None:
            # Split groups
            priv_group = test_df[test_df[sensitive_col] == priv_code]
            unpriv_group = test_df[test_df[sensitive_col] != priv_code]

            # Helper for Confusion Matrix metrics
            def get_metrics(group):
                if len(group) == 0: return 0, 0, 0
                cm = confusion_matrix(group['actual'], group['predicted'], labels=[0, 1])
                # Handle edge case where CM is smaller than 2x2
                if cm.shape == (1, 1): return 0, 0, 0 
                
                tn, fp, fn, tp = cm.ravel()
                tpr = tp / (tp + fn) if (tp + fn) > 0 else 0 # True Positive Rate (Recall)
                fpr = fp / (fp + tn) if (fp + tn) > 0 else 0 # False Positive Rate
                sr = (tp + fp) / len(group) # Selection Rate (Positive Prediction Rate)
                return tpr, fpr, sr

            tpr_priv, fpr_priv, sr_priv = get_metrics(priv_group)
            tpr_unpriv, fpr_unpriv, sr_unpriv = get_metrics(unpriv_group)

            # --- SRS METRICS ---
            
            # 1. Demographic Parity Difference (DPD)
            dpd = abs(sr_priv - sr_unpriv)

            # 2. False Positive Rate Difference (FPRD)
            fprd = abs(fpr_priv - fpr_unpriv)

            # 3. Equalized Odds Difference (EOD)
            eod = abs(tpr_priv - tpr_unpriv) + abs(fpr_priv - fpr_unpriv)

            # 4. Disparate Impact (DI)
            di = sr_unpriv / sr_priv if sr_priv > 0 else 0

        else:
            # Fallback
            dpd = fprd = eod = di = 0.0
            sr_priv = sr_unpriv = 0.0

        result = {
            "accuracy": round(accuracy, 4),
            "dpd": round(dpd, 4),
            "fprd": round(fprd, 4),
            "eod": round(eod, 4),
            "di": round(di, 4),
            "privileged_rate": round(sr_priv, 4),
            "unprivileged_rate": round(sr_unpriv, 4),
            "message": "Analysis complete"
        }

        # Persist results on the dataset document for later retrieval
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