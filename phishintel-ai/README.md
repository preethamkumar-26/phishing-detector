# PhishGuard AI — Explainable Phishing Email Detection Web Application

> **Frontend Implementation Brief & Prototype Demo**  
> An explainable AI-based email analysis experience designed to interface with modern hybrid transformer architectures (BERT + Multi-Head Attention + 1D-CNN + Bi-GRU + Mountain Gazelle Optimizer).

---

## 🛡️ Overview

PhishGuard AI is a cybersecurity web application built for analyzing email content, surfacing transparent model verdicts, and explaining neural decision rationales without opaque black-box ambiguity.

This implementation delivers the complete frontend application specified in the **PhishGuard AI Frontend Specification**:
- **Design system:** Dark-first cybersecurity SaaS aesthetic (`#090D18` app background, `#101729` sidebar, `#151E31` card surfaces, `#8B5CF6` primary violet accent, `#22C55E` safe, `#EF4444` threat, `#F59E0B` review).
- **Application shell:** Responsive persistent collapsible left sidebar, top bar with quick search & profile controls, and mobile slide-over navigation drawer.
- **Explicit demo labeling:** Every mock prediction, simulated metric, and sample history entry is clearly labeled with **Demo Data** / **Prototype Notice** badges.

---

## 📱 Navigation & Page Inventory

### 1. Landing Page (`/`)
- Public navigation (Brand, Home, Phishing Scan, Scan History, Contact Us, Sign In).
- Hero section with headline: *"Detect Phishing. Understand the Threat."*
- Primary CTAs: **Analyze an Email** (`/analyzer`) and **Explore the Research** (`/analytics`).
- Composed UI preview mockup.
- Feature overview cards (AI text classification, explainable insights, research transparency).
- Three-step "How It Works" workflow.
- Research architecture preview (BERT → Attention → CNN/GRU → Classifier).

### 2. Main Dashboard (`/dashboard`)
- Central header with **New Scan** action and date range filter.
- Four primary KPI cards with demo indicators:
  - Total Emails Scanned (1,428)
  - Phishing Detected (384)
  - Safe Emails (972)
  - Needs Review (72)
- Recharts visualizations:
  - **Threat Distribution:** Donut chart breakdown (Phishing, Safe, Needs Review).
  - **Scan Activity Trends:** Area chart tracking daily volume and threat counts.
- **Scan Workspace / Recent Scans Table:**
  - Client-side search and status filters (All, Phishing, Safe, Needs Review).
  - Status chips: `Model ON`, `Demo model v0.1`, `Demo / Not connected`.
  - Detail inspection modal for reviewing extracted body text and evidence.
- **Right-side Profile Summary Panel (Desktop):** User profile card ("Alex Morgan"), role/status placeholder, and Sign out demo confirmation.

### 3. Phishing Email Analyzer (`/analyzer`)
- **Strict two-panel layout side-by-side on desktop (stacks vertically on mobile):**
- **Left Panel (Email Input):**
  - "Paste Email" and "Upload File" modes (`?mode=upload` query param supported).
  - Subject and sender input fields.
  - Large email body textarea with character and word counters.
  - Quick test buttons: **Load Sample Phishing Email** and **Load Sample Safe Email**.
  - Drag-and-drop file upload zone for `.txt` and `.eml` files.
  - Privacy helper notice.
  - Primary **Analyze Email** button.
- **Right Panel (Analysis Results):**
  - **Empty state:** Clean illustration and instructions.
  - **Loading state:** Neural pipeline progress indicator (BERT → Attention → CNN/GRU).
  - **Result state:**
    - Detection banner (`PHISHING DETECTED`, `SAFE / LEGITIMATE`, `NEEDS REVIEW`).
    - Demo confidence meter.
    - Summary assessment.
    - Flagged linguistic indicators list with severity tags.
    - Highlighted email excerpt.
    - Actions: **View Explanation** (`/explainability`), **Save to History**, **Clear**.

### 4. Explainable AI (`/explainability`)
- Demonstrates the future interpretability interface.
- Explanation method tabs: **Multi-Head Attention**, **SHAP Attribution**, **LIME Local**.
- Interactive token importance heatmap with selectable token attribution scores.
- Ranked feature attributions progress bars.
- Scientific faithfulness note on attention vs. causal feature attribution.

### 5. Model Performance & Research Analytics (`/analytics`)
- KPI cards: Accuracy (97.4%), Precision (96.8%), Recall (98.1%), F1-score (97.4%).
- Interactive 4-quadrant **Confusion Matrix** (TP, FP, FN, TN).
- Recharts **Training & Validation Loss Convergence** curve across epochs.
- Model architecture comparison table (BERT baseline, CNN-1D, Bi-GRU, Proposed Champion).
- Dataset split and reproducibility metadata (Kaggle + Enron, 70/15/15 split, seed 42, MGO optimizer).

### 6. Scan History (`/history`)
- Search input and status filter tabs (All, Phishing, Safe, Needs Review).
- Date range filter selector.
- Complete audit table with pagination controls.
- Inspection modal to review full text and flagged indicators.
- Export scan data (demo JSON/CSV notice).

### 7. Supplementary Research & System Routes
- `/research/datasets` (Dataset Versions & Curation)
- `/research/architecture` (Multi-scale neural architecture diagram)
- `/research/sources` (Literature sources & bibliography)
- `/research/papers` (Research papers & preprints)
- `/settings` (Preferences, inference endpoint configuration, sensitivity threshold slider)
- `/account` (User profile, clearance tier, API token management)

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | Custom Accessible Primitives (Buttons, Dialogs, Cards, Badges, Tabs) |
| Iconography | Lucide React + Custom Brand SVGs |
| Data Visualizations | Recharts |
| State Management | React Hooks + Modular Service Architecture |

---

## 🚀 Getting Started

### 1. Running from Root
From the repository root (`c:\Users\Lenovo\preethamkumar\phishing-detector\phishing-detector`):

```bash
# Start Next.js development server
npm run dev

# Or build for production
npm run build
npm run start
```

### 2. Running inside `phishguard-ai`
Alternatively, navigate directly to the frontend package:

```bash
cd phishguard-ai
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🔌 Future Backend Integration Contract

All analyzer logic is abstracted behind `src/services/scanService.ts`:

```typescript
export async function analyzeEmail(input: AnalyzeEmailInput): Promise<ScanResult>
```

When the Python FastAPI model inference service is ready, replace the heuristic simulator in `scanService.ts` with a `fetch("http://localhost:8000/api/v1/predict", { method: "POST", ... })` call without requiring changes to any UI components.
