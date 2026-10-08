# Phishing Email Detection Using AI/ML

> **A research project exploring reliable, explainable, and generalizable phishing-email detection using modern machine-learning and deep-learning methods.**
>
> The project is currently at a **mid-research / progress-review milestone**: the literature foundation and comparative analysis are complete, while the reproducible data pipeline, model experiments, robustness evaluation, and deployment measurements are being prepared for the next phase.

## Project at a Glance

| Area | Current status |
|---|---|
| Research foundation | Base paper reviewed and critically assessed |
| Literature comparison | Four phishing-email detection studies compared |
| Dataset strategy | Multiple public datasets identified for cross-dataset evaluation |
| Feature strategy | Text, metadata, URL, and sender-reputation features identified |
| Modeling direction | Transformer, hybrid neural, classical ML, and retrieval-based approaches under consideration |
| Reproducibility | Explicit splits, seeds, preprocessing, ablations, and repeated trials planned |
| Deployment analysis | Latency, memory, model size, and inference cost still to be measured |

---

## 1. The Problem and Motivation

Phishing emails are designed to trick people into revealing credentials, opening malicious attachments, transferring money, or visiting dangerous websites. Their wording and presentation change quickly, which makes detection a moving target.

Traditional filters based mainly on fixed rules, signatures, blocklists, or keyword matching can be useful, but they often struggle with:

- newly registered or previously unseen domains;
- carefully written social-engineering messages;
- obfuscated words, URLs, and HTML;
- legitimate-looking business language;
- multilingual or AI-generated phishing content; and
- changes in sender, campaign, and formatting patterns.

This project investigates whether AI/ML models can combine **language understanding**, **email structure**, **URL signals**, and **sender or metadata information** to produce more reliable predictions than text-only or rule-based systems.

The goal is not simply to maximize accuracy on one familiar dataset. A useful detector should also generalize to new datasets, minimize harmful false positives, provide understandable explanations, and remain practical to run.

---

## 2. Current Progress

### 2.1 Problem formulation and literature review

The project began with the paper *Improving phishing email detection performance through deep learning with adaptive optimization* as its technical foundation. That work proposes a hybrid architecture combining:

- **BERT** for contextual language representations;
- **Multi-Head Attention** for feature relationships;
- a **1D CNN** for local phrase and n-gram patterns;
- a **Bidirectional GRU** for sequential modeling; and
- the **Mountain Gazelle Optimizer (MGO)** for hyperparameter tuning.

Our review treats this model as a starting point rather than an unquestioned benchmark. Important concerns identified include incomplete reporting of data splits and training details, inconsistent metrics, reliance on a single dataset, unclear sequence handling after pooled BERT representations, and the absence of cross-dataset, adversarial, explainability, and deployment evaluations.

We also compared four research directions:

| Study | Main direction | Key lesson |
|---|---|---|
| **P1: BERT-CNN-GRU-MGO** | Hybrid deep-learning detector with metaheuristic tuning | Strong same-dataset results, but reproducibility and generalization require closer examination |
| **P2: E-PhishGEN / E-PhishLLM** | Multi-dataset evaluation and LLM-generated phishing emails | Very high scores on familiar datasets can fall sharply under cross-dataset or generated-email testing |
| **P3: Hybrid CNN-LSTM** | Text, metadata, URL, and sender-reputation features | Multi-feature models are promising, but feature leakage and source confounding must be controlled |
| **P4: DPR vector search** | Transformer embeddings plus similarity search | Retrieval-based detection is an interesting alternative, but the available evidence is incomplete |

The most important research direction emerging from this comparison is **robust evaluation**: one dataset and one random split are not enough to establish real-world performance.

### 2.2 Data pipeline

The research plan covers the following data sources and input types:

- **Kaggle Phishing Emails** dataset used by the base paper: approximately 18,650 labeled emails;
- **Enron** legitimate-email data;
- **Nazario** phishing-email data;
- additional benchmark variants discussed in the literature, including CEAS, LingSpam, SpamAssassin, TREC, and Chataut;
- subject and body text;
- email headers and identity-related metadata;
- URLs and URL structure; and
- sender-reputation or domain-related signals where available.

The intended preprocessing workflow includes:

1. parsing raw email files and separating headers, subject, body, HTML, and URLs;
2. removing or flagging empty, malformed, and duplicate records;
3. normalizing text while preserving security-relevant indicators;
4. extracting URL, metadata, and sender features;
5. applying stratified train/validation/test splits without leakage; and
6. recording the random seed, sequence length, feature schema, and preprocessing configuration.

