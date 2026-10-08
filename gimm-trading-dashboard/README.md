# Gimm Trading Dashboard

A private, self-hosted dashboard for analyzing trades from my Notion Trading Journal. Tech-stack is very simple due to limited time and no need for something too extraordinary.

**The idea is simple:** Record trades in Notion as usual. The dashboard automatically turns that data into performance statistics and interactive charts. No manual spreadsheet exports or chart updates. One big benefit is that all is automatically synchronized. 

## How it works

**Notion Trading Journal → Sync Worker → PostgreSQL → Trading Dashboard**

- **Notion:** The source of truth where trades are recorded and edited.
- **Sync Worker:** Automatically retrieves new and updated trades.
- **PostgreSQL:** Stores the data for analysis.
- **Dashboard:** Displays the latest available statistics and charts.

New trades typically appear within a few minutes.

## Features

- **Performance Overview:** Net P&L, win rate, profit factor, average trade and drawdown and other data metrics.
- **Equity Curves:** Realized trading P&L and account balance.
- **Setup & Confluence Analytics:** Compare trading setups, DXY, liquidity sweeps and all of my other confirmations.
- **Trading Times:** Analyze results by session, weekday and entry hour. (Time based ICT)
- **Trade History:** Review and filter all of my trades of all past years.

All analytics are calculated from the actual trading journal data.

## Tech Stack

| Component | Technology |
|---|---|
| Website & Backend | Next.js, React, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Charts | TradingView Lightweight Charts, Apache ECharts |
| Database | PostgreSQL |
| Synchronization | TypeScript Worker, Notion API |
| Deployment | Docker Compose, Caddy |

## Privacy & Security

The Notion integration is **read-only**. My original trading data obviously remains private.

The dashboard is designed for private, HTTPS-protected access on a self-hosted server. PostgreSQL and the synchronization worker are not publicly exposed.

## Login and local checks

The dashboard now requires its own private login at `/login` and redirects to `/dashboard` after authentication. Configure your username, password hash and session secret using the [authentication setup guide](docs/authentication.md). No default credentials are provided, and missing configuration keeps the dashboard locked.

Run `npm ci`, `npm run typecheck`, `npm test` and `npm run build`. The standalone production login flow can then be checked using `npm run test:smoke`, with generated test credentials and no connection to your trading database or Notion account.

## Modern trading workspace

The dashboard includes an overview, a searchable trade journal with CSV export and trade details, an interactive P&L calendar, and setup/session/timing analytics. All views share account and period filters, with mobile navigation and reduced-motion support.

Run `npm run preview` for an isolated local demo with synthetic data and no `.env`, PostgreSQL or Notion access. See the [preview and browser-test guide](docs/local-preview.md) and the [deployment preparation](docs/deployment-checklist.md).
