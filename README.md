# Research Paper Analysis: Phishing Email Detection with BERT-CNN-GRU + Mountain Gazelle Optimizer

**Paper:** *Improving phishing email detection performance through deep learning with adaptive optimization* (Scientific Reports, 2025, 15:36724)
**Proposed model name:** **BCG-MHeadAttention-MGO** (BERT + CNN + GRU + Multi-Head Attention, tuned by MGO)

Items marked *(inference)* are my own deductions and are not stated in the paper.

---

## 1. Dataset Breakdown

### Dataset name and source
- **Name:** Phishing Emails dataset (Kaggle, `subhajournal/phishingemails`).
- **Source:** Public Kaggle repository, a single dataset.
- **Labels:** Binary, **"phishing"** vs **"safe"**. In the confusion matrix, 0 = safe (negative) and 1 = phishing (positive).

### Size and class distribution

| Property | Value |
|---|---|
| Total samples | **18,650** |
| Safe emails | ~**61%** |
| Phishing emails | ~**39%** |
| Preprocessing removal | Emails with an **empty body** are dropped |
| Test set (inferred) | **593 emails** (346 + 14 + 3 + 230), about 3.2% of the data *(inference)* |
| Test class mix (inferred) | 360 safe / 233 phishing, about 60.7% / 39.3%, consistent with the 61/39 split *(inference)* |

### Features and attributes
- The paper says the data contains "textual content, features related to sender addresses, and extra metadata regarding the email structure." The sentence is grammatically broken and **no column list is given**.
- **What the model actually uses:** Fig. 2 shows only **"Email Text"** as input, so the pipeline is **text-only**. Sender and metadata fields are not shown being used.
- **Role of the columns:**
  - **Email text:** tokenized by the BERT tokenizer and fed to the pipeline for training and inference.
  - **Label (phishing/safe):** the supervision target for binary cross-entropy and for all evaluation metrics.
  - **Sender and metadata features:** mentioned but not used in any described stage.
- **Not reported:** train/validation/test split ratio, random seed, stratification, max sequence length, and any duplicate handling.

---

## 2. Models & Algorithms

### A. Proposed architecture components

| Component | Role |
|---|---|
| **BERT** (768-dim, pooled output) | Contextual embeddings. Bidirectional transformer, pre-trained with masked LM and next-sentence prediction |
| **Batch Normalization** | Stabilizes activations after reshaping |
| **Multi-Head Attention** | Captures relationships between distant tokens in parallel subspaces |
| **1D CNN** | Extracts local n-gram and short-phrase patterns, followed by pooling |
| **Bidirectional GRU** | Models sequential dependencies in both directions |
| **Dropout → Dense (FC) → Sigmoid** | Regularization, projection, and binary probability output |
| **Mountain Gazelle Optimizer (MGO)** | Metaheuristic hyperparameter tuner |

### B. Metaheuristic competitors (replacing MGO in the same pipeline)
**GWO, WOA, SSA, AVOA, GA, PSO, PUMA**, all run with **population = 10 and iterations = 50**.

### C. Deep-learning baselines
**CNN, LSTM, BLSTM, GRU, CLSTM, RCNN, ServeNet, CARL-Net.** Their parameters were set "to the values reported in their respective base works."

### D. Embedding variants (ablation)
**GloVe** at dim 50, 100, 200, 300, versus **BERT** at dim 768.

### Implementation and usage details
- **Loss:** binary cross-entropy. **Metric:** binary accuracy.
- **Tuned hyperparameters (via MGO):** **GRU units, dropout rate, learning rate.**
- **MGO fitness:** minimize **validation loss**.
- **Training length:** about **10 epochs** shown in Fig. 3.
- **Software and hardware:** Python 3.8, TensorFlow 2.8, Keras, NumPy, Pandas on Google Colab Pro (Tesla T4, 32 GB RAM).
- **Not specified:** optimizer type, batch size, hyperparameter search ranges, final selected values, CNN filter counts and kernel sizes, number of attention heads, and whether BERT is frozen or fine-tuned. The text says fine-tuning helps, but the contributions say MGO tunes "the BERT model."

