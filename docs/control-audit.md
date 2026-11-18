# PhishIntel — Interactive Control Audit

**Specification Reference:** Task 8 (End demo mode; every control must work).
**Audit Date:** 2026-11-18
**Environment:** Next.js 16.4.6, React 19.3.0, SQLite WAL, PAHF-Net architecture.

---

## 1. Global Navigation & Chrome

| Control | Location | Status | Implementation Details / Verification |
|---|---|---|---|
| **Overview nav link** | TopBar / Liquid Navbar (`/dashboard`) | `Working` | Direct client-side route navigation to Overview dashboard |
| **Email analyzer nav link** | TopBar / Liquid Navbar (`/analyzer`) | `Working` | Direct navigation to Email Analyzer workspace |
| **Explainability nav link** | TopBar / Liquid Navbar (`/explainability`) | `Working` | Direct navigation to PAHF-Net Explainability dashboard |
| **Evaluation nav link** | TopBar / Liquid Navbar (`/analytics`) | `Working` | Direct navigation to Model Evaluation & Metrics page |
| **Scan history nav link** | TopBar / Liquid Navbar (`/history`) | `Working` | Direct navigation to Audit Log and Scan History |
| **Profile nav link** | TopBar / Liquid Navbar (`/profile`) | `Working` | Direct navigation to User Profile & Security Settings |
| **New scan button** | TopBar (`+ New scan`) | `Working` | Directly routes to `/analyzer` with focus on input form |
| **Settings (Gear icon)** | TopBar | `Working` | Opens dropdown drawer with Theme toggles, Architecture link, GitHub link |
| **Settings: GitHub repo link** | Settings drawer | `Working` | Verified: opens GitHub repo in `_blank` tab with GitHub icon |
| **Settings: Architecture link** | Settings drawer | `Working` | Verified: opens PAHF-Net architecture diagram asset |
| **User Avatar menu** | TopBar | `Working` | Dropdown with Account details, active organization, and Sign Out |
| **Model service badge** | TopBar | `Working` | Reflects live `/health` check: "Model service · not connected" or "connected" |

---

## 2. Overview Dashboard (`/dashboard`)

| Control | Element | Status | Implementation Details / Verification |
|---|---|---|---|
| **Live feed 24h toggle** | Hero right | `Working` | Toggles filtering between 30 days and last 24 hours |
| **Live feed ⋯ menu** | Hero right | `Working` | Direct link to `/history` audit log |
| **Live feed scan rows** | Hero right | `Working` | Click opens detailed explanation for that scan in `/explainability` |
| **"N scans in history"** | Hero right | `Working` | Real-time counter of total stored scans, links to `/history` |
| **Mail sources ↗ link** | Card 1 header | `Working` | Navigates to `/history` with breakdown |
| **Mail sources counts & bars** | Card 1 | `Working` | Dynamically classifies headers (Outlook, Gmail, Yahoo, MAPI, Other) |
| **Top indicators ↗ link** | Card 2 header | `Working` | Navigates to `/explainability` |
| **Top indicators meters** | Card 2 | `Working` | Dynamically aggregates real triggered threat indicators from scan records |
| **Footer: Workspace created** | Metadata strip | `Working` | Displays creation timestamp matching Profile creation date |
| **Footer: Last scan** | Metadata strip | `Working` | Shows timestamp of newest scan or "—" if empty |
| **Footer: Last evaluation** | Metadata strip | `Working` | Displays active evaluation artifact model version and date or "none on record" |
| **Full history button** | Metadata strip | `Working` | Navigates to `/history` |
| **Scan email button** | Recent scans card | `Working` | Navigates to `/analyzer` |
| **Recent scans table rows** | Recent scans card | `Working` | Displays latest 6 scans; row click or Enter opens `/explainability` |
| **Activity 14d bars & tooltips** | Activity card | `Working` | 14 zero-filled daily buckets; tooltip on hover/focus shows date, Safe, Phishing, Total |

---

## 3. Email Analyzer (`/analyzer`)

