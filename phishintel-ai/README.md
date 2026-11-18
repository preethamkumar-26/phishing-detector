# PhishIntel — Explainable Phishing Email Threat Analysis Platform

> **Forensic Threat Intelligence & Explainable AI Detection**  
> Powered by **PAHF-Net**: Availability-Gated Hierarchical Fusion with Class-Conditional Domain Adversarial Neural Networks (DANN).

---

## 🛡️ Overview

PhishIntel is an explainable AI email security platform designed for forensic phishing detection, multi-signal feature attribution, and calibrated risk scoring.

The core architecture is **PAHF-Net (Availability-Gated Hierarchical Fusion with Class-Conditional DANN)**:
- **Multi-Branch Encoders:**
  - Text representation: DeBERTa-v3 contextual embeddings ($768\text{d} \to 256\text{d}$)
  - URL features ($6\text{d} \to 32\text{d}$)
  - Structural layout and MIME consistency ($28\text{d} \to 32\text{d}$)
  - Linguistic stylistic urgency markers ($9\text{d} \to 32\text{d}$)
- **Availability-Gated Hierarchical Fusion:**
  - Dynamic availability gating: $h_{\text{fused}} = \sum g_i z_i$ with learned gates $g_t, g_u, g_s, g_l \in [0, 1]$
  - Availability mask $m_i \in \{0, 1\}$ and dynamic modality dropout ($p = 0.2$)
- **Domain Adaptation:**
  - Class-conditional domain adversarial training (DANN) with Gradient Reversal Layer (GRL) and source discriminators ($D_{\text{benign}}$, $D_{\text{malicious}}$)
- **Calibrated Decision:**
  - MLP classifier head with GELU, producing calibrated probability $P_{\text{phish}}$ evaluated against tunable threshold $T$.

---

## 🚀 Running the Application

### 1. Production Mode (Recommended for Demos & Evaluations)
To run the fully optimized production build with instant navigation and zero compilation delay:

```bash
cd phishintel-ai
npm run start:prod
```
This builds and serves the application at [http://localhost:3000](http://localhost:3000).

### 2. Development Mode with Pre-warmed Routes
In Next.js development mode, on-demand compilation can introduce transient "Compiling / Rendering" delays during initial navigation. Use the warm-up script to compile all routes at startup:

```bash
cd phishintel-ai
npm run dev:warm
```

### 3. Standard Development Mode
```bash
cd phishintel-ai
npm run dev
```

### 4. Running Verification Tests
```bash
cd phishintel-ai
npm test
```

---

## 📱 Architecture & Navigation
- `/dashboard` — Forensic Overview, live detection throughput, email sources breakdown, and 14-day activity.
- `/analyzer` — Side-by-side Email Threat Analyzer with DeBERTa-v3 semantic extraction and MIME parsing.
- `/explainability` — Transparent PAHF-Net modality contributions, availability gates ($g_i$), and semantic evidence highlights.
- `/analytics` — Model Performance & Evaluation artifacts with Confusion Matrix and ROC Curve.
- `/history` — Forensic scan audit log, pagination, filtering, and PDF threat report export.
- `/profile` — Local SQLite WAL workstation settings and authentication credentials.