**Implementation note:** the current repository materials document the research foundation and experimental plan. A complete, verified parser and training pipeline is a next-phase deliverable rather than being claimed as finished here.

### 2.3 Exploratory analysis and feature direction

The literature review identified four complementary feature groups:

| Feature group | Examples | Why it matters |
|---|---|---|
| **Text** | Subject, body, urgency, requests for credentials or payment | Captures semantic and linguistic intent |
| **Metadata** | Sender, reply-to mismatch, timestamps, header fields | Reveals identity and delivery anomalies |
| **URLs** | Number of links, length, suspicious domains, redirects, IP-based URLs | Captures destination and obfuscation signals |
| **Sender / reputation** | Domain age or reputation, blacklist-related signals | Adds context beyond the email wording |

The base paper primarily motivates a **text-based BERT pipeline**, while the broader comparison suggests that text-only models should be evaluated against carefully designed multi-feature alternatives.

### 2.4 Baseline and model experiments

The current research plan covers several model families:

- **Classical ML:** Logistic Regression, Naive Bayes, Random Forest, SVM, Gradient Boosting, MLP, and KNN;
- **Transformer models:** BERT or DistilBERT-based classifiers;
- **Hybrid neural models:** CNN-LSTM and BERT-Attention-CNN-BiGRU variants;
- **Retrieval-based models:** DPR-style embeddings with cosine similarity and vector search; and
- **LLM robustness tests:** evaluation on synthetic or LLM-generated phishing samples where ethically and legally appropriate.

The base paper reports approximately **97.22% accuracy** and **96.43% F1-score** for its proposed model, but those figures should be interpreted cautiously because the paper reports inconsistent values and does not clearly establish cross-dataset generalization.

For our experiments, the priority is to report more than a single headline number:

- precision, recall, F1-score, and ROC-AUC;
- confusion matrices and false-positive rates;
- repeated-run mean and standard deviation;
- cross-dataset and temporal performance;
- calibration and threshold behavior; and
- latency, memory, and model-size measurements.

---

## 3. Technical Architecture and Workflow

The planned end-to-end workflow is:

```text
Raw Email
   │
   ├── Headers, sender, reply-to, timestamps
   ├── Subject and body text
   ├── HTML and attachments
   └── URLs and domains
   │
   ▼
Parsing and Normalization
   │
   ├── Clean and tokenize text
   ├── Extract URLs and metadata
   ├── Detect duplicates and malformed records
   └── Apply leakage-safe train/validation/test split
   │
   ▼
Feature Representations
   │
   ├── Transformer embeddings for text
   ├── TF-IDF and classical text features
   ├── URL and metadata features
   └── Sender/reputation features when available
   │
   ▼
Model Layer
   │
   ├── Classical ML baselines
   ├── BERT / DistilBERT classifier
   ├── CNN-LSTM or BERT-Attention-CNN-BiGRU
   └── Optional embedding-based similarity search
   │
   ▼
Evaluation and Analysis
   │
   ├── Phishing probability and decision threshold
   ├── Precision, recall, F1, ROC-AUC, calibration
   ├── Cross-dataset and adversarial testing
   └── Explainability and deployment measurements
   │
   ▼
Final Output: Safe / Phishing + Confidence + Explanation
```

A simplified deep-learning path is:

```text
Email text → Tokenizer → Transformer embeddings
           → Attention / CNN / BiGRU layers
           → Dense classifier → Phishing probability
```

The architecture will be finalized only after controlled ablation experiments establish whether each component provides a measurable benefit.

---

## 4. Tech Stack and Environment

### Planned software stack

- **Language:** Python 3
- **Data processing:** Pandas, NumPy, SciPy
- **Email parsing:** Python email utilities and MIME/HTML parsing tools
- **Classical ML:** Scikit-learn
- **Deep learning:** PyTorch and/or TensorFlow/Keras
- **NLP:** Hugging Face Transformers and Tokenizers
- **Visualization:** Matplotlib, Seaborn, and experiment dashboards as needed
- **Explainability:** SHAP, attention analysis, or comparable attribution methods
- **Vector search:** FAISS or another vector database for retrieval experiments
- **Experiment management:** configuration files, fixed random seeds, saved metrics, and versioned preprocessing

