# Vacation Budget

A mobile-first Progressive Web App for planning and tracking a vacation budget across
multiple cities, countries, and currencies — built to install on an iPhone home screen
and feel like a native app.

## Screenshots

_(placeholder — add screenshots of the Trips list, Dashboard, and Add Expense screens here)_

## Features

- Email/password authentication (Supabase Auth), with Row Level Security so every
  user can only ever see their own data
- Create multiple trips, each with its own destination, dates, base currency, and budget
- Fast mobile expense entry: large amount field, tappable category grid, custom
  categories, "remember my last category"
- Multi-currency expenses — enter an amount in any currency with a manual exchange
  rate; everything rolls up into the trip's base currency
- Dashboard with real budget math: spent, remaining, safe-to-spend-per-day, and a
  different view for upcoming / active / completed trips (the last one gets a full
  trip report: highest spending day, largest expense, most expensive category)
- Planned vs. actual budgets per category
- Charts (Recharts): spending by category, spending by day, planned vs. actual
- Installable on iPhone (Add to Home Screen), standalone display, offline-aware —
  a submitted expense that goes out while offline saves automatically once the
  connection returns, instead of failing silently

## Tech stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4
- **Backend:** Next.js Server Actions + Route Handlers
- **Database / Auth:** Supabase (PostgreSQL + Supabase Auth), Row Level Security
- **Forms / validation:** React Hook Form + Zod
- **Charts:** Recharts
- **Icons:** Lucide React
- **Deployment:** Railway

## Installation

```bash
git clone https://github.com/Moaawiyah/VacationBudget.git
cd VacationBudget
npm install
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in your own Supabase project's values:

```bash
cp .env.example .env.local
```

| Variable                        | Where to find it                                                       |
| ------------------------------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase Dashboard → Project Settings → Data API → **Project URL**     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page → Project API Keys → **anon public**                         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Same page → Project API Keys → **service_role** (secret — server-only) |
| `NEXT_PUBLIC_SITE_URL`          | `http://localhost:3000` locally; your real deployed URL in production  |

`.env.local` is gitignored and never committed. `SUPABASE_SERVICE_ROLE_KEY` is not
currently used by the running app (only by one-off admin scripts during development) —
it's reserved, and must never be exposed to the browser (no `NEXT_PUBLIC_` prefix).

## Supabase setup

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Copy the three values above into `.env.local`.
3. Run the database migrations (see below).
4. Authentication → **URL Configuration**: set Site URL to your app's URL (e.g.
   `http://localhost:3000` for local dev), and add `<your-url>/auth/confirm` to
   Redirect URLs. Add both the local and production URLs here once you deploy.

## Database setup

