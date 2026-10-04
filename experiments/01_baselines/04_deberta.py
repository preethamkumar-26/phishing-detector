import pandas as pd
import numpy as np
import os
from sklearn.metrics import classification_report, roc_auc_score
from scipy.special import softmax

# Import deep learning libraries
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from datasets import Dataset

print("Step 1: Loading the data...")
train_df = pd.read_parquet(os.path.join("..", "..", "data", "train.parquet"))
test_df = pd.read_parquet(os.path.join("..", "..", "data", "test_random.parquet"))

train_df['body'] = train_df['body'].fillna('')
test_df['body'] = test_df['body'].fillna('')

# Hugging Face strictly requires the target column to be named 'labels'
train_df = train_df.rename(columns={'label': 'labels'})
test_df = test_df.rename(columns={'label': 'labels'})

unique_classes = sorted(list(set(train_df['labels'].unique()) | set(test_df['labels'].unique())))
num_classes = len(unique_classes)

if num_classes == 3:
    target_names = ["Legitimate", "Suspicious", "Phishing"]
elif num_classes == 2:
    target_names = ["Legitimate", "Phishing"]
else:
    target_names = [f"Class {c}" for c in unique_classes]

print(f"Detected {num_classes} unique classes.")

print("\n--- ⚠️ CPU SAFETY WARNING ⚠️ ---")
print("DeBERTa is a massive Deep Learning model. Training it fully on a laptop CPU can take DAYS.")
print("For this local test, we are slicing the data to a small sample so it finishes in a few minutes.")
print("----------------------------------\n")

# Limit data for local CPU testing so your laptop doesn't freeze
train_df = train_df.head(500)
test_df = test_df.head(200)

print("Step 2: Preparing Hugging Face Datasets...")
train_dataset = Dataset.from_pandas(train_df[['body', 'labels']])
test_dataset = Dataset.from_pandas(test_df[['body', 'labels']])

print("Step 3: Downloading & Loading DeBERTa Tokenizer...")
model_name = "microsoft/deberta-v3-base"
# FIX: use_fast=False forces the correct SentencePiece loader and bypasses the TikToken error
tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=False)

def tokenize_function(examples):
    # We cut the email length to 128 tokens to make it run faster locally
    return tokenizer(examples["body"], padding="max_length", truncation=True, max_length=128)

train_tokenized = train_dataset.map(tokenize_function, batched=True)
test_tokenized = test_dataset.map(tokenize_function, batched=True)

print("Step 4: Downloading & Loading DeBERTa Model...")
# This downloads the actual AI model weights (around 500MB)
model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=num_classes)

print("Step 5: Training the model (this will take a few minutes)...")
training_args = TrainingArguments(
    output_dir="./deberta_results",
    num_train_epochs=1,          # Only 1 pass over the data for speed
    per_device_train_batch_size=4, # Small batch size for laptop RAM
    per_device_eval_batch_size=4,
    logging_steps=10,
    save_strategy="no",          # Don't save heavy checkpoints locally
    report_to="none"             # Turn off extra logging
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_tokenized,
    eval_dataset=test_tokenized,
)

trainer.train()

print("Step 6: Evaluating the model...")
predictions = trainer.predict(test_tokenized)

# Convert raw model outputs to percentages/probabilities
y_prob = softmax(predictions.predictions, axis=1)
# Get the predicted class (0, 1, or 2)
y_pred = np.argmax(y_prob, axis=1)
y_test = test_df['labels'].values

print("\n--- BASELINE 4 RESULTS ---")
# zero_division=0 prevents crashes if the tiny dataset fails to predict one class
print(classification_report(y_test, y_pred, target_names=target_names, zero_division=0))

# Handle multiclass vs binary ROC-AUC evaluation
if num_classes == 2:
    auc_score = roc_auc_score(y_test, y_prob[:, 1])
else:
    auc_score = roc_auc_score(y_test, y_prob, multi_class='ovr')

print(f"ROC-AUC Score: {auc_score:.4f}")
print("--------------------------")

print("Step 7: Saving the results to a CSV file...")
report_dict = classification_report(y_test, y_pred, target_names=target_names, output_dict=True, zero_division=0)

phishing_key = "Phishing" if "Phishing" in report_dict else target_names[-1]

my_metrics = {
    "Model": "Baseline 4 (DeBERTa - CPU Sample)",
    "F1_Score_Phishing": report_dict[phishing_key]["f1-score"],
    "Precision_Phishing": report_dict[phishing_key]["precision"],
    "Recall_Phishing": report_dict[phishing_key]["recall"],
    "ROC_AUC": auc_score
}

results_df = pd.DataFrame([my_metrics])
results_df.to_csv("baseline_4_results.csv", index=False)

print("Success! Baseline 4 results are saved in 'baseline_4_results.csv'.")