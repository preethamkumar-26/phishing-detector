# 

<p align="center">
  <strong>Explainable Phishing Email & URL Intelligence</strong><br />
  <em>PAHF-Net · FastAPI · PyTorch · Next.js · TypeScript</em>
</p>

<p align="center">
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white" alt="Python 3.10+" /></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/API-FastAPI-009688?logo=fastapi&logoColor=white" alt="FastAPI" /></a>
  <a href="https://pytorch.org/"><img src="https://img.shields.io/badge/ML-PyTorch-EE4C2C?logo=pytorch&logoColor=white" alt="PyTorch" /></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Frontend-Next.js-000000?logo=next.js&logoColor=white" alt="Next.js" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /></a>
</p>

**PhishIntel** is an explainable phishing-email and URL detection platform. A custom PyTorch **PAHF-Net** classifier is served by FastAPI and consumed by a Next.js application built with TypeScript, Tailwind CSS, and HeroUI.

The platform analyzes email content, sender and reply-to details, headers, and URLs; returns a phishing probability and threat indicators; and provides scan history and PDF report export. It is designed to help security analysts investigate social engineering, credential harvesting, and deceptive URL attacks. PhishIntel is a decision-support tool, not a substitute for security review or mail-gateway controls.

The latest development work strengthens legitimate-email handling, adds runtime frontend–backend discovery, improves `.eml` analysis and forensic reporting, and tightens inference and repository workflows. These updates are documented below alongside the core platform architecture and setup instructions.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Email Classification Corrections](#email-classification-corrections)
- [Runtime Backend Discovery and Connection Binding](#runtime-backend-discovery-and-connection-binding)
- [Analyzer, EML Support, and Forensic PDF Export](#analyzer-eml-support-and-forensic-pdf-export)
- [Performance and Repository Updates](#performance-and-repository-updates)
- [Repository Layout](#repository-layout)
- [Requirements](#requirements)
- [Getting Started](#getting-started)
- [API Overview](#api-overview)
- [Model Evaluation and Metrics](#model-evaluation-and-metrics)
- [Development and Tests](#development-and-tests)
- [Privacy and Responsible Use](#privacy-and-responsible-use)
- [Project Information](#project-information)

---

## Features

### Detection and Explainability

- PAHF-Net inference through a versioned FastAPI contract.
- Explainable scan results with verdict, phishing probability, risk score, and indicators.
- Email scanning with subject, body, sender, reply-to, headers, and URL inputs.
- `.eml` file parsing and analysis through the Email Analyzer.
- Targeted correction-score filtering to reduce false positives on legitimate financial, billing, subscription, and promotional messages.
- Distinction between deemed promotional/marketing spam and original malicious spam or phishing attempts.

### Application and Reporting

- Scan history with filtering and pagination.
- PDF export of scan-history reports in a forensic-style audit layout.
- An analyzer interface with sample loaders and PAHF-Net score visualization.
- An evaluation dashboard for verified PAHF-Net metrics and ranked baseline comparisons.
- Model-service settings for endpoint configuration, connectivity testing, and saved preferences.
- Automatic local backend discovery, endpoint synchronization, and one-time retry after eligible network failures.

### Model and Runtime

- Versioned local model, tokenizer, and feature assets.
- Startup-loaded PAHF-Net model service for reusable inference without reloading weights for every request.
- Runtime health endpoints exposing backend readiness and the active analyze endpoint.
- Artifact-backed evaluation metrics, served from a versioned JSON file rather than generated or assumed at request time.

---

## Architecture

| Layer | Location / Component | Responsibilities |
|---|---|---|
| Next.js application | `phishintel-ai/` | App Router UI, TypeScript contracts, scan workflows, evaluation dashboard, history, analyzer, settings, and PDF export |
| FastAPI application | `backend/app/` | Startup lifecycle, runtime backend registration, CORS, request validation, scan and evaluation endpoints |
| Model service | `backend/app/services/model_service.py` | Loads PAHF-Net assets once at application startup and performs inference |
| Evaluation service | `backend/app/services/evaluation_service.py` | Loads and validates the versioned evaluation report |
| Backend discovery | `backend/app/main.py`, `backendDiscovery.ts` | Publishes the active backend endpoint and allows the frontend to discover and verify it at runtime |
| Analyzer and reporting | `AnalyzerPage`, `AnalyzerContent`, `exportHistoryPdf` | Parses `.eml` files, presents PAHF-Net scores, and exports scan history as a forensic PDF report |
| Model assets | `backend/saved_models/` | PyTorch checkpoints, tokenizer, feature transformations, and model configuration |

PAHF-Net uses a **DeBERTa-v3** text encoder with availability-gated text, URL, structure, and linguistic feature branches. The service also loads and validates the T/F regime assets; current prediction requests use the base `pahf_net.pt` checkpoint and base feature assets.

The backend is initialized through FastAPI's application lifespan. At startup, it detects its active host and port and publishes the runtime connection information for the Next.js application. The frontend uses that information to bind its model-service settings and scan requests to the running backend.

---

## Email Classification Corrections

PhishIntel's email-classification correction work focuses on reducing false positives without weakening the detection of credential theft, malicious spam, or targeted phishing attempts.

### Legitimate Email False-Positive Reduction

Correction-score filtering has been updated to address legitimate messages that were previously at risk of being classified as phishing, including:

- Bank statements and e-statements.
- SaaS invoices, billing receipts, and subscription-plan notifications.
- Reward notices and promotional messages from legitimate services.
- Banking and other financial communications whose vocabulary or transactional signals may otherwise resemble phishing indicators.

The filtering logic is intended to interpret financial and transactional signals in context rather than treating their presence alone as evidence of malicious intent.

### Transcode and Deemed/Original Spam Filtering

The updated transcode filtering logic distinguishes between two broad categories:

| Category | Interpretation | Classification objective |
|---|---|---|
| **Deemed spam** | Promotional or marketing-oriented messages and lures | Avoid automatically treating every promotional message as an original malicious or phishing email |
| **Original / malicious spam** | Original spam campaigns and messages associated with malicious or phishing behavior | Preserve scrutiny for credential harvesting, deceptive requests, and other malicious intent |

Banking and financial indicators are handled as contextual signals so that legitimate statements and receipts are not over-flagged merely because they contain financial terminology, balances, transaction references, or billing language.

### Rapid `.eml` Regression Test Suite

A five-file `.eml` test set was created and bundled as **`phishintel_test_eml_samples.zip`**. It is designed for rapid testing of the **Track A V2 correction-score filters** against representative legitimate and malicious email edge cases.

| Test file | Intended scenario |
|---|---|
| `01_legitimate_saas_invoice.eml` | Legitimate SaaS invoice or billing notification |
| `02_legitimate_bank_estatement.eml` | Legitimate bank e-statement |
| `03_phishing_credential_harvest.eml` | Phishing attempt designed to harvest credentials |
| `04_phishing_spear_bec_transfer.eml` | Spear-phishing / business email compromise (BEC) transfer scenario |
| `05_legitimate_rewards_promotional_edge.eml` | Legitimate rewards or promotional message representing a classification edge case |

This suite provides a repeatable set of real-world-style edge cases for checking whether legitimate financial and promotional messages remain distinguishable from malicious email patterns.

---

## Runtime Backend Discovery and Connection Binding

PhishIntel now supports automatic local frontend–backend endpoint discovery. This reduces the need to manually synchronize ports when the FastAPI process starts on a different port or is restarted during development.

### Backend Auto-Registration

The backend startup lifespan logic in `backend/app/main.py`:

1. Detects the active backend host and port.
2. Writes the runtime connection descriptor to `public/runtime-backend.json` in the Next.js application's `public/` directory.
3. Exposes `/health` and `/healthz` health endpoints, including `analyze_endpoint` information so the frontend can identify the active analysis endpoint.

The generated `runtime-backend.json` contains local runtime information. It is excluded from Git so machine-specific ports and local runtime state do not pollute repository changes.

### Local CORS Support

CORS configuration has been broadened with `allow_origin_regex` support for local `localhost` and `127.0.0.1` origins across development ports. This allows browser preflight (`OPTIONS`) requests to succeed when the frontend and backend are running on different local ports, rather than relying only on a single fixed frontend port.

### Frontend Discovery and Settings Synchronization

The frontend discovery utility, `backendDiscovery.ts`, is connected to the **Model service** settings interface. The settings workflow supports:

- **Endpoint (POST, JSON):** Displays and allows configuration of the model analysis endpoint.
- **Use model service:** Enables or disables requests to the FastAPI model service.
- **Test connection:** Verifies that the discovered or configured backend is reachable through `/health`.
- **Save:** Persists the selected model-service settings cleanly in `localStorage`.

When `runtime-backend.json` is available, the frontend reads it, checks backend connectivity through `/health`, and automatically populates the endpoint field with the discovered analysis endpoint.

### Scan Client Retry and Error Handling

Scan execution uses the discovered endpoint and follows a controlled recovery path:

1. The scan client sends the request to the currently configured or discovered backend endpoint.
2. When a network failure occurs—for example, after a backend restart on a new port—the client re-discovers the backend endpoint.
3. The client retries the scan **once** using the refreshed endpoint.
4. Connection failures and HTTP or response errors are surfaced clearly to the user.

When **Use model service** is enabled, the application does not silently fall back to a local preview after a failed model-service request. This keeps the displayed result and error state aligned with the actual backend response.

---

## Analyzer, EML Support, and Forensic PDF Export

### Email Analyzer and `.eml` Support

The Next.js/React analyzer experience has been expanded through the `AnalyzerPage` and `AnalyzerContent` components. It supports:

- Parsing and analyzing `.eml` email files.
- Loading sample emails for rapid analysis and interface testing.
- Displaying PAHF-Net scores and related classification information.
- Reviewing email evidence through the analyzer workflow.

The analyzer provides a direct workflow for exercising the email-classification pipeline with both user-supplied `.eml` files and the supplied regression samples.

### Forensic PDF Report Export

A shared TypeScript PDF export utility, **`exportHistoryPdf`**, generates landscape A4 PhishIntel audit reports. The export uses:

- `jspdf` for PDF document generation.
- `jspdf-autotable` for structured tabular reporting.
- Branded report headers.
- KPI metric boxes.
- Verdict tables for scan-history records.

The result is a structured, forensic-style report intended to make scan-history evidence easier to review and retain.

---

## Performance and Repository Updates

### Inference Performance

Warm CPU inference latency has been optimized to approximately **130 ms** in the measured development environment. Artificial progress delays were removed so the interface no longer adds unnecessary waiting time to the inference workflow.

The reported figure represents warm inference under the measured environment; actual latency can vary with hardware, model state, and runtime conditions.

### Artifact-Backed Evaluation

The `GET /api/v1/evaluation-metrics` endpoint is backed by `backend/saved_models/evaluation_metrics.json`. The endpoint reads and validates the saved evaluation artifact instead of fabricating, estimating, or calculating benchmark results during the request.

### Git and Repository Synchronization

The repository rename and synchronization from **`phishguard-ai`** to **`phishintel-ai`** has been completed. Git LFS is configured to track model checkpoint files (`*.pt`) and dataset files so that large model and data artifacts are handled through Git LFS rather than ordinary Git object storage.

The generated `public/runtime-backend.json` file is included in `.gitignore`, keeping local runtime ports and machine-specific backend connection data out of Git status and commits.

---

## Repository Layout

```text
PhishIntel/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── exceptions.py
│   │   │   └── logging.py
│   │   ├── schemas/
│   │   │   ├── evaluation.py
│   │   │   └── scan.py
│   │   ├── services/
│   │   │   ├── evaluation_service.py
│   │   │   ├── model_service.py
│   │   │   └── preprocessing.py
│   │   └── main.py
│   ├── saved_models/
│   │   ├── tokenizer/
│   │   ├── config.json
│   │   ├── features.joblib
│   │   ├── features_regime_F.joblib
│   │   ├── features_regime_T.joblib
│   │   ├── pahf_net.pt
│   │   ├── pahf_net_regime_F.pt
│   │   ├── pahf_net_regime_T.pt
│   │   ├── predict.py
│   │   └── evaluation_metrics.json
│   ├── tests/
│   ├── .env.example
│   └── requirements.txt
├── phishintel-ai/
│   ├── public/
│   │   └── runtime-backend.json  # Generated at runtime; excluded from Git
│   ├── src/
│   │   ├── app/
│   │   │   ├── (app)/
│   │   │   │   ├── account/
│   │   │   │   ├── analytics/
│   │   │   │   ├── analyzer/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── evaluation/
│   │   │   │   ├── explainability/
│   │   │   │   ├── history/
│   │   │   │   ├── profile/
│   │   │   │   ├── research/
│   │   │   │   │   ├── architecture/
│   │   │   │   │   ├── datasets/
│   │   │   │   │   ├── papers/
│   │   │   │   │   └── sources/
│   │   │   │   ├── settings/
│   │   │   │   └── layout.tsx
│   │   │   ├── (marketing)/
│   │   │   │   ├── landing/
│   │   │   │   └── page.tsx
│   │   │   ├── api/
│   │   │   ├── globals.css
│   │   │   ├── favicon.ico
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── analyzer/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── layout/
│   │   │   ├── marketing/
│   │   │   ├── theme/
│   │   │   └── ui/
│   │   ├── context/
│   │   ├── data/
│   │   ├── lib/
│   │   ├── services/
│   │   └── types/
│   ├── next.config.ts
│   └── package.json
├── .gitattributes
├── .gitignore
└── README.md
```

> **Runtime note:** `runtime-backend.json` is generated by the backend during local startup. It is shown in the layout to document its role, but it is not intended to be committed as a tracked runtime artifact.

---

## Requirements

- Python 3.10 or later.
- Node.js 20.9 or later and npm.
- Git and Git LFS. The `*.pt` checkpoints and dataset files (including `*.parquet` files, if present) are configured for Git LFS in `.gitattributes`.
- Enough memory for the DeBERTa-v3 model and its loaded checkpoints. A CUDA-capable PyTorch installation is optional; the service uses CPU when CUDA is unavailable.

---

## Getting Started

### 1. Get the Model Assets

From the repository root, install Git LFS and retrieve the checkpoint contents:

```shell
git lfs install
git lfs pull
```

Confirm that `backend/saved_models/pahf_net.pt` and the local `tokenizer/` directory contain the actual model assets, not unresolved LFS pointer files.

### 2. Backend Setup and Run (FastAPI + PyTorch)

From the repository root, run these commands in **PowerShell**:

```powershell
cd backend

# if .venv is not installed
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# if .venv is installed
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The FastAPI lifespan loads the model service once at startup. Scan requests reuse that initialized singleton; weights are not reloaded per request.

The backend supports local CORS origins on `localhost` and `127.0.0.1` across development ports through `allow_origin_regex`, in addition to the default local origins `http://localhost:3000` and `http://127.0.0.1:3000`. This is intended to prevent browser preflight (`OPTIONS`) failures when the local frontend and backend use different ports.

At startup, the backend also publishes its active host, port, and analysis endpoint to the Next.js `public/runtime-backend.json` file. The frontend reads this file for automatic endpoint discovery and verifies the service through `/health`.

Useful backend URLs:

| URL | Purpose |
|---|---|
| `http://127.0.0.1:8000/docs` | Interactive OpenAPI documentation |
| `http://127.0.0.1:8000/health` | Backend health and active analysis endpoint information |
| `http://127.0.0.1:8000/healthz` | Backend and model readiness, including analysis endpoint information |
| `http://127.0.0.1:8000/api/v1/models` | Model service status |

### 3. Frontend Setup and Run (Next.js)

In a second terminal, from the repository root:

```bash
cd phishintel-ai
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend supports runtime discovery through `public/runtime-backend.json`; the local API URL `http://127.0.0.1:8000` remains the documented default/manual endpoint for local development.

To override the API URL manually, create `phishintel-ai/.env.local`:

```dotenv
NEXT_PUBLIC_FASTAPI_URL=http://127.0.0.1:8000
```

The frontend package includes HeroUI (`@heroui/react`), Tailwind CSS, Framer Motion, jsPDF, and jsPDF AutoTable.

### 4. Configure the Model Service

Open the application's **Settings** page and use the **Model service** controls:

1. Confirm that the discovered endpoint is populated in **Endpoint (POST, JSON)**.
2. Enable **Use model service** to route scans to the FastAPI backend.
3. Select **Test connection** to verify connectivity through `/health`.
4. Select **Save** to persist the settings in `localStorage`.

When the backend restarts on a different local port, the scan client can rediscover the active endpoint and retry once after a network failure. When model-service mode is enabled, backend and response errors are surfaced rather than being hidden by a local preview fallback.

---

## API Overview

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/analyze` | Analyze an email and return a `ScanResponse` |
| `POST` | `/api/v1/scan` | Alias for the analyze endpoint |
| `GET` | `/api/v1/models` | Return model readiness and runtime information |
| `GET` | `/api/v1/evaluation-metrics` | Return a validated evaluation report or an unavailable status |
| `GET` | `/health` | Return backend health and active analysis endpoint information |
| `GET` | `/healthz` | Return service and model readiness, including analysis endpoint information |

The API router is also mounted under `/api` for compatibility.

### Scan Response Contract

Both scan routes return exactly these fields:

| Field | Type | Meaning |
|---|---|---|
| `success` | `boolean` | Whether inference completed |
| `scan_id` | `string` | Unique identifier for the scan |
| `is_phishing` | `boolean` | Binary phishing decision |
| `verdict` | `string` | Human-readable classification |
| `confidence_score` | `number` | Phishing probability in `[0, 1]` |
| `risk_score` | `number` | Risk score in `[0, 100]` |
| `p_phish` | `number` | Calibrated phishing probability in `[0, 1]` |
| `indicators` | `array` | Threat indicators and their evidence |
| `explainability` | `object` | Summary and model explanation details |

The Next.js client validates this response before mapping it to the UI. When model-service mode is enabled, a failed HTTP request or invalid response is surfaced as an error instead of being silently replaced with a local preview.

---

## Model Evaluation and Metrics

The evaluation page requests:

```http
GET /api/v1/evaluation-metrics
```

The endpoint reads `backend/saved_models/evaluation_metrics.json`. The artifact is a **versioned report of measured evaluation results**; the endpoint does not calculate benchmark scores or invent missing values.

If the file is absent, it responds with HTTP 200 and:

```json
{
  "status": "unavailable",
  "reason": "artifact_not_found",
  "artifact": "evaluation_metrics.json"
}
```

The evaluation page then shows a clear unavailable state. Invalid, unreadable, or inconsistent artifacts are rejected rather than displayed as results.

The following JSONC is a **schema template, not an evaluation result**. Replace every placeholder with the corresponding measured value before saving it as `evaluation_metrics.json`. The `PAHF-Net` entry in `model_ranking` must match the metrics object; classifier names must be unique.

```jsonc
{
  "status": "available",
  "schema_version": 1,
  "model_name": "PAHF-Net",
  "model_version": "<checkpoint or release identifier>",
  "dataset": "<held-out dataset name>",
  "dataset_version": "<dataset version>",
  "split": "test",
  "threshold": "<measured decision threshold, 0 to 1>",
  "evaluated_at": "<ISO-8601 timestamp>",
  "sample_count": "<positive integer>",
  "metrics": {
    "accuracy": "<measured value, 0 to 1>",
    "precision": "<measured value, 0 to 1>",
    "recall": "<measured value, 0 to 1>",
    "f1_score": "<measured value, 0 to 1>",
    "auc_roc": "<measured value, 0 to 1>",
    "inference_latency_ms": "<measured latency in milliseconds>"
  },
  "model_ranking": [
    {
      "model_name": "PAHF-Net",
      "rank": "<rank from the documented comparison>",
      "accuracy": "<same value as metrics.accuracy>",
      "precision": "<same value as metrics.precision>",
      "recall": "<same value as metrics.recall>",
      "f1_score": "<same value as metrics.f1_score>",
      "auc_roc": "<same value as metrics.auc_roc>",
      "inference_latency_ms": "<optional measured latency in milliseconds>"
    },
    {
      "model_name": "<baseline classifier name>",
      "rank": "<rank from the same evaluation protocol>",
      "accuracy": "<measured value, 0 to 1>",
      "precision": "<measured value, 0 to 1>",
      "recall": "<measured value, 0 to 1>",
      "f1_score": "<measured value, 0 to 1>",
      "auc_roc": "<measured value, 0 to 1>"
    }
  ]
}
```

All metric values must come from a documented evaluation protocol using the same dataset split for PAHF-Net and its baseline classifiers. Record the threshold and latency measurement method so comparisons remain interpretable.

No evaluation artifact is committed by default; the dashboard remains unavailable until verified results are supplied. When `backend/saved_models/evaluation_metrics.json` is present, the API serves the validated artifact-backed report.

---

## Development and Tests

### Backend Tests

Run backend tests from `backend/`:

```shell
python -m unittest discover -s tests
```

### Frontend Checks

Run frontend checks from `phishintel-ai/`:

```shell
npm exec tsc -- --noEmit
npm run lint
npm run build
```

### Email Classification Regression Checks

Use `phishintel_test_eml_samples.zip` to exercise the Track A V2 correction-score filters against the five included cases:

- Legitimate SaaS invoice.
- Legitimate bank e-statement.
- Phishing credential-harvesting email.
- Spear-phishing / BEC transfer email.
- Legitimate rewards/promotional edge case.

The expected purpose of this test set is to check both sides of the classification boundary: legitimate messages should not be over-flagged, while malicious messages should remain identifiable as threats.

---

## Privacy and Responsible Use

Email contents may contain personal, financial, or confidential information. Only submit data you are authorized to analyze, protect stored scan records, and avoid committing raw emails or sensitive evaluation data.

Treat model output as decision support and investigate uncertain or high-impact decisions before taking action.

---

## Project Information

**Institution:** Keshav Memorial Educational Society  
**Team:** PhishIntel Development Group
