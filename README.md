# Base Paper Review and Research Foundation

## Phishing Email Detection Using BERT, CNN, GRU, Multi-Head Attention, and MGO

This document records the reference paper selected as the foundation for our research on phishing-email detection. It summarizes the paper's methodology, experimental results, contributions, and limitations, and explains how its findings informed the direction of our proposed work.

> **Important:** The paper discussed below is the **base paper** for our research. The observations in this document are based on our reading and analysis of the paper. Statements marked **(inference)** are interpretations made from the paper's figures, tables, or descriptions and are not explicitly stated by the authors.

---

## 1. Base Paper Identification

**Title:** *Improving phishing email detection performance through deep learning with adaptive optimization*  
**Journal:** *Scientific Reports*  
**Publication year:** 2025  
**Article:** 15:36724  
**Reference model name used in this review:** **BCG-MHeadAttention-MGO**

The base paper proposes a hybrid deep-learning model that combines:

- BERT for contextual language representation;
- Multi-Head Attention for learning relationships between features;
- a one-dimensional CNN for local phrase and n-gram extraction;
- a Bidirectional GRU for sequential modelling; and
- the Mountain Gazelle Optimizer (MGO) for hyperparameter tuning.

The paper is relevant to our research because it demonstrates how transformer-based embeddings can be combined with convolutional and recurrent layers for phishing-email classification. It also provides a useful starting point for identifying limitations that can be addressed in a more reproducible and robust system.

---

## 2. Why This Paper Was Selected as the Base Paper

We selected this paper as the foundation for our research for the following reasons:

1. **It addresses a current cybersecurity problem.** Phishing emails continue to evolve and often evade traditional rule-based, signature-based, and blocklist-based detectors.
2. **It uses contextual language modelling.** BERT can capture the meaning and context of email text more effectively than traditional TF-IDF, n-gram, or static-word-embedding approaches.
3. **It combines complementary neural architectures.** CNN, attention, and GRU layers are intended to capture local patterns, long-range relationships, and sequential dependencies respectively.
4. **It investigates automated optimization.** MGO is used to tune selected model hyperparameters instead of relying only on manual experimentation.
5. **It provides multiple comparison points.** The authors compare BERT with GloVe, MGO with other metaheuristic optimizers, and the proposed model with several deep-learning baselines.
6. **It exposes meaningful research opportunities.** The paper does not fully address cross-dataset generalization, adversarial or obfuscated emails, explainability, computational cost, or reproducibility. These limitations helped shape our research motivation.

Our work therefore treats the paper as a **technical starting point and critical reference**, rather than accepting all of its claims without verification.

---

## 3. Dataset and Input Analysis

### 3.1 Dataset

The base paper uses the public Kaggle **Phishing Emails** dataset (`subhajournal/phishingemails`). The dataset contains approximately **18,650 email records** and uses binary labels:

- **safe** email; and
- **phishing** email.

The reported class distribution is approximately:

| Property | Reported or inferred value |
|---|---:|
| Total records | 18,650 |
| Safe emails | Approximately 61% |
| Phishing emails | Approximately 39% |
| Empty-body records | Removed during preprocessing |

The paper does not clearly report the exact train, validation, and test split proportions, the random seed, stratification procedure, maximum sequence length, or duplicate-removal procedure.

### 3.2 Input features

The paper mentions textual content, sender-related features, and email metadata. However, the architecture diagram presents **Email Text** as the actual model input. Based on the described pipeline, the implemented system appears to be primarily **text-based**:

- **Email text:** tokenized and processed by BERT;
- **Label:** used as the binary classification target; and
- **Sender and metadata fields:** mentioned in the paper but not clearly incorporated into the described model.

This distinction is important because a text-only system does not directly use potentially useful phishing indicators such as URLs, sender reputation, attachment information, email headers, HTML structure, or authentication results.

### 3.3 Test-set observation