| Control | Element | Status | Implementation Details / Verification |
|---|---|---|---|
| **Example: Phishing button** | Input form header | `Working` | Fills input with sample phishing email text without fake pre-computation |
| **Example: BEC button** | Input form header | `Working` | Fills input with sample BEC wire request text |
| **Example: Legitimate button** | Input form header | `Working` | Fills input with sample legitimate vendor communication |
| **File drag & drop zone** | Input form | `Working` | Parses uploaded `.eml` and `.txt` files with header and body extraction |
| **Email input fields** | Input form | `Working` | Subject, From, Reply-To, Body, and Raw Headers inputs |
| **Analyze / Scan action** | Input form | `Working` | Runs full PAHF-Net pipeline (or model service if connected), stores result |
| **Analysis results panel** | Output column | `Working` | Shows calibrated P(phish), decision tag, modality gate weights ($g_i$), and threat indicators |

---

## 4. Explainability Dashboard (`/explainability`)

| Control | Element | Status | Implementation Details / Verification |
|---|---|---|---|
| **Scan selector dropdown** | Page header | `Working` | Lets analyst select any stored scan; updates all panels synchronously |
| **Modality contributions card** | Top grid | `Working` | Displays Text (256d), URL (32d), Structure (32d), Linguistic (32d) gates & deltas |
| **Entities chip list** | Middle grid | `Working` | Financial and security entity extraction with card/account masking |
| **URLs list** | Middle grid | `Working` | Extracted links and redirect domain inspection |
| **Textual evidence panel** | Bottom card | `Fixed` | **T6 Fix**: Idle background matches card (`var(--card)`); hover/focus-within turns pure white (`#ffffff`) |
| **PAHF-Net indicator chips** | Bottom card | `Fixed` | Displays human-readable titles, category tags, and signed score impacts (no legacy codes) |
| **Benign evidence chips** | Bottom card | `Fixed` | Previous `M-03`, `M-06`, `M-09` legacy chips permanently removed |

---

## 5. Model Evaluation (`/analytics`)

| Control | Element | Status | Implementation Details / Verification |
|---|---|---|---|
| **Load evaluation artifact** | Page header | `Working` | Hidden file input accepting schema v1 JSON; validates all 7 metadata fields |
| **Artifact version dropdown** | Page header | `Working` | Appears when multiple artifacts are loaded; switches active evaluation dataset |
| **4 Metric cards** | Top grid | `Working` | Accuracy, Precision, Recall, F1; computed from predictions or confusion matrix |
| **Confusion matrix** | Middle grid | `Working` | Displays TP, FP, FN, TN at operating threshold $T$ |
| **ROC curve SVG** | Middle grid | `Working` | Rendered with true axes (TPR vs FPR), diagonal baseline, and trapezoidal AUC |
| **Evaluation record list** | Right card | `Working` | Validates and displays Model version, Dataset, Version, Split, Threshold, Date, n |

---

## 6. Scan History & Audit Log (`/history`)

| Control | Element | Status | Implementation Details / Verification |
|---|---|---|---|
| **Search query input** | Filter toolbar | `Working` | Real-time filtering by subject, sender, or scan ID |
| **Decision filter (All/Phishing/Safe)** | Filter toolbar | `Working` | Filters scans by calibrated decision |
| **Source filter (All/Uploaded/Pasted)** | Filter toolbar | `Working` | Filters scans by origin source |
| **Pagination controls** | Table footer | `Working` | HeroUI liquid pagination; 10 scans per page with prev/next navigation |
| **Row expansion toggle** | Table body | `Working` | Expands row to show PAHF-Net indicators, modality gate weights, and entities |
| **Open explanation button** | Expanded row | `Working` | Sets selected scan in context and routes to `/explainability` |
| **Load into analyzer button** | Expanded row | `Working` | Pre-fills Analyzer form with the email subject and body |
| **Delete row action (⋮ menu)** | Table row | `Fixed` | Enhanced delete dialog with card preview, warning callout, and permanent deletion |
| **Export to PDF button** | Header toolbar | `Fixed` | Exports audit report with PAHF-Net signals (`Label (branch, ±value)`) and truthful engine |
| **Clear all scans button** | Header toolbar | `Working` | Deletes all stored scans with prompt confirmation |

---

## 7. Profile & Account Settings (`/profile`)

| Control | Element | Status | Implementation Details / Verification |
|---|---|---|---|
| **Personal information form** | Profile tab | `Working` | Name, designation, department, organization fields save to SQLite / storage |
| **Workspace preferences** | Profile tab | `Working` | Threshold $T$, default view, notification settings |
| **Security & encryption view** | Profile tab | `Working` | Reports PBKDF2-SHA256 iterations and SQLite WAL storage status |
| **Account activity audit** | Profile tab | `Working` | Real event log with timestamps |
