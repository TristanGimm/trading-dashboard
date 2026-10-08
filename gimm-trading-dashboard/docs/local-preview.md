# Local preview and interface checks

## Test the production image locally with Docker

From the application directory, with Docker running:

```sh
docker compose --env-file /dev/null -f compose.local.yaml up -d --build --wait
```

Open http://127.0.0.1:3100/login. Username: `preview`; password: `gimm-local-preview-only`.

This separate `gimm-local-demo` project builds the real production web image, binds only to localhost, and uses synthetic trades. It does not load `.env`, start a Notion worker, connect to any database, or reuse production networks/volumes. Its fixed credentials and secret are exclusively for this local demo. The production `compose.yaml` remains separate and requires private credentials.

```sh
# Check health / run the complete UI checks against the container
docker compose --env-file /dev/null -f compose.local.yaml ps
npm run test:browser -- --docker
# Stop this demo only when finished
docker compose --env-file /dev/null -f compose.local.yaml stop
```

The browser checks require Playwright Chromium as described below. The Docker demo intentionally has no database-health endpoint guarantee; its container health checks the login page. A real-data local integration test requires a separate disposable database and test fixtures.

## Explore the new dashboard

From the `gimm-trading-dashboard` directory:

```sh
npm ci
npm run preview
```

The command builds an isolated copy of the app, prints a local `/login` address and keeps the server running until Ctrl+C. It does not read `.env*` files or connect to PostgreSQL or Notion. It needs an installed Node.js 22.18+ and permission to listen on localhost.

Use these **local demo credentials only**:

- Username: `preview`
- Password: `gimm-local-preview-only`

The demo is bound to `127.0.0.1`, uses synthetic trades, remains behind the login, and is marked as a demo in the interface. These values are not real account credentials and are not configured by Docker Compose. When stopped normally, the runner removes its own temporary build and runtime copies. Do not use these credentials for a real deployment.

The normal production application still requires your own auth settings and displays actual synchronized data. There is no automatic fallback to demo results when the database is unavailable.

## Available views

- **Overview:** five performance metrics, real equity/balance/drawdown charts, outcome breakdown, setup/session highlights, daily P&L, calendar and recent trades.
- **Trade journal:** all matching trades, text search, outcome/instrument filters, date/P&L sorting, pagination, CSV export and keyboard-accessible trade details. CSV export includes every filtered result, not just the visible page, and escapes spreadsheet formulas in journal text.
- **Trading calendar:** month navigation, timezone-aware daily P&L, trade counts and drilldown to the trades for a selected day.
- **Analytics:** setup/confluence comparisons, minimum sample filters, win-rate/trade-count/average-P&L modes and entry-time breakdowns. Highlights require at least five closed trades per setup/session; they are descriptive, not predictive scores.

Account and date filters apply across all four views. Recorded-balance comparison requires a single selected account: separate account balances are not presented as one consolidated equity curve. Views and filters are preserved in shareable dashboard URLs. The mobile navigation exposes the same views. Reduced-motion preferences disable interface and chart animations.

## Automated checks

```sh
npm run typecheck
npm test
npm run build
npm run test:smoke
npx playwright install chromium --only-shell
npm run test:browser
```

Run builds in an isolated checkout without real `.env` files if you want the same separation used during this review. `preview` handles this isolation automatically; the normal Next.js build command follows Next.js conventions and can load environment files in its project directory.

By default, the smoke and browser checks consume an existing standalone build, copy it to a temporary runtime, use test credentials and an unreachable database, and shut down their own servers afterward. Browser checks require Playwright's headless Chromium. Playwright is a development dependency and does not add a paid service or a browser requirement for your users.

The browser script checks desktop login, chart modes, journal search/filter/reset/export/pagination, native dialog focus behavior, calendar drilldown, analytics controls, 390px/320px mobile layouts, account/period navigation and logout. It writes screenshots and a JSON report under the ignored `artifacts/` directory. To reuse an already built app manually: `npm run preview -- --built`. For the full isolated copy/build/browser workflow without loading your real environment, run `npm run test:browser -- --fresh`.

The interface was inspired by professional journal workflows, including [TradeZella's journal and performance calendar](https://www.tradezella.com/trading-journal), and uses its own GIMM design. It does not implement broker execution, market-data feeds, trade replay, AI coaching or every commercial TradeZella feature. There is no subscription dependency in this app; your existing hosting and source-service costs remain separate.