The confusion matrix reports TN = 346, FP = 14, FN = 3, and TP = 230, which gives a total of **593 test examples**. This is approximately 3.2% of the full dataset **(inference)**. The corresponding inferred class counts are 360 safe emails and 233 phishing emails.

Because the paper does not clearly state the split procedure, this test-set interpretation should be treated cautiously.

---

## 4. Base-Paper Architecture

The proposed pipeline can be summarized as:

```text
Email Text
    ↓
BERT tokenizer and BERT representation
    ↓
Batch normalization and reshaping
    ↓
Multi-Head Attention
    ↓
1D CNN and pooling
    ↓
Bidirectional GRU
    ↓
Dropout and fully connected layer
    ↓
Sigmoid output
    ↓
Phishing / Safe
```

### 4.1 BERT

BERT is used to generate contextual representations of email text. Unlike static embeddings, BERT produces representations that depend on the surrounding words and sentence context. The paper describes BERT as a 768-dimensional embedding model **(inference: likely BERT-base)**.

The paper refers to the pooled BERT output. This creates an architectural question: a pooled output is a single vector representing the sequence, whereas CNNs, attention layers, and GRUs generally benefit from token-level sequence representations. If the pooled vector is reshaped before being passed to sequence-oriented layers, those layers may not be operating on a true token sequence **(inference)**.

### 4.2 Multi-Head Attention

Multi-Head Attention is used to learn relationships among different feature subspaces. The general scaled dot-product attention operation is described as:

```text
Attention(Q, K, V) = softmax(QKᵀ / √dₖ)V
```

The paper presents attention as a mechanism for capturing dependencies that may be distant from one another in the email representation.

### 4.3 CNN

The one-dimensional CNN is intended to identify local patterns, short phrases, and n-gram-like features associated with phishing language. Convolution is followed by pooling to reduce the feature representation.

### 4.4 Bidirectional GRU

The Bidirectional GRU is used to model sequential dependencies in both directions. The paper discusses update and reset gates to control how information is retained and updated over time.

### 4.5 Classification layer

The final layers apply dropout for regularization, use dense layers for projection, and produce a phishing probability through a sigmoid activation. Binary cross-entropy is used as the loss function, with binary accuracy as the training metric.

---

## 5. Mountain Gazelle Optimizer

The paper uses the Mountain Gazelle Optimizer to search for model hyperparameters. The parameters reported as being tuned are:

- number of GRU units;
- dropout rate; and
- learning rate.

The MGO fitness function minimizes validation loss. The paper describes four main behaviours:

| MGO behaviour | Intended role |
|---|---|
| Solitary territorial males | Exploitation around the current best solution |
| Maternity herds | Updating candidates using best and random solutions |
| Bachelor male herds | Competitive local search |
| Migration for food | Global exploration across the search bounds |

The competing optimizers are GWO, WOA, SSA, AVOA, GA, PSO, and PUMA. Each is reported with a population size of 10 and 50 iterations.

A major computational implication is that a population of 10 over 50 iterations may require approximately **500 model training and validation cycles for one optimizer** **(inference)**. Repeating this process for multiple optimizers could be expensive, yet the paper does not provide detailed training-time, GPU-hour, or energy measurements.

---

## 6. Experimental Findings Reported by the Base Paper

The paper reports the following main findings:

### 6.1 Embedding comparison

BERT is reported to outperform GloVe embeddings with dimensions 50, 100, 200, and 300. The paper reports approximately:

- BERT accuracy: **0.9722**;
- GloVe-300 accuracy: **0.9612**; and
- BERT F1-score: **0.9643**, compared with approximately **0.9450** for GloVe-300.

This supports the use of contextual embeddings as a foundation for our research.

### 6.2 Regularization ablation

The paper reports that combining L2 regularization with dropout performs better than removing these mechanisms. The reported accuracy with both forms of regularization is approximately 0.9722, compared with approximately 0.9595 without dropout.

### 6.3 Optimizer comparison

