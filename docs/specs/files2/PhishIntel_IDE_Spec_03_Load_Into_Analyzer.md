# PhishIntel — IDE Implementation Spec #03
## "Load into analyzer" from Scan history does not load the email

**Source:** `20261118-1207-45_9636118.mp4` (15 s screen recording, no narration) plus the user's written request.
**Written request (the requirement):** *"When clicking 'Load into analyzer' on the emails which are in the history, they aren't loading into the analyzer. Fix this bug correctly and make 'Load into analyzer' work, so that the specific email is loaded into the analyzer directly on clicking the button in the history."*
**Relation to earlier specs:** Specs #01 and #02 are done. Same working rules as before: find real files with grep (don't invent names), one branch, one commit per task, run the acceptance checks, final report. Run all tasks below in one pass.
**Repo:** `phishing-detector/` → `phishintel-ai/` (Next.js), `backend/`. Run: `cd phishintel-ai && npm run dev`.

Tags: `[SPOKEN/WRITTEN]` = the user asked for it. `[DERIVED]` = seen on screen or needed to make the fix correct.

---

## What the recording shows (evidence in `evidence_03/`)
1. `/history` lists 9 scans. Top row: **PG-2608**, subject *"AI is moving beyond demos. Are you ready to become an FDE?"*, sender `hello@scaler.com`, PHISHING, P_phish 0.375, T 0.05, engine "local preview".
2. The row's **⋮ menu** offers **Open explanation**, **Load into analyzer**, **Delete** (`01_…`).
3. Clicking **Load into analyzer** navigates to `/analyzer`, but the page is **completely empty**: Subject, From, Reply-To, Body ("0 chars"), URLs ("No URLs detected yet") are blank and the right panel says **"Awaiting a message"** (`02_…`). The clip repeats this several times with different rows, so it is not row-specific.
4. The same action also exists as a **Load into analyzer** button inside an expanded row (seen in the earlier recording). Both entry points must work.

---