---

## 3. Methodology & System Architecture

### Core approach
Combine **contextual embeddings (BERT)**, **attention**, **local feature extraction (CNN)**, and **sequence modeling (BiGRU)** into one classifier. Then automate hyperparameter selection with **MGO** instead of manual tuning.

### System architecture (two nested loops, per Fig. 2)
- **Outer loop (MGO):** generate a hyperparameter set, train and evaluate the network, update the population, and repeat until the final iteration. At the end it selects the best hyperparameters found across all iterations.
- **Inner model:** Email Text → BERT → Multi-Head Attention → CNN → GRU → FC → Sigmoid → Phishing/Safe.

### Stage-by-stage pipeline

1. **Data ingestion and cleaning:** load the 18,650 Kaggle emails and remove empty-body rows.
2. **Tokenization:** the BERT tokenizer converts raw text into token sequences.
3. **Contextual embedding:** the pre-trained BERT produces a **pooled output**, a condensed 768-dim representation of the whole sequence.
   - Input representation (Eq. 1): `Input = TokenEmbedding + SegmentEmbedding + PositionEmbedding`
   - Self-attention (Eq. 2): `Attention(Q,K,V) = softmax(QKᵀ / √d_k) · V`
4. **Reshape + Batch Normalization:** the output is reshaped for the convolutional layers and normalized.
5. **Multi-head attention (Eq. 7):** the same scaled dot-product formula is applied per head, with linear projections of Q, K, V. Head outputs are concatenated and linearly transformed.
6. **1D CNN (Eq. 3):** `f(x) = σ(Σᵢ wᵢ·xᵢ + b)`, with ReLU activation and max pooling.
7. **Bidirectional GRU (Eqs. 4–6):**
   - Update gate: `z_t = σ(W_z x_t + U_z h_{t−1} + b_z)`
   - Reset gate: `r_t = σ(W_r x_t + U_r h_{t−1} + b_r)`
   - Hidden state: `h_t = (1−z_t)⊙h_{t−1} + z_t⊙tanh(W_h x_t + U_h(r_t⊙h_{t−1}) + b_h)`
8. **Dropout:** applied to the GRU output.
9. **Dense layers:** map features to the output space.
10. **Sigmoid classification:** outputs a phishing probability, trained with binary cross-entropy.
11. **Evaluation:** Accuracy, Precision, Recall and F1 (Eqs. 16–19), plus p-value significance tables.

### MGO mechanics (four behaviors)

| Strategy | Equation | Meaning |
|---|---|---|
| **Solitary territorial males** | `TSM = male_gazelle − \|(r_i1·BH − r_i2·X(t))·F\| · Cof_r` (Eq. 8) | Exploits around the best solution |
| **Maternity herds** | `MH = (NH + Cof_{1,r}) + (r_i3·male − r_i4·X_rand)·Cof_{1,r}` (Eq. 12) | Strengthens candidates using the best and a random solution |
| **Bachelor male herds** | `BMH = (X(t) − D) + (r_i5·male − r_i6·BH)·Cof_r`, with `D = (\|X(t)\|+\|male\|)(2r₆−1)` (Eqs. 13–14) | Competitive local search |
| **Migration for food** | `MSF = (ub − lb)·r₇ + lb` (Eq. 15) | Random global exploration across the bounds |

- **Supporting terms:** `F = N₁(D)·exp(2 − iter·(2/Maxiter))` (Eq. 9). `Cof_i` has four cases (Eq. 10). `a = −1 + Iter·(−1/Maxiter)` (Eq. 11).
- **Role:** MGO balances **exploration vs. exploitation** while searching the hyperparameter space.

---

## 4. Gaps Addressed & Solved

