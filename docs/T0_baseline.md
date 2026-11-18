# T0 — Baseline Documentation

**Date:** 2026-11-18
**Branch:** `fix/legacy-purge-and-functional-ui`

## 1. System Environment
- **Node.js:** v24.15.0
- **Next.js:** 16.4.6
- **React:** 19.3.0
- **HeroUI:** @heroui/react 3.2.7
- **Database Engine:** Node 22+ built-in `node:sqlite` (DatabaseSync, WAL mode)
- **Database Path:** `phishintel-ai/.data/phishintel.db`

## 2. Database Schema
- `users`: `id`, `email`, `name`, `password_hash`, `salt`, `phone`, `organization`, `designation`, `bio`, `avatar_url`, `created_at`, `updated_at`
- `user_preferences`: `user_id`, `theme`, `email_notifications`, `security_alerts`, `scan_completion_notifications`, `product_updates`, `time_zone`, `language`, `default_analysis_view`, `show_explanatory_details`, `updated_at`
- `account_activity`: `id`, `user_id`, `event_type`, `label`, `outcome`, `details`, `timestamp`
- `user_sessions`: `id`, `user_id`, `token`, `user_agent`, `ip_hint`, `created_at`, `last_active_at`
- `user_scans`: `id`, `user_id`, `scan_id`, `subject`, `prediction`, `confidence`, `created_at`

## 3. Core Component Locations
- **Scorer (PAHF-Net availability-gated engine):** `phishintel-ai/src/context/PhishGuardContext.tsx` (`computePahfNetAnalysis`)
- **PDF Export Generator:** `phishintel-ai/src/lib/exportHistoryPdf.ts` (`exportHistoryPdf`)
- **Scan History:** `phishintel-ai/src/app/(app)/history/page.tsx`
- **Explainability:** `phishintel-ai/src/app/(app)/explainability/page.tsx`
- **Dashboard / Overview:** `phishintel-ai/src/app/(app)/dashboard/page.tsx`
- **Evaluation:** `phishintel-ai/src/app/(app)/evaluation/page.tsx`
- **Application Shell & Nav:** `phishintel-ai/src/components/layout/AppShell.tsx`, `phishintel-ai/src/components/ui/liquid-glass-navbar.tsx`

## 4. Route Response Time Baseline (Dev Server)
| Route | Baseline Latency | Status Code | Notes |
|---|---|---|---|
| `/dashboard` | 336 ms | 200 | Initial dev hit |
| `/analyzer` | 188 ms | 200 | Interactive |
| `/explainability` | 171 ms | 200 | Post-fix verification |
| `/analytics` (Evaluation) | 301 ms | 200 | Empty state ready |
| `/history` | 327 ms | 200 | Paginated history table |
| `/profile` | 325 ms | 200 | SQLite WAL identity |