Run each file in `supabase/migrations/` **in order** via the Supabase Dashboard →
SQL Editor (paste the file's contents, click Run):

1. `0001_profiles.sql` — profiles table, auto-provisioned on signup, RLS
2. `0002_trips.sql` — trips table, RLS
3. `0003_categories.sql` — categories table (13 seeded system defaults + custom), RLS
4. `0004_expenses.sql` — expenses table, RLS
5. `0005_planned_budgets.sql` — planned_budgets table, RLS
6. `0006_expenses_update_policy_fix.sql` — tightens the expenses update RLS
   policy to also verify trip ownership, matching the insert policy
7. `0007_signup_identity.sql` — names and unique usernames, preserving existing accounts
8. `0008_trip_companions.sql` — invitation state and participant-aware trip access
9. `0009_authorization_hardening.sql` — trip roles enforced in RLS: members edit/delete
   only their own expenses, planned budgets are owner-only, invitees can only accept
   their own invitation, identity columns aren't user-writable
10. `0010_financial_integrity.sql` — the database derives converted amounts, locks a
    trip's currency once it has expenses, and mirrors the app's length limits
11. `0011_expense_idempotency.sql` — per-user request ids so a retried submission
    can't create a duplicate expense

**Apply 0009–0011 before deploying the matching app code** — it sends
`client_request_id`, which fails until 0011 exists.

The database tests (`tests/db/`) run these same migration files in PGlite, a real
Postgres compiled to WASM, signed in as different users — so RLS policies and
triggers are tested as written. `VB_MIGRATIONS_UPTO=0008 npx vitest run tests/db`
replays history to a given migration, to confirm a test fails on the schema a fix
replaced.

Every table has Row Level Security enabled — a user can only read or write their own
trips, expenses, categories, and planned budgets. `user_id` is always taken from the
authenticated session server-side, never trusted from the client.

## Running locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To test on an iPhone on the same WiFi network, find your machine's local IP
(`ipconfig getifaddr en0` on macOS) and add it to `allowedDevOrigins` in
`next.config.ts`, then visit `http://<your-ip>:3000` in Safari.

## Code quality

```bash
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run format       # Prettier (writes)
npm run format:check # Prettier (check only)
```

## Helper scripts

`scripts/` holds one-off helper and admin scripts, written in TypeScript and run with
npm — no separate toolchain. Node runs `.ts` files directly (type stripping), and
`npm run script` loads `.env.local` first so scripts can read the Supabase variables.
They're linted and type-checked with the rest of the repo, but never bundled into the
app or the Docker image.

```bash
npm run script -- scripts/hello.ts   # run a script with .env.local loaded
```

## Running tests

Not yet implemented — planned for the calculation functions in `lib/calculations/`
(remaining budget, currency conversion, safe daily spending, trip status, date-range
edge cases) using Vitest.

## Building

```bash
npm run build
npm run start
```

`next.config.ts` sets `output: "standalone"`, producing a self-contained server
bundle — this is what Railway runs in production.

## Running with Docker

The `Dockerfile` builds the same `output: "standalone"` bundle above into a
production-like image (multi-stage: install deps → `next build` → minimal
runtime running as a non-root user). Supabase stays external — the container
only ever holds the Next.js app, not a database.

`NEXT_PUBLIC_*` variables are inlined into the client bundle by Next.js at
build time, so they must be passed as `--build-arg`s, not just at `docker run`
time. `SUPABASE_SERVICE_ROLE_KEY` is server-only and is never baked into the
image — it's supplied at container start via `--env-file`.

Build:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=$(grep -oP '(?<=^NEXT_PUBLIC_SUPABASE_URL=).*' .env.local) \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep -oP '(?<=^NEXT_PUBLIC_SUPABASE_ANON_KEY=).*' .env.local) \
  --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
  -t vacation-budget .
```

Run:

```bash
docker run --env-file .env.local -p 3000:3000 vacation-budget
```

Open `http://localhost:3000`.

Or with Compose, which reads the same build args from `.env.local` for you
(Compose only auto-loads a file literally named `.env`, so pass `--env-file`
explicitly):

```bash
docker compose --env-file .env.local up --build
```

- `npm run dev` — normal local development, hot reload, no container.
- **Docker** — a reproducible, production-like build/run of the app locally.
- **Railway** — where the container actually runs in production.
- **Supabase** — external managed Postgres/auth; never runs inside Docker here.

## Deploying to Railway

1. Push this repo to GitHub (already connected, if you cloned it as-is).
2. At [railway.app](https://railway.app), **New Project** → **Deploy from GitHub repo**
   → select this repository. Railway detects the `Dockerfile` at the repo root and
   builds from it (this replaces the previous Nixpacks auto-detection now that a
   Dockerfile exists).
3. In the Railway project's **Variables** tab, add the same four environment variables
   from `.env.local` above. Set `NEXT_PUBLIC_SITE_URL` to the domain Railway assigns
   once the first deploy finishes (e.g. `https://your-app.up.railway.app`). Railway
   forwards service variables as both build args and runtime env vars for Dockerfile
   builds, so no separate "build-time variables" step should be needed — confirm this
   in the Railway build logs on first deploy.
4. Back in Supabase, add that same Railway URL (and `<url>/auth/confirm`) to
   Authentication → URL Configuration → Redirect URLs.
5. Railway sets `PORT` itself; the image already listens on `0.0.0.0:$PORT` (via
   `server.js` from the standalone build), so no port config is needed.
6. Every push to the connected branch redeploys automatically.

## Installing as a PWA on iPhone

1. Open the deployed URL in **Safari** on iPhone (must be Safari, not another browser).
2. Tap the **Share** button, scroll down, tap **Add to Home Screen**.
3. Open the app from the home screen icon — it launches full-screen, no browser
   chrome, with its own icon and splash color.

### Signup identity and username login

Apply `supabase/migrations/0007_signup_identity.sql` before deploying the updated signup form. It adds first name, surname, and a unique lowercase username to profiles and extends the existing signup trigger. Existing accounts keep their email login and nullable identity fields. New signups require all five fields.

Set `SUPABASE_SERVICE_ROLE_KEY` on the app server for private username-to-email resolution. Login still authenticates the password through Supabase Auth. The key and resolved email are never returned to the browser. Usernames accept 3–30 ASCII letters, digits, underscores, dots, or hyphens and are case-insensitive.