## L0 — Reproduce and find the root cause `[DERIVED]`
1. `git status` clean; `git checkout -b fix/load-into-analyzer`.
2. Find the code: `grep -rniE "Load into analyzer|loadIntoAnalyzer|load-into" phishintel-ai backend --exclude-dir=node_modules --exclude-dir=.next`. Locate (a) the two click handlers in the Scan history page, (b) the analyzer page and its form state, (c) the scan record type, the API/DB layer that stores scans.
3. Answer each question and put the answers in the report:
   - **Is the original email stored?** Check the scan table/type for subject, from, reply-to, body, URLs, raw headers. If only subject/sender/score are stored, there is nothing to load and the fix must start at storage (L2).
   - **What does the click handler do?** Only `router.push("/analyzer")` with no payload? Does it set state in a context/store?
   - **Does the analyzer read that handoff?** If state is set in a context, is it reset when the analyzer page mounts (the app now remounts the content region on every navigation because of the page-transition work in Spec #02, e.g. `template.tsx`, so state kept in the page component or in a provider placed inside the route is lost)? Does an effect overwrite the form with empty defaults after the handoff is applied (including React StrictMode double-invoked effects in dev)?
   - Does the "Awaiting a message" panel render from the form state or from a separate "current result" state that was never set?
4. Reproduce with a Playwright/e2e script or manual steps: click ⋮ → Load into analyzer on PG-2608; record what state the analyzer receives.

---

## L1 — Make the history → analyzer handoff reliable `[WRITTEN]`

**Design (use this unless L0 proves something in the repo makes it impossible):** hand off by **scan ID, not by copied form data.**
1. Both history actions navigate to `/analyzer?load=<scanId>` (use `next/link`/`router.push`, **no** full-page reload).
2. The analyzer page, on mount, reads `load` from the URL, fetches that scan from the same data source the history page uses (API/DB/context), and fills the form: **Subject, From, Reply-To, Body, extra URLs, Raw headers**. Show a short loading state in the form (skeleton or disabled fields) until the data arrives; never flash the empty form first.
3. After applying, remove the query param with `router.replace("/analyzer")` so that a page refresh or Back does not silently reload it again, and make the apply step idempotent (guard with a ref keyed by scanId so StrictMode double effects do not apply twice or clear the form).
4. If the scan ID does not exist (deleted, bad link): show an inline notice "That scan is no longer available" and leave the form empty. No crash.
5. Because the ID is in the URL, the handoff survives the content remount from the page transition and works from direct links and from the browser back/forward buttons.
6. The same code path serves the ⋮ menu item and the expanded-row button (shared helper, e.g. `buildAnalyzerLink(scanId)`).
7. Dismiss the ⋮ menu on click, and make the whole action keyboard-accessible (Enter/Space on the menu item).

**Result panel (right side "Awaiting a message") `[DERIVED, default below]`:** when a scan is loaded, show **that scan's stored verdict, score, threshold and engine** in the result panel instead of "Awaiting a message", clearly labelled *"Loaded from scan PG-2608 · stored result"*, **without creating a new scan record**. Pressing the analyzer's scan/analyze button runs a **new** analysis and saves it as a new scan with its own ID. Do not auto-run a scan on load. (If the stored result cannot be shown, leave the panel at "Awaiting a message" but the form must still be filled.)

---

## L2 — Make sure the email content is actually stored `[DERIVED]`
Only needed if L0 shows the full message is not persisted.
1. At scan time, persist the **input exactly as analyzed**: subject, from, reply-to, body (plain text after HTML conversion, and the original HTML if it was provided), the URL list, raw headers text, and the input origin (pasted / uploaded file). Add the columns/fields via a small idempotent migration; back up the DB file before migrating and report row counts.
2. Cap sizes sensibly (e.g., reject or truncate bodies above a limit with a visible note) and keep the "card and account numbers are masked" behaviour for what is **displayed**; do not store less than what the analyzer needs to reproduce the scan.
3. **Older scans that have no stored body:** they cannot be loaded. For those rows, disable "Load into analyzer" with a tooltip "Original message wasn't saved for this scan", or load whatever fields exist (subject/sender) and show a notice. Never open an empty analyzer silently, which is the current bug.
4. Delete (single and "Clear my scans") must remove the stored message content too.

---

## L3 — Tests and verification `[DERIVED]`
1. Add an e2e test (Playwright or the repo's runner): create two scans with different subject/from/body/URLs/headers → in `/history` click ⋮ → **Load into analyzer** on the **older** one → assert the URL becomes `/analyzer` (param removed), **Subject, From, Reply-To, Body, URLs, Raw headers equal the stored values of that exact scan**, and that the other scan's data is not shown. Repeat using the expanded-row button. Repeat after a page refresh (form should not re-fill or break) and after Back/Forward.
2. Unit test the "scan not found" path and the "old scan without body" path.
3. Manual check on the 9 rows visible in the recording, including PG-2608 (the scaler.com email) and the three "Your Devin login code" rows: each loads its own subject and body.
4. `npm run build` and lint pass; confirm no regression in the page-transition behaviour from Spec #02 (shell does not remount, no blank flash) and that the history ⋮ menu's other items (Open explanation, Delete) still work.

### Acceptance
- Clicking **Load into analyzer** on any history row (⋮ menu or expanded button) opens `/analyzer` with **that email's** subject, sender, reply-to, body, URLs and headers already filled in, immediately and without the empty form flashing.
- No new scan is created by loading; a new scan is created only when the user presses the analyzer's scan button.
- Deleted/unavailable scans and old scans without stored content give a clear message, never an empty silent page.
- Works after refresh, back/forward and on repeated clicks (second click on a different row loads the second row, not the first).

---

## Final report (agent fills in)
Root cause (which of: handler never passes data / email not stored / state lost on remount / effect overwrites form / result panel not wired) with file and line references; files changed; migration notes with row counts; tests added and results; anything not done and why.

## Open points
| ID | Item | Default used |
|---|---|---|
| C1 | The recording has no narration, so the requirement comes from the written message only. | As written above |
| C2 | "Loaded into the analyzer" could mean fill the form only, or also show the result. | Fill the form and show the stored result labelled as such; no new scan until the user scans |
| C3 | Whether the original message text is stored is unknown from the recording. | L0 decides; L2 fixes storage if needed |
