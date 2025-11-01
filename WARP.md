# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- This repo currently ships a prebuilt frontend (see manual-deployment-package/) and a minimal PHP API that talks to Supabase via its REST interface.
- Node-based build config files (package.json, vite.config.ts, etc.) are present but empty; local JS build/lint/test are not wired up in this snapshot.

Common commands
- Run the PHP API locally (serves /api/*.php under http://localhost:8000):
  - From the repo root: `php -S localhost:8000 -t .`
  - Or only the api folder: `php -S localhost:8000 -t api`

- Verify schedules search (dynamic/admin-priced views in Supabase):
  - `curl "http://localhost:8000/api/list-schedules.php?origin=Kalpa&destination=Delhi&hours=5"`
  - Use `hours=2` to hit the 2-hour pricing view.

- Admin pricing (requires header X-Admin-Token, value from ADMIN_TOKEN in .env):
  - Get for a route:
    - `curl -H "X-Admin-Token: {{ADMIN_TOKEN}}" "http://localhost:8000/api/admin-pricing.php?origin=Kalpa&destination=Delhi"`
  - Upsert allowed fares and active fare:
    - `curl -X POST -H "Content-Type: application/json" -H "X-Admin-Token: {{ADMIN_TOKEN}}" -d '{"origin":"Kalpa","destination":"Delhi","allowed_fares":[999,1199,1499,1799],"active_fare":1499,"is_enabled":true}' http://localhost:8000/api/admin-pricing.php`

- Record a booking (creates bookings + payments rows):
  - `curl -X POST -H "Content-Type: application/json" -d '{"schedule_id":"<uuid>","travel_date":"2025-11-05","seat_numbers":["A1","A2"],"total_amount":2998,"passenger_name":"John Doe","passenger_email":"john@example.com","passenger_phone":"9999999999","payment_method":"upi"}' http://localhost:8000/api/record-booking.php`

- Deploy (GitHub Actions):
  - Push to main triggers .github/workflows/deploy.yml. It will:
    - Install deps (`npm ci`) and attempt `npm run build` if a valid package.json is added in the future.
    - Deploy `dist/` if present; otherwise fall back to `manual-deployment-package/urbanbus-enhanced.tar.gz`.
    - Rsync `api/` and optional admin UI files to the remote.
  - Required secrets: SSH_HOST, SSH_PORT, SSH_USERNAME, SSH_PASSWORD (or SSH_PRIVATE_KEY), DEPLOY_PATH, and optionally ENV_PRODUCTION (written to remote .env).

- Manual static serving of the prebuilt UI (optional):
  - Serve the packaged frontend locally for quick inspection:
    - Extract `manual-deployment-package/urbanbus-enhanced.tar.gz` and serve with any static server (e.g., `python -m http.server` from the extracted directory).

Build/lint/tests
- package.json is empty; there are no working npm scripts, linters, or tests in this snapshot.
- If scripts are added later, prefer: install (`npm ci`), dev (`npm run dev`), build (`npm run build`), lint (`npm run lint`), test (`npm test`), and single test via framework-specific filtering.

Architecture and structure
- Frontend (prebuilt):
  - `manual-deployment-package/` contains built assets (`urbanbus-enhanced.tar.gz`) and a minimal admin UI (`admin.html`, `admin.js`). The pipeline deploys `dist/` when available or falls back to this package.

- PHP API (server-only):
  - `api/supabase_client.php` — tiny Supabase REST client. Loads `.env` from repo root and requires:
    - SUPABASE_URL
    - SUPABASE_SERVICE_ROLE (service role key; used only on the server)
  - `api/list-schedules.php` — GET endpoint that proxies to Supabase views to return schedules with effective current_price. Supports `hours=2|5` to select 2h vs 5h pricing.
  - `api/admin-pricing.php` — Admin-only CRUD/upsert for per-route fare control. Requires `X-Admin-Token` (ADMIN_TOKEN in `.env`). Uses `route_admin_pricing` and creates a route if missing.
  - `api/record-booking.php` — Inserts into `bookings` and `payments`, capturing `applied_price` and `pricing_mode` at the time of booking if not provided.

- Database (Supabase/Postgres):
  - Migrations under `supabase/migrations/` define the full schema and pricing logic.
    - `20251005172619_create_urbanbus_complete_schema.sql` — core tables (operators, buses, routes, schedules, bookings, payments, offers, rewards, tracking) and RLS policies.
    - `20251023100000_add_dynamic_pricing.sql` and `20251023142130_dynamic_pricing_2h.sql` — deterministic dynamic pricing that changes by time buckets (5h and 2h); exposes `bus_schedules_priced*` and `search_schedules_priced*` views.
    - `20251026152000_admin_pricing.sql` — admin override via `route_admin_pricing`, adds `applied_price` and `pricing_mode` to `bookings`, and creates `search_schedules_effective_priced*` effective-price views consumed by the API.

- CI/CD:
  - `.github/workflows/deploy.yml` handles remote deployment over SSH, configures Nginx/Apache vhosts to point the domain to DEPLOY_PATH, and uploads `.env` if provided via secrets.

Configuration
- Create a `.env` at the repo root for local API runs:
  - SUPABASE_URL=...
  - SUPABASE_SERVICE_ROLE=...
  - ADMIN_TOKEN=...
- The PHP bootstrap autoloads `.env` and exposes values via `getenv()`.

Notes for future updates
- If the frontend source is restored, add proper `package.json` scripts (dev/build/lint/test) and remove the fallback to `manual-deployment-package` in the deploy pipeline once `dist/` is produced by CI.