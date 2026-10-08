# Deployment preparation — no deployment performed

This is the reviewable handoff for deploying after the local review. Do not run the production changes until the dashboard has been reviewed locally and deployment has been explicitly authorized.

## Compatibility

- The existing Compose project name, PostgreSQL volume, database schema and external Caddy network are retained.
- The worker still queries Notion and updates PostgreSQL with the existing transaction/advisory-lock/deletion guard.
- The web service uses read-only database sessions. Worker sessions remain writable, and web auth settings are explicitly cleared from the worker environment.
- The image uses the committed lockfile and `npm ci`; no `.env*` file is included in its build context.
- `GIMM_DEMO_MODE` is not passed by Compose. Real database failures produce an unavailable-data state, never fabricated performance.

## Before changing the server

1. Review the [local Docker demo](local-preview.md), including login, mobile journal, calendar and analytics. It uses the production web image with isolated demo settings; never use `compose.local.yaml` on the server.
2. Provision your real single-user auth configuration following [authentication.md](authentication.md). Keep the full scrypt hash single-quoted in a Compose `.env`; keep the session secret private. There are no valid production defaults.
3. Verify the existing Caddy network exists and the domain resolves to the server. Keep HTTPS enabled: production session cookies are Secure. If existing Caddy Basic Auth is enabled, it adds a separate login prompt; change that only deliberately.
4. Take a backup using the existing backup script and verify a restore against a disposable database. Do not remove or recreate the existing production volume.

## Build and rollout, after authorization

In the existing repository checkout on the server, first check `git status --short`. If there are local changes, preserve and review them before continuing; do not reset or clean the checkout. Take the database backup before rollout. Pull the published branch without creating an unexpected merge:

```sh
git switch main
git pull --ff-only origin main
cd gimm-trading-dashboard
```

The `cd` assumes you started at the repository root. Use the existing checkout path rather than creating a second Compose deployment. For the account password, Node does not need to be installed on the server: run the existing hidden-input hash tool in a temporary Docker container (no environment file is loaded):

```sh
docker run --rm -it --mount "type=bind,source=$PWD,target=/source,readonly" --workdir /source node:22-alpine node --experimental-strip-types scripts/hash-password.ts
openssl rand -hex 32
nano .env
```

Add `AUTH_USERNAME`, the full single-quoted `AUTH_PASSWORD_HASH` printed by the tool, and `AUTH_SECRET` from OpenSSL to the existing `.env`, preserving all existing database/Notion values. Do not paste secrets into chat or commit this file. Keep the existing HTTPS Caddy route to `trading-web:3000`; existing Basic Auth may cause an additional prompt. If this route is not already configured, validate and reload the existing Caddy configuration separately before using the app login.

Run from the application directory on the server, using the existing private environment file. These commands are documentation only and have not been executed remotely:

```sh
docker compose config --quiet
docker compose build web worker
docker compose up -d --no-deps web worker
docker compose ps
```

The rollout command leaves the database service alone and requires the existing database to be running. Do not use `down -v`. Keep the previous web and worker images available so they can be restored if needed. The current changes do not require a schema migration.

## Verify after rollout

- Unauthenticated `/dashboard` requests redirect to `/login` and expose no trades.
- Correct credentials redirect to the requested dashboard view; incorrect credentials remain generic. Logout returns to login and clears the browser cookie.
- Web health is healthy when the database is reachable. Check the dashboard's last-sync status as well: database connectivity alone does not prove a fresh Notion synchronization.
- Confirm the worker completes a normal synchronization and does not report deletion-safety warnings. Review logs locally rather than posting credentials or detailed source data into a chat.
- Review actual account/period filters, timezone, calendar dates, trade counts and financial totals against a known journal sample.

## Outstanding infrastructure validation

The production web image was built successfully on local Docker, passed its login health check, and passed all nine browser check groups against the running container (including login/logout, charts, journal/CSV, calendar, analytics and 390px/320px mobile layouts). This demo uses no database or Notion connection. Disposable-PostgreSQL worker integration and real server/Caddy compatibility still require validation. Live synchronization and production data are not used for local UI testing. Before scaling the web service beyond one process, replace the in-memory login limiter with a shared store and decide whether per-session revocation is required.
