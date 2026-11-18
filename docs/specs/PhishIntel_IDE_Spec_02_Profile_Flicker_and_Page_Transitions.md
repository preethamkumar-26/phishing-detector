# PhishIntel — IDE Implementation Spec #02
## Profile-page flicker bug + smooth page transitions

**Source:** `20261118-0806-29_7798527.mp4` (2 min 57 s, 1920×1200, narrated).
**Method:** audio transcribed offline (Whisper small.en), frames sampled up to 10 fps around each page change, key frames read visually.
**Relation to Spec #01:** this extends `PhishIntel_IDE_Implementation_Spec.md`. The user opens with "*See also, fix this small bug…*", so treat it as additional work. Rules in Spec #01 Section 0 (one task at a time, discover don't assume, no fabricated data, one commit per task, final report) still apply.
**Repo:** `phishing-detector/` → frontend `phishintel-ai/` (Next.js 16.4.6), `backend/`. Run: `cd phishintel-ai && npm run dev` → `http://localhost:3000`.

Tags: `[SPOKEN]` = said in the recording (a requirement). `[DERIVED]` = seen on screen, not spoken (lower authority; spoken items win on conflict).

---

## 0. What changed since Spec #01 (observed in this recording)
The app now shows real data (8 scans, Scan history equals Overview counts, Mail sources has an "Other / unknown" row, ablation became "PAHF-Net modality contributions"). Do **not** redo Spec #01 work; only verify you are not regressing it.

---

## Task index (execute in order)

| # | Task | Tag |
|---|---|---|
| P0 | Baseline + reproduce both bugs with measurements | DERIVED |
| P1 | Profile page flashes "Guest / Sign in / Register" before the real account appears | SPOKEN |
| P2 | Page-to-page navigation looks like a full-tab reload; replace with smooth in-content transition on all six sections | SPOKEN |
| P3 | Clear the Next.js dev "1 Issue" error badge | DERIVED |
| P4 | Final verification and report | DERIVED |

---

## P0 — Baseline `[DERIVED]`

1. `git status` clean; `git checkout -b fix/profile-flicker-and-page-transitions`.
2. Reproduce both bugs in a **fresh browser tab**, logged in, after `npm run dev` and Spec #01's warm-up (so compile time does not mask the bug).
3. Record a screen capture or use the Playwright script from P4 to capture frames at ≥ 30 fps while clicking: Scan history → Profile, Overview → Email analyzer, Explainability → Overview. Save the evidence next to the PR description.
4. Run the page-load check used later in P2: in the console set `window.__shellMarker = 1` on first load; after each in-app navigation `window.__shellMarker` must still be `1`. If it becomes `undefined`, the browser did a **real document reload** (root cause class A). If it stays `1`, navigation is client-side and the "reload feel" comes from remounting/skeletons (root cause class B).
5. Note the Next.js dev overlay state (bottom-right badge). In the recording it shows a red **"1 Issue"** badge on Profile, Overview, Explainability and Scan history frames.

---

## P1 — Profile page shows Guest / Sign in / Register for a moment `[SPOKEN]`

### What the user said (cleaned)
When navigating to the **Profile** section, a **Sign in** option and a **Register** option appear and then go away, although the account is already logged in. It looks like a rendering process or rendering bug ("*I don't know clearly*"). It keeps happening whenever the user goes to Profile: the sign-in/register option comes, then goes. **Fix that bug.**

### What the frames show
- Navigating from Scan history to `/profile` first paints a **full-content skeleton** (`evidence_02/02_…`).
- Then the page paints the **guest state** (`evidence_02/01_profile_guest_state_flash_t18s.jpg`): name **"Guest Analyst"**, badge **"Local workstation mode"**, sub-text **"No authenticated identity connected"**, orange **"Sign in / Register"** button, **User ID `local_workstation_user`**, **Account status "Unauthenticated Guest"**, **Member since / Last profile update "Not available"**.
- A fraction of a second later the real state appears (`evidence_02/05_…`): **"Preetham Kumar · Active analyst"**, an **Edit profile** button, a real `usr_…` User ID, **"Verified Analyst · Active"**, and real dates.
- The header avatar chip "PK" is already correct during the glitch, so the user *is* authenticated; only the Profile view starts from the wrong default.