MGO is reported to outperform GWO, WOA, SSA, AVOA, GA, PSO, and PUMA. The reported MGO accuracy is approximately 0.9722, while PUMA is reported at approximately 0.9544.

### 6.4 Baseline comparison

The proposed model is compared with CNN, LSTM, BLSTM, GRU, CLSTM, RCNN, ServeNet, and CARL-Net. The paper reports that the proposed hybrid model achieves higher performance than these baselines on the selected dataset.

### 6.5 Confusion matrix

The reported confusion matrix contains:

| | Actual safe | Actual phishing |
|---|---:|---:|
| Predicted safe | TN = 346 | FN = 3 |
| Predicted phishing | FP = 14 | TP = 230 |

This shows that the system identifies most phishing examples, but it also incorrectly classifies 14 legitimate emails as phishing. The false-positive rate among safe emails is approximately **3.9%** **(inference)**, while the false-negative rate among phishing emails is approximately **1.3%** **(inference)**.

For an email-security system, false positives are operationally important because they can block legitimate communication. Therefore, accuracy alone is not sufficient for evaluating the practical usefulness of the detector.

---

## 7. Points Noted During Our Critical Reading

The following observations were recorded while studying the base paper.

### 7.1 Reporting inconsistencies

Several reported values do not appear to be fully consistent:

- The abstract and conclusion report accuracy of approximately 96.8%, whereas several tables report 0.9722.
- Recomputing accuracy from the confusion matrix gives `(346 + 230) / 593 = 0.9713`, not 0.9722.
- The confusion matrix gives precision of approximately 0.9426 and recall of approximately 0.9871, while some narrative statements suggest precision above 0.95.
- Some text refers to tables that appear to be incorrectly numbered.
- Certain metric values appear repeated across unrelated comparison tables.
- The paper describes fast convergence, but the loss curve appears to continue decreasing near the end of the displayed training period.

These issues do not invalidate the overall research direction, but they make the exact performance claims difficult to reproduce.

### 7.2 Incomplete experimental protocol

The following details are not clearly specified:

- train, validation, and test split ratios;
- random seeds and repeated-run procedure;
- duplicate detection and removal;
- BERT sequence length;
- whether BERT is frozen or fine-tuned;
- batch size;
- CNN filter counts and kernel sizes;
- number of attention heads;
- optimizer search ranges;
- final selected hyperparameter values; and
- the precise statistical test used to calculate p-values.

These omissions motivate us to place greater emphasis on reproducibility in our own research.

### 7.3 Generalization limitations

The evaluation uses one public dataset. There is no clearly reported:

- cross-dataset evaluation;
- out-of-distribution testing;
- temporal validation using newer emails;
- adversarial or obfuscation testing; or
- evaluation on AI-generated phishing emails.

Consequently, the reported results demonstrate performance on the selected dataset but do not establish that the model will generalize to all future phishing campaigns.

### 7.4 Baseline fairness

The baseline models do not appear to use the same BERT representation, attention mechanism, and optimization process. Therefore, the performance improvement may result from several changes at once:

1. the embedding method;
2. the hybrid architecture; and
3. MGO-based hyperparameter tuning.

The base paper does not clearly isolate the contribution of MGO by comparing the complete BERT-attention-CNN-GRU architecture with and without MGO. This is an important consideration for our experimental design.

### 7.5 Missing deployment analysis

The paper describes the system as suitable for real-time deployment, but it does not report:

- inference latency;
- throughput;
- memory usage;
- parameter count;
- model size;
- energy consumption; or
- the cost of repeating metaheuristic tuning.

These measurements are necessary before making practical deployment claims.

### 7.6 Explainability and security robustness

The base paper does not provide a detailed explanation of why individual emails are classified as phishing. It also does not evaluate robustness against:

- obfuscated text;
- misspellings and character substitutions;
- URL manipulation;
- HTML-based evasion;
- adversarial wording; or
- AI-generated phishing emails.