### Compute assumptions

The base paper reports experiments using a **T4 GPU and 32 GB RAM**, while another reviewed study reports V100-based training. Our implementation should record the actual hardware, training duration, batch size, parameter count, and inference latency rather than assuming that a model is deployment-ready.

Large datasets, model checkpoints, and local virtual environments are excluded through `.gitignore` to keep the repository lightweight.

---

## 5. Reproducibility and Evaluation Principles

The project will follow these principles before making final performance claims:

- use fixed, stratified, leakage-safe splits;
- detect exact and near-duplicate emails before splitting;
- publish preprocessing assumptions and feature definitions;
- use the same evaluation budget across comparable models;
- repeat experiments across multiple random seeds;
- separate development data from final held-out evaluation data;
- test across datasets, domains, and time periods where possible;
- report both false positives and false negatives;
- isolate the contribution of architecture components and MGO-style tuning; and
- document compute cost, inference speed, memory, and model size.

This is especially important because the literature shows that models can achieve near-perfect scores on familiar data while performing poorly on shifted or newly generated phishing emails.

---

## 6. Next Steps and Research Roadmap

### Immediate priorities

- [ ] Build and validate the raw-email parser.
- [ ] Define a common schema for headers, body text, HTML, URLs, labels, and metadata.
- [ ] Collect the selected public datasets and document their licensing and provenance.
- [ ] Remove duplicates and investigate possible dataset or source leakage.
- [ ] Create fixed, stratified splits with recorded random seeds.
- [ ] Add exploratory statistics for class balance, message length, URLs, domains, and missing values.

### Baseline experiments

- [ ] Train TF-IDF baselines using Logistic Regression, Naive Bayes, Random Forest, and SVM.
- [ ] Establish a text-only neural baseline.
- [ ] Train a BERT or DistilBERT classifier with a clearly documented sequence length and fine-tuning policy.
- [ ] Evaluate metadata, URL, and sender features independently and in combination.
- [ ] Record precision, recall, F1-score, ROC-AUC, PR-AUC, calibration, and confusion matrices.

### Advanced modeling

- [ ] Reproduce the BERT-Attention-CNN-BiGRU direction under a controlled protocol.
- [ ] Compare pooled transformer outputs with token-level representations.
- [ ] Compare CNN-LSTM and transformer-based architectures using the same data splits.
- [ ] Perform component ablations for attention, CNN, GRU/LSTM, metadata, URLs, and regularization.
- [ ] Compare manual or Bayesian tuning with MGO-style optimization under a fixed compute budget.

### Robustness and generalization

- [ ] Run cross-dataset evaluation using Enron, Nazario, and additional public corpora.
- [ ] Add temporal or out-of-distribution evaluation where data availability permits.
- [ ] Test misspellings, character substitutions, HTML manipulation, URL obfuscation, paraphrasing, and urgency changes.
- [ ] Evaluate selected models on human-written and responsibly generated phishing examples.
- [ ] Measure threshold trade-offs for security-sensitive and false-positive-sensitive operating points.

### Explainability and deployment

- [ ] Produce explanations for text, URL, and metadata contributions.
- [ ] Inspect failure cases and manually categorize common errors.
- [ ] Measure parameter count, model size, memory use, throughput, and latency per email.
- [ ] Evaluate quantization or pruning only after establishing an accurate reference model.
- [ ] Package a reproducible inference script or API prototype.

### Final research outputs

- [ ] Consolidate results across repeated trials.
- [ ] Prepare tables, plots, ablation results, and statistical comparisons.
- [ ] Write the final methodology and limitations sections.
- [ ] Document ethical, privacy, and dual-use considerations.
- [ ] Complete the final publication or progress-review draft.

---

## 7. Research Position

This project is not intended to claim that one hybrid architecture automatically solves phishing detection. Instead, it aims to answer a more useful question:

> **Which combination of language, email-structure, URL, and sender signals remains reliable when the data, campaign, writing style, and attack strategy change?**

The reviewed literature provides strong ideas, but it also shows why careful validation matters. Our contribution will be a transparent, reproducible comparison that emphasizes generalization, robustness, explainability, and practical deployment—not only performance on a single benchmark.

## License and Data Notice

Dataset licenses, redistribution terms, and privacy requirements must be checked before sharing raw email content or derived artifacts. This repository should store code, documentation, configurations, and aggregated results rather than private or sensitive email data.