| Gap in prior work | How this paper addresses it |
|---|---|
| Rule, signature, and blocklist detectors miss evolving, disguised phishing | Uses learned **contextual language representations** (BERT) |
| Older NLP features (TF-IDF, n-grams, word embeddings) lack deep context | Uses **BERT** (768-dim), which beats **GloVe** (50–300 dim) in Table 2: accuracy 0.9722 vs 0.9612 |
| Single-mechanism models (CNN-only or LSTM-only) capture limited patterns | **Hybrid** of attention + CNN (local) + BiGRU (sequential) |
| Manual hyperparameter tuning is slow and suboptimal | **MGO automates** tuning of GRU units, dropout, and learning rate |
| Metaheuristic choice is unjustified | Benchmarks 8 optimizers with statistical tests (Tables 4–8) |
| Overfitting concerns | **Ablation** (Table 3) shows L2 + dropout help: accuracy 0.9722 with both vs 0.9595 without dropout |

**Gaps named in the literature review but *not* actually solved:**
- Failure on **new or unseen phishing tactics**.
- **AI/LLM-generated phishing** (GPT-4o-style emails).
- **Human overconfidence**.
- **Explainability**, which is listed as future work.

---

## 5. Paper Limitations

### Reporting inconsistencies
- **Abstract vs. results:** the abstract and conclusion give *accuracy 96.8%, precision 97.2%, recall 95.4%, F1 96.3%*. Tables 2–4 and 9 and the confusion matrix give **accuracy 0.9722, precision 0.9426, recall 0.9871, F1 0.9643**. The conclusion's "97.2% precision, 95.4% recall" does not match any table.
- **Accuracy recompute:** from the confusion matrix, (346+230)/593 = **0.9713**, not 0.9722. Precision (230/244 = 0.9426), recall (230/233 = 0.9871), and F1 match.
- **Narrative vs. table:** the text says accuracy "exceeding 0.975" and precision and F1 "above 0.95." Table 9 shows precision **0.9426**.
- **Loss:** the text says loss at epoch 9 is "less than 0.6," but Fig. 3 shows about 0.7.
- **Training accuracy:** the text says it rises to "over 92%," but the figure shows about 94%.
- **Misreferences:** "Table 8" is cited where Table 9 is meant. CARL-Net and ServeNet are said to have an "almost perfect recall of 0.9871," which is MGO's value.
- **Repeated values:** identical metrics appear across unrelated tables. PSO accuracy equals GloVe-50 (0.9477), AVOA equals GloVe-100 (0.9510), and PUMA equals GloVe-200 (0.9544). LSTM and CLSTM share identical accuracy and precision. This may be coincidence, but it warrants verification.

### Methodological limitations
- **Single dataset**, although the text refers to "different datasets." There is no cross-dataset or out-of-distribution test.
- **Small, unspecified test set** (about 593 emails *(inference)*). There is no k-fold CV, no repeated runs, no confidence intervals, and no seeds.
- **Unnamed statistical test.** The p-values (1e-9 to 1e-25) are extremely small, with no explanation of how the samples were obtained.
- **Questionable "state-of-the-art" claim:**
  - Baselines are generic or web-service models. ServeNet and CARL-Net are web-service classifiers.
  - The paper's own cited works report higher figures (THEMIS 99.848% accuracy, HELPHED F1 0.9942) but are not compared experimentally.
- **Unfair baseline design:** baselines lack BERT and attention, so the gains mix **architecture, embeddings, and tuning**. There is no ablation of BERT+attention+CNN+GRU **without MGO**, so MGO's isolated contribution is unproven. Baselines use fixed literature settings, while the proposed model gets 10×50 optimization.
- **Architectural concern *(inference)*:** BERT's *pooled* output is a single vector. Reshaping it for attention, CNN and GRU means these layers may not process a true token-level sequence, which weakens the stated justification for sequence modeling.
- **Unsupported claims:**
  - "Reduces false positives by 2.5%" has no supporting computation.
  - "Fast convergence" conflicts with loss still decreasing at epoch 10.
  - "Real-time deployment" has no latency test.
  - "Perfect generalization" is overstated.
- **Error profile:** 14 false positives out of 360 safe emails is a **3.9% false-positive rate** (blocking legitimate mail), versus 3 false negatives (1.3%). The paper calls this balanced.
- **Text-only input:** no headers, URLs, attachments, or sender reputation.
- **No robustness testing:** no adversarial, obfuscated, or LLM-generated phishing.
- **No explainability analysis** and **no class-imbalance handling** (the 61/39 split is only mild).
- **Reproducibility:** no code availability statement, no hyperparameter ranges, no final tuned values, and no train/val/test split.
- **Possible data leakage:** duplicate handling is not discussed (a general risk with Kaggle email corpora).

