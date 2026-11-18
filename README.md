# PhishIntel

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PyTorch](https://img.shields.io/badge/ML-PyTorch-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**PhishIntel** is an explainable phishing-email and URL detection platform. A custom PyTorch PAHF-Net classifier is served by FastAPI and consumed by a Next.js, TypeScript, Tailwind CSS, and HeroUI application.

The platform analyzes email content, sender and reply-to details, headers, and URLs; returns a phishing probability and threat indicators; and provides scan history and PDF report export. It is designed to help security analysts investigate social engineering, credential harvesting, and deceptive URL attacks. It is a decision-support tool, not a substitute for security review or mail-gateway controls.

## Features

- PAHF-Net inference through a versioned FastAPI contract.
- Explainable scan results with verdict, phishing probability, risk score, and indicators.
- Email scanning with subject, body, sender, reply-to, headers, and URL inputs.
- Scan history with filtering and pagination.
- PDF export of scan-history reports.
- An evaluation dashboard for verified PAHF-Net metrics and ranked baseline comparisons.
- Versioned local model, tokenizer, and feature assets.

## Architecture

| Layer | Location | Responsibilities |
|---|---|---|
| Next.js application | `phishintel-ai/` | App Router UI, TypeScript contracts, scan workflows, evaluation dashboard, history, and PDF export |
| FastAPI application | `backend/app/` | Startup lifecycle, CORS, request validation, scan and evaluation endpoints |
| Model service | `backend/app/services/model_service.py` | Loads PAHF-Net assets once at application startup and performs inference |
| Evaluation service | `backend/app/services/evaluation_service.py` | Loads and validates the versioned evaluation report |
| Model assets | `backend/saved_models/` | PyTorch checkpoints, tokenizer, feature transformations, and model configuration |

PAHF-Net uses a DeBERTa-v3 text encoder with availability-gated text, URL, structure, and linguistic feature branches. The service also loads and validates the T/F regime assets; current prediction requests use the base `pahf_net.pt` checkpoint and base feature assets.

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
│   │   └── evaluation_metrics.json   # add after a verified held-out evaluation
│   ├── tests/
│   ├── .env.example
│   └── requirements.txt
├── phishintel-ai/
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
└── README.md
```

## Requirements

- Python 3.10 or later.
- Node.js 20.9 or later and npm.
- Git and Git LFS. The `*.pt` checkpoints (and `*.parquet` files, if present) are configured for Git LFS in `.gitattributes`.
- Enough memory for the DeBERTa-v3 model and its loaded checkpoints. A CUDA-capable PyTorch installation is optional; the service uses CPU when CUDA is unavailable.

## Getting Started

### 1. Get the model assets

From the repository root, install Git LFS and retrieve the checkpoint contents:

```shell
git lfs install
git lfs pull
```

Confirm that `backend/saved_models/pahf_net.pt` and the local `tokenizer/` directory contain the actual model assets, not unresolved LFS pointer files.

### 2. Configure and run the backend

Create and activate the virtual environment **inside `backend/`**, then install the pinned project dependencies:

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

On macOS or Linux, activate the environment with:

```shell
source .venv/bin/activate
```

Run Uvicorn from the `backend/` directory:

```shell
python -m uvicorn app.main:app --reload --port 8000
```

The FastAPI lifespan loads the model service once at startup. Scan requests reuse that initialized singleton; weights are not reloaded per request. The default CORS allowlist includes `http://localhost:3000` and `http://127.0.0.1:3000`.

Useful backend URLs:

| URL | Purpose |
|---|---|
| `http://127.0.0.1:8000/docs` | Interactive OpenAPI documentation |
| `http://127.0.0.1:8000/healthz` | Backend and model readiness |
| `http://127.0.0.1:8000/api/v1/models` | Model service status |

### 3. Configure and run the frontend

In a second terminal:

```shell
cd phishintel-ai
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend defaults to the local API at `http://127.0.0.1:8000`. To override it, create `phishintel-ai/.env.local`:

```dotenv
NEXT_PUBLIC_FASTAPI_URL=http://127.0.0.1:8000
```

The frontend package includes HeroUI (`@heroui/react`), Tailwind CSS, Framer Motion, jsPDF, and jsPDF AutoTable.

## API Overview

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/analyze` | Analyze an email and return a `ScanResponse` |
| `POST` | `/api/v1/scan` | Alias for the analyze endpoint |
| `GET` | `/api/v1/models` | Return model readiness and runtime information |
| `GET` | `/api/v1/evaluation-metrics` | Return a validated evaluation report or an unavailable status |
| `GET` | `/healthz` | Return service and model readiness |

The API router is also mounted under `/api` for compatibility.

### Scan response contract

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

The Next.js client validates this response before mapping it to the UI.

## Model Evaluation and Metrics

The evaluation page requests:

```http
GET /api/v1/evaluation-metrics
```

The endpoint reads `backend/saved_models/evaluation_metrics.json`. The artifact is a **versioned report of measured evaluation results**; the endpoint does not calculate benchmark scores or invent missing values. If the file is absent, it responds with HTTP 200 and:

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

All metric values must come from a documented evaluation protocol using the same dataset split for PAHF-Net and its baseline classifiers. Record the threshold and latency measurement method so comparisons remain interpretable. No evaluation artifact is committed by default; the dashboard remains unavailable until verified results are supplied.

## Development and Tests

Run backend tests from `backend/`:

```shell
python -m unittest discover -s tests
```

Run frontend checks from `phishintel-ai/`:

```shell
npm exec tsc -- --noEmit
npm run lint
npm run build
```

## Privacy and Responsible Use

Email contents may contain personal, financial, or confidential information. Only submit data you are authorized to analyze, protect stored scan records, and avoid committing raw emails or sensitive evaluation data. Treat model output as decision support and investigate uncertain or high-impact decisions before taking action.

## Team and Authorship

**Project lead:** Rishikesh Manthena

**Collaborators:** Preetam P, Tanush, Prabhakaran, and Pritam K

**Institution:** Keshav Memorial Educational Society