### Diagnosis (do this first, report the result)
The component renders a **default guest value before the session/user is resolved**. Find the cause among:
1. A context/provider whose initial state is `guest`/`null` and is filled in a `useEffect` after first paint (check `PhishGuardContext.tsx` *(verify)* and any `useAuth`/`useUser`/`useProfile` hook).
2. The Profile page fetching the user client-side on mount and rendering a fallback (`local_workstation_user`, "Unauthenticated Guest") while `data === undefined`.
3. The provider living **inside** the route (remounting on every navigation) instead of in the root layout, so state resets each time.
4. A **hydration mismatch** (server renders guest, client renders user). The red "1 Issue" badge may be exactly this; read it (see P3).
Search: `grep -rniE "Guest Analyst|local_workstation_user|Unauthenticated Guest|Sign in / Register|Local workstation mode|No authenticated identity" phishintel-ai backend --exclude-dir=node_modules --exclude-dir=.next`.

### Implement
1. **Three explicit states, never a default guess:** `status: "loading" | "authenticated" | "unauthenticated"`. Guest UI renders **only** when `status === "unauthenticated"` has been confirmed by the session source. While `loading`, render a **profile-shaped skeleton** (same layout and dimensions as the real card: avatar block, name line, account-details rows, left section menu) and nothing that implies a state.
2. **Resolve the session before first paint where possible:** read the session/user on the server (cookie/session → user record in the SQLite store) in the root layout or a server component and pass it as `initialUser` into the provider. The client provider is initialised from it, so there is no empty first render.
3. **Mount the provider once, in the root layout**, above all routes, so it is never recreated by navigation. Cache the user in memory for the session; revalidate in the background without clearing it.
4. If client fetching is unavoidable, use a cache with `initialData`/stale-while-revalidate semantics (whatever the repo already uses; do not add a new library just for this) so returning to Profile shows the last known user instantly.
5. Remove the guest fallback strings from any code path reachable while `loading`. Keep the guest view for a genuinely logged-out session.
6. Apply the same rule everywhere the identity is shown: header avatar chip, Settings, Security & credentials, Edit profile, Account activity. None may flash a guest state.
7. Make the profile skeleton and the loaded card the **same height** to avoid layout shift.

### Acceptance (measured, not eyeballed)
- Automated check (Playwright or equivalent): install a `MutationObserver` at navigation start, navigate to `/profile` 20 times (via nav click, via direct URL, via reload, via back/forward), and assert the document text **never contains** `Guest Analyst`, `Sign in / Register`, `Unauthenticated Guest`, `local_workstation_user`, or `Local workstation mode` while logged in.
- Frame capture at ≥ 30 fps of 10 navigations shows no frame with the guest layout.
- Logged-out session (clear the session): Profile shows the guest view with Sign in / Register, no console errors.
- No hydration warning in the console on `/profile`.

---

## P2 — Navigation feels like a full reload; add smooth transitions `[SPOKEN]`

### What the user said (cleaned)
Navigating from **Overview to Email analyzer** (and similarly between the other pages) looks like the **whole web page reloads completely** and then comes in. *"I don't want it like that — the full web-size movement."* The change should be a **smooth animation inside only** (inside the content). It seems to be **reloading and rendering the full tab entirely**. "*Why is it moving like that, is it a bug?*" **Fix it, and also add a smooth animation effect in the navigation**: not instant, not a hard cut, but a **smooth transition from one section to another section, across all six sections.**

### What the frames show
`evidence_02/03_navigation_sequence_explainability_to_overview_t134s.jpg` (Explainability → Overview, ~100 ms apart):
1. old page fully visible;
2. the **entire content area is replaced by a blank grey skeleton**;
3. the new page appears abruptly (a faded intermediate frame, then fully drawn).
The header and navbar stay in place, but the user perceives the content swap as a full reload because the whole content region blanks and redraws. Scan history ⇄ Profile shows the same blank-skeleton step.

### Diagnosis (report the result)
- Run the P0 `window.__shellMarker` check. If it disappears on navigation, something triggers a real document load (plain `<a href>`, `window.location`, `router.refresh()` loops, a `key` on the root, a layout/provider that is not shared). Fix those first: all six nav items and every internal link must use `next/link` or `router.push`.
- If client-side, the blank step is the route-level `loading.tsx`/Suspense fallback replacing the **whole** content region instantly for every route change, even when data is already cached. Spec #01 T1 suggested route-level skeletons; keep the idea but change *when and how* it shows (below).
- Check whether the shell (header, navbar, background, WebGL liquid nav) is part of the per-route tree. It must be in the root layout (`AppShell`) so it never unmounts.