---

## 6. Resource Gap Analysis

| Resource area | Reported / implied | Gap |
|---|---|---|
| **Hardware** | Colab Pro, Tesla T4 GPU, 32 GB RAM | Modest, but long tuning runs are likely |
| **Model size** | BERT with 768-dim output (BERT-base class *(inference)*, about 110M parameters) | **No parameter count, memory, or model size reported** |
| **Optimization cost** | MGO with population 10 × 50 iterations ≈ up to **~500 full train/validate cycles** *(inference)*, repeated for 8 optimizers | **No training time or GPU-hours reported** |
| **Inference latency** | Claimed "suitable for real-time deployment" | **No latency or throughput measurement** |
| **Edge deployment** | Listed as future work (compressed models) | Current model is likely too heavy for edge devices *(inference)* |
| **Data access** | Public Kaggle data | Easy to obtain, but code and split files are not provided |
| **Labeled data dependence** | Fully supervised | Authors flag this and propose few-shot and unsupervised domain adaptation as future work |
| **Deployment bottlenecks** | Not discussed | Model drift, retraining cost when tactics evolve, and re-running MGO per new dataset |

The key resource gap is the **missing compute and latency accounting**. The accuracy gains are reported without any cost-benefit evidence against lighter baselines.

---

## 7. Comprehensive Author Contribution Summary

### End-to-end walkthrough

1. **Problem framing:** phishing is increasingly sophisticated, and rule-based or single-model detectors struggle.
2. **Literature survey:** reviewed 12 works (Table 1) spanning NLP/ML surveys, human overconfidence, XAI platforms, undersampling ensembles, curated datasets, LLM-generated phishing, RCNN+attention (THEMIS), persuasion cues, and hybrid ensembles (HELPHED).
3. **Design:** proposed **BERT → Multi-Head Attention → 1D CNN → BiGRU → Dense → Sigmoid**, with **MGO** tuning GRU units, dropout, and learning rate against validation loss.
4. **Implementation:** TensorFlow/Keras on Colab Pro (T4), trained with binary cross-entropy for about 10 epochs on the Kaggle dataset (18,650 emails).
5. **Evaluation:**
   - **Convergence (Fig. 3):** loss falls from about 1.9 to about 0.7, and validation accuracy stays at about 95–97%.
   - **Confusion matrix (Fig. 4):** TN 346, FP 14, FN 3, TP 230.
   - **Embeddings (Table 2):** BERT-768 (F1 0.9643) beats GloVe-300 (F1 0.9450).
   - **Regularization ablation (Table 3):** L2 plus dropout is best.
   - **Metaheuristics (Table 4, Fig. 5):** MGO beats GWO, WOA, SSA, AVOA, GA, PSO, and PUMA. Accuracy 0.9722 vs PUMA 0.9544.
   - **Significance tests (Tables 5–8):** MGO's advantage is significant on all four metrics.
   - **Deep-learning baselines (Table 9, Fig. 6):** the proposed model beats CNN, LSTM, BLSTM, GRU, CLSTM, RCNN, ServeNet, and CARL-Net. The best baseline, CARL-Net, reaches accuracy 0.9376 and F1 0.9199.
6. **Conclusions:**
   - The hybrid architecture plus adaptive optimization yields robust detection.
   - The authors claim fast convergence, good generalization, and real-time suitability.
   - **Future work:** few-shot learning, unsupervised domain adaptation, explainability, and compressed edge models.

### Net assessment
- The paper's **real contribution** is an engineering integration of BERT, attention, CNN and GRU with MGO tuning, showing consistent gains over the authors' own baselines on one dataset.
- The **main weaknesses** are the numeric inconsistencies, the single dataset, the lack of repeated runs, the missing cost and latency data, and unsupported SOTA and real-time claims.