These areas represent important opportunities for extending the base approach.

---

## 8. Research Gaps Derived from the Base Paper

Our reading of the paper identifies the following gaps:

| Observed limitation | Research opportunity |
|---|---|
| Single-dataset evaluation | Validate on multiple datasets and, where possible, a temporally separated test set |
| Unclear split and randomization procedure | Define fixed, stratified splits and publish the experimental protocol |
| No repeated experiments | Report mean, standard deviation, and confidence intervals over multiple runs |
| Text-only input | Investigate the value of URLs, headers, sender information, HTML, and metadata |
| No adversarial testing | Evaluate obfuscated, paraphrased, and adversarial phishing emails |
| No LLM-generated phishing evaluation | Test performance against synthetic and human-written phishing samples |
| Limited interpretability | Add explainability methods such as attention analysis or SHAP-style feature attribution |
| No latency or resource accounting | Measure model size, memory, latency, throughput, and tuning cost |
| MGO contribution not isolated | Compare the full architecture with and without MGO under identical conditions |
| Unclear architecture around pooled BERT output | Compare pooled-output and token-level BERT representations |
| Possible duplicate leakage | Detect and remove duplicate or near-duplicate emails before splitting |

---

## 9. How the Base Paper Informs Our Proposed Research

The base paper provides the central technical motivation for using BERT and hybrid neural architectures in phishing detection. However, our research should improve the evaluation and reporting process in the following ways:

1. **Reproducible preprocessing:** clearly document cleaning, tokenization, sequence length, duplicate handling, and data splits.
2. **Fair comparisons:** keep the dataset split, training budget, and evaluation procedure consistent across all models.
3. **Component ablation:** separately measure the contributions of BERT, attention, CNN, GRU, regularization, and MGO.
4. **Robust evaluation:** include precision, recall, F1-score, confusion matrices, ROC-AUC, and false-positive analysis rather than relying only on accuracy.
5. **Repeated runs:** report variability across multiple random seeds.
6. **Generalization testing:** evaluate on an additional dataset or a temporally separated sample when available.
7. **Deployment measurements:** report inference latency, model size, and memory usage.
8. **Security-focused analysis:** test against obfuscated, adversarial, and AI-generated phishing content.
9. **Interpretability:** identify the words, phrases, URLs, or metadata that influence predictions.

The base paper therefore serves two roles in our work: it provides a promising architecture to investigate, and it highlights the methodological standards that our proposed system should strengthen.

---

## 10. Overall Assessment of the Base Paper

The main contribution of the base paper is the integration of BERT, Multi-Head Attention, CNN, Bidirectional GRU, and MGO into a single phishing-email classification pipeline. The reported experiments suggest that the hybrid model performs better than the selected GloVe variants, metaheuristic alternatives, and conventional deep-learning baselines on the chosen dataset.

At the same time, the strongest conclusions should be interpreted carefully. The paper's results are based on one dataset, and important implementation details are not reported. Numeric inconsistencies, the absence of repeated experiments, unclear statistical procedures, missing latency measurements, and the lack of robustness testing limit the strength of claims regarding state-of-the-art performance, generalization, and real-time deployment.

Our research uses this paper as a **base paper**, while also treating its limitations as motivation for a more transparent and rigorous investigation. The goal is not merely to reproduce the reported accuracy, but to determine which components genuinely improve phishing detection and whether the resulting system remains reliable when evaluated under realistic and changing conditions.

---

## 11. Base-Paper Reference Summary

In summary, the reference paper proposes:

```text
BERT → Multi-Head Attention → 1D CNN → Bidirectional GRU
→ Dropout → Dense Layer → Sigmoid Classifier
```

with MGO used to tune selected hyperparameters. We adopted this work as the conceptual and architectural foundation of our research because it combines modern language representations with local and sequential feature extraction. Our analysis also identified reproducibility, generalization, explainability, robustness, and resource-efficiency issues that should be addressed in the next stage of the project.