### Implement
1. **Shell stays mounted.** Header, navbar pill, background and provider live in the root layout; only the routed content region changes. Verify DOM node identity persists (see acceptance).
2. **No blank flash.** Keep the previous page visible until the next route is ready: wrap navigation in `startTransition`/`useTransition` (or the framework's equivalent) so the old content stays on screen during the transition. Show a skeleton **only if loading exceeds ~200 ms**, and make it match the destination page layout (never a generic full-screen blank).
3. **Smooth in-content transition on all six routes:** Overview, Email analyzer, Explainability, Evaluation, Scan history, Profile.
   - Implement with `app/template.tsx` (re-mounts per navigation) or the project's existing animation library; if none exists use CSS only.
   - Enter animation on the content wrapper only: opacity `0 → 1` and translateY `8–12 px → 0`, **220–300 ms**, `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out).
   - Optional exit/overlap using the browser View Transitions API **only if** the installed Next.js version documents support for it; otherwise enter-only. Do not enable an experimental flag unless you confirm it exists in 16.4.6 (Spec #01 T1: unstable flags stay removed).
   - Animate **only `transform` and `opacity`** (GPU-friendly). No animation of layout properties, no height animations on the page wrapper.
   - Optional polish `[DERIVED]`: let the active-tab highlight in the nav pill glide to the new item instead of jumping.
4. **Direction-agnostic and universal:** works for any pair of routes, nav clicks, in-page links ("Full history", "Scan email", "Open explanation", "Load into analyzer"), and browser back/forward.
5. **`prefers-reduced-motion: reduce`:** replace motion with a short opacity fade (≤ 120 ms) or none.
6. **Do not regress performance:** keep the WebGL navbar idle-sleep behaviour and the route prefetching from the earlier commit; transitions must not re-trigger route compile or heavy re-render of the shell.
7. Make sure a new page's initial data does not cause a second visible re-render after the animation (no "content pops after fade"): fetch with the transition or render skeleton rows inside the page's own cards.

### Acceptance (measured)
- `window.__shellMarker` and a `data-shell` attribute set on the navbar DOM node **survive** every navigation (no document reload, shell not remounted).
- Frame capture ≥ 30 fps across all 15 route pairs: no frame shows an empty/blank content region when the destination data is cached or loads < 200 ms; the destination fades/slides in over ~250 ms with intermediate frames visible.
- Back/forward buttons animate the same way.
- Reduced-motion setting disables the movement.
- Lighthouse/Performance trace: no long task > 50 ms attributable to the transition; animations run on the compositor.

---

## P3 — Dev "1 Issue" badge `[DERIVED]`

In every frame of this recording the Next.js dev indicator at bottom-right is a red **"1 Issue"** badge (in the earlier recording it was the plain "N" icon). It persisted across Profile, Overview, Explainability and Scan history.
1. Click it, read the error, and fix the cause. Check for a **hydration mismatch** first (it would explain P1) and for runtime warnings from the new animation code after P2.
2. Report the original message text.
**Acceptance:** after the fixes the badge returns to the neutral state on all six routes, and the browser console shows no errors or hydration warnings during a full navigation walk.

---

## P4 — Verification and report `[DERIVED]`

1. Add `tests/e2e/navigation-and-profile.spec.ts` (Playwright, or the test runner already in the repo) covering: the 20× Profile guest-string check (P1), shell persistence and no-blank-flash (P2), reduced motion, back/forward.
2. `npm run build` passes, lint passes, and Spec #01's `check:legacy` (if present) still passes.
3. Final report using Spec #01 Appendix C format, plus: root cause for P1 (which of classes 1–4), root cause for P2 (class A or B), the P3 error text, and before/after frame evidence.

---

## Observations not requested (report to the user; do not act on them without approval)

| ID | Observation | Why it matters |
|---|---|---|
| O1 | Scan history shows three scans of "Your Devin login code – 476247" from `no-reply@cognition.ai`, all **PHISHING** with P_phish **0.164** and threshold **T = 0.05** on engine "local preview", while older rows (e.g. the November statement) use **T = 0.50** (`evidence_02/06_…`). | A login-code email from a legitimate service is flagged at P = 0.164 only because the threshold is 0.05. Find where 0.05 comes from, why different scans use different thresholds, and whether this is intended calibration. Report; threshold policy is the user's decision. |
| O2 | Top indicators labels are truncated ("PAHF-Net classific…", "URL Domain Indica…", "Header Inconsisten…"). | Allow wrapping or a tooltip so full names are readable. Minor polish. |
| O3 | Mail sources shows Outlook/Gmail/Yahoo/MAPI = 0 and Other/unknown = 8. | Consistent with Spec #01 T7 for pasted text without headers; not a bug unless header-bearing `.eml` files also land in "Other". |

---

## Traceability: every spoken instruction → task

| Time | What was said (cleaned) | Task |
|---|---|---|
| 0:00 | "See also, fix this small bug-like thing: when I navigate to the Profile section there is a rendering process." | P1 |
| 0:12–0:36 | When going to Profile, the sign-in option comes, "although the account was logged in". | P1 (guest state while authenticated) |
| 0:36–1:00 | "It is a rendering process or rendering bug, I don't know clearly." | P1 diagnosis |
| 1:00–1:20 | Each time it opens Profile, the **sign in** and **register** options come and go. "**So fix that bug.**" | P1 |
| 1:36–1:50 | Navigating from Overview to Email analyzer (and the others), the whole web page seems to reload completely and then comes in. | P2 |
| 1:50–2:10 | "I don't want like that, the full web-size movement. It should have a smooth animation **inside only**." | P2 (animate content only, shell stays) |
| 2:10–2:30 | "It is reloading and rendering the full tab entirely. Why is it moving like that, the bug or something? **Fix it.**" | P2 diagnosis and fix |
| 2:30–2:57 | "Also add a smooth animation effect in the navigation, not instant, not a command-go; a **smooth transition from one section to another section**, **across all these six sections**." | P2 (six routes, smooth transition) |

## Assumptions and open points

| ID | Item | Default used |
|---|---|---|
| B1 | "Sign in / Register" wording comes from the audio *and* is confirmed on screen (`Sign in / Register` button). | Confirmed |
| B2 | A stretch of speech around 1:20–1:35 was unintelligible noise ("and Vinci…", tabs being switched). No instruction was recoverable there. | Nothing assumed; if the user said something there, ask them |
| B3 | "Command go like structured" (≈2:40) is a transcription artefact for "instant"; the meaning (not instant, smooth) is clear from context. | Smooth transition |
| B4 | "Six sections" = the six nav items: Overview, Email analyzer, Explainability, Evaluation, Scan history, Profile. | As listed |
| B5 | The user is logged in as the local analyst account; there is no separate login page in the recording, so Sign in / Register behaviour for a real logged-out session is unspecified. | Keep guest view for confirmed logged-out sessions only |

---

## Appendix A — Cleaned machine transcript (verbatim content, lightly punctuated)

> **0:00** See also, fix this small bug-like thing. When I am navigating to the Profile section, there is a rendering process, rendering time, or I don't know. See, when I'm going to the Profile section, see, it is here, the sign in, or it is coming. It means it is starting like that. See on this and this, here it is coming, although the account was logged in, although the account was logged in. It is a rendering process, or rendering bug, I don't know clearly. When I am navigating to the Profile section, it comes here, here it comes. It is coming, the sign in option, register option, and going like that. So fix that bug.
> **1:36** When we are navigating from Overview to Email analyzer and the others, I think the tab, the web, is reloading completely, then it is going. Then it is going. I don't want like that. See, from this to this, the full web-size movement. It should have a smooth animation inside only, not it. I think it is reloading. It is reloading and rendering the full tab entirely. Why is it moving like the bug or something? So fix it also, and also add a smooth animation effect in the navigation, like not instant, not command-go like structured, but a smooth transition effect from one section to another section. Across all these six sections, add this navigation animation, also smooth the animation.

## Appendix B — Reference frames (`evidence_02/`, also `evidence_02_frames.zip`)

| File | Shows |
|---|---|
| `01_profile_guest_state_flash_t18s.jpg` | Guest Analyst / Sign in / Register state flashing on Profile |
| `02_profile_skeleton_before_content_t18s.jpg` | Full-content skeleton during navigation to Profile |
| `03_navigation_sequence_explainability_to_overview_t134s.jpg` | Nine-frame sequence of an Explainability → Overview navigation |
| `04_overview_after_navigation_t137s.jpg` | Overview with live data after navigation |
| `05_profile_settled_authenticated_state_t16s.jpg` | Correct authenticated Profile state |
| `06_scan_history_threshold_0_05_t1s.jpg` | Scan history with T = 0.05 rows (observation O1) |
