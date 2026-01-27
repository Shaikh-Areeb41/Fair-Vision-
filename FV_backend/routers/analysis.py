from fastapi import APIRouter, HTTPException
from database import datasets_collection
from bson import ObjectId
import pandas as pd
import numpy as np
import re
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.metrics import accuracy_score, confusion_matrix

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])

@router.post("/{dataset_id}/train")
async def train_and_analyze(dataset_id: str):
    try:
        # 1. Fetch Dataset
        if not ObjectId.is_valid(dataset_id):
             raise HTTPException(status_code=400, detail="Invalid Dataset ID")
             
        obj_id = ObjectId(dataset_id)
        dataset = await datasets_collection.find_one({"_id": obj_id})
        
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
            
        # --- FIX 1: READ CONFIG FROM ROOT (Not 'configuration') ---
        # We check if the required fields exist directly on the dataset object
        if "target_column" not in dataset or "sensitive_attribute" not in dataset:
             raise HTTPException(status_code=400, detail="Dataset not configured. Please configure it first.")

        target_col = dataset["target_column"]
        sensitive_col = dataset["sensitive_attribute"]
        privileged_val = dataset.get("privileged_group") # .get() is safer

        # --- FIX 2: LOAD DATA FROM PREVIEW ---
        # Our upload route saves 'preview' (1000 rows). We use that for analysis.
        data_source = dataset.get("full_data") or dataset.get("preview")
        if not data_source:
             raise HTTPException(status_code=400, detail="No data found in dataset.")
             
        df = pd.DataFrame(data_source)
        
        # Basic cleaning: handle missing values
        df.replace("?", np.nan, inplace=True)
        df.dropna(inplace=True)

        # --- HANDLING PRIVILEGED GROUP LOGIC ---
        
        # A. Check for Numeric Thresholds (e.g., ">40")
        if pd.api.types.is_numeric_dtype(df[sensitive_col]):
            match = re.match(r"([<>]=?)(.*)", str(privileged_val).strip())
            if match:
                operator, value_str = match.groups()
                try:
                    threshold = float(value_str)
                    if operator == ">": mask = df[sensitive_col] > threshold
                    elif operator == ">=": mask = df[sensitive_col] >= threshold
                    elif operator == "<": mask = df[sensitive_col] < threshold
                    elif operator == "<=": mask = df[sensitive_col] <= threshold
                    
                    df[sensitive_col] = np.where(mask, "Privileged_Group", "Unprivileged_Group")
                    privileged_val = "Privileged_Group"
                    print(f"Applied Numeric Split: {sensitive_col} {operator} {threshold}")
                except ValueError:
                    pass

        # B. Check for Comma-Separated Lists (e.g., "Bachelors, Masters")
        elif "," in str(privileged_val):
            # Clean up the list (remove spaces)
            target_values = [x.strip() for x in str(privileged_val).split(",")]
            
            # Create mask: True if the row's value is in our list
            mask = df[sensitive_col].astype(str).isin(target_values)
            
            df[sensitive_col] = np.where(mask, "Privileged_Group", "Unprivileged_Group")
            privileged_val = "Privileged_Group"
            print(f"Applied List Split: {sensitive_col} in {target_values}")

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

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

        # Use Pipeline with Scaler
        model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000, solver='lbfgs'))
        model.fit(X_train, y_train)
        
        y_pred = model.predict(X_test)

        # 5. Calculate Standard Metrics
        overall_accuracy = accuracy_score(y_test, y_pred)

        # 6. Calculate Fairness Metrics (SRS Requirements)
        test_df = X_test.copy()
        test_df['actual'] = y_test
        test_df['predicted'] = y_pred
        
        priv_code = sensitive_mapping.get('priv')
        
        # Initialize default values
        tpr_priv, fpr_priv, sr_priv, acc_priv, prec_priv = 0, 0, 0, 0, 0
        tpr_unpriv, fpr_unpriv, sr_unpriv, acc_unpriv, prec_unpriv = 0, 0, 0, 0, 0
        dpd, fprd, eod, di = 0, 0, 0, 0

        if priv_code is not None:
            # Split groups
            priv_group = test_df[test_df[sensitive_col] == priv_code]
            unpriv_group = test_df[test_df[sensitive_col] != priv_code]

            # --- METRICS HELPER FUNCTION ---
            def get_metrics(group):
                if len(group) == 0: return 0, 0, 0, 0, 0
                
                cm = confusion_matrix(group['actual'], group['predicted'], labels=[0, 1])
                
                # Handle edge case where CM is smaller than 2x2
                if cm.shape != (2, 2): 
                    tn, fp, fn, tp = 0, 0, 0, 0
                    if cm.shape == (1, 1):
                        if group['actual'].iloc[0] == 0: tn = cm[0,0]
                        else: tp = cm[0,0]
                else:
                    tn, fp, fn, tp = cm.ravel()
                
                total = len(group)
                
                # Calculations
                tpr = tp / (tp + fn) if (tp + fn) > 0 else 0  # Recall
                fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
                sr = (tp + fp) / total if total > 0 else 0      # Selection Rate
                
                # NEW METRICS
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
            
            # --- OLD KEYS (Backward compatibility) ---
            "privileged_rate": round(sr_priv, 4),
            "unprivileged_rate": round(sr_unpriv, 4),
            
            # --- NEW KEYS (For Charts) ---
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
        # Return strict error messages to help debugging
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")