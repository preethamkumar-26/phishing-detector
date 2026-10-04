import os
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import classification_report, roc_auc_score, roc_curve
from sklearn.svm import LinearSVC

def compute_tpr_at_fpr(y_true, y_scores, target_fpr, pos_val, neg_val):
    mask = (y_true == pos_val) | (y_true == neg_val)
    if not np.any(y_true == pos_val) or not np.any(y_true == neg_val):
        return 0.0
    y_binary = (y_true[mask] == pos_val).astype(int)
    scores = y_scores[mask]
    fpr, tpr, _ = roc_curve(y_binary, scores)
    valid_idx = np.where(fpr <= target_fpr)[0]
    return float(np.max(tpr[valid_idx])) if len(valid_idx) > 0 else 0.0

print("Step 1: Loading data...")
train_df = pd.read_parquet(os.path.join("..", "..", "data", "train.parquet"))
test_df = pd.read_parquet(os.path.join("..", "..", "data", "test_random.parquet"))

train_df['body'] = train_df['body'].fillna('')
test_df['body'] = test_df['body'].fillna('')

y_train = train_df['label']
y_test = test_df['label']

unique_classes = sorted(list(set(y_train.unique()) | set(y_test.unique())))
num_classes = len(unique_classes)

if num_classes == 3:
    target_names = ["Legitimate", "Suspicious", "Phishing"]
elif num_classes == 2:
    target_names = ["Legitimate", "Phishing"]
else:
    target_names = [f"Class {c}" for c in unique_classes]

print("Step 2: Vectorizing text with TF-IDF...")
vectorizer = TfidfVectorizer(max_features=10000)
X_train = vectorizer.fit_transform(train_df['body'])
X_test = vectorizer.transform(test_df['body'])

print("Step 3: Training Calibrated Linear SVM...")
base_model = LinearSVC(max_iter=2000, dual=False)
model = CalibratedClassifierCV(base_model, cv=5)
model.fit(X_train, y_train)

print("Step 4: Evaluating model...")
y_pred = model.predict(X_test)
y_prob = model.predict_proba(X_test)

phish_idx = target_names.index("Phishing") if "Phishing" in target_names else -1
legit_idx = target_names.index("Legitimate") if "Legitimate" in target_names else 0

phish_val = unique_classes[phish_idx]
legit_val = unique_classes[legit_idx]
phish_probs = y_prob[:, phish_idx]

if num_classes == 2:
    auc_score = roc_auc_score(y_test, phish_probs)
else:
    auc_score = roc_auc_score(y_test, y_prob, multi_class='ovr')

tpr_1pct = compute_tpr_at_fpr(y_test.values, phish_probs, 0.01, phish_val, legit_val)
tpr_01pct = compute_tpr_at_fpr(y_test.values, phish_probs, 0.001, phish_val, legit_val)

print("\n--- BASELINE 2 RESULTS ---")
print(classification_report(y_test, y_pred, target_names=target_names))
print(f"ROC-AUC:        {auc_score:.4f}")
print(f"TPR @ 1% FPR:   {tpr_1pct:.4f}")
print(f"TPR @ 0.1% FPR: {tpr_01pct:.4f}")
print("--------------------------")

print("Step 5: Saving results to baseline_2_results.csv...")
report_dict = classification_report(y_test, y_pred, target_names=target_names, output_dict=True)
phishing_key = target_names[phish_idx]

my_metrics = {
    "Model": "Baseline 2 (TF-IDF + SVM)",
    "F1_Score_Phishing": report_dict[phishing_key]["f1-score"],
    "Precision_Phishing": report_dict[phishing_key]["precision"],
    "Recall_Phishing": report_dict[phishing_key]["recall"],
    "ROC_AUC": auc_score,
    "TPR@1%_FPR": tpr_1pct,
    "TPR@0.1%_FPR": tpr_01pct
}

pd.DataFrame([my_metrics]).to_csv("baseline_2_results.csv", index=False)
print("Complete.")