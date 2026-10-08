GIMM Trading Intelligence
Self-hosted trading dashboard: Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui-compatible primitives · Lightweight Charts · Apache ECharts · PostgreSQL 17 · Docker Compose.
The existing Notion Trading Journal remains the single source of truth. The worker requests its data in read-only mode, stores a local indexed copy, and the website computes every KPI live from that copy. No n8n, K3s or Grafana required.
This project was prepared for your existing server:
Hostname: dashboard.gimmholding.com
Existing Caddy Docker network: gimmholding-credentials_default
Existing Caddyfile: /root/gimmholding-credentials/Caddyfile
Existing Vaultwarden: untouched at vault.gimmholding.com
Notion data source: 9b00d88a-5894-82d7-adbe-0752ccb94905 (already present in .env.example)
Deployment status: Source code created and core tests passed offline. A full Next.js production build and Docker Compose deployment were not executed in this environment because it has no npm-registry access or Docker daemon. Run the commands below on the server and inspect the build/logs before opening DNS traffic.
Security model
No new published ports: only existing Caddy exposes 80/443. The new web service is reachable from Caddy over the shared Docker bridge.
Web protected by Caddy bcrypt HTTP Basic Authentication over HTTPS. Users without credentials receive HTTP 401.
PostgreSQL has no published port. Worker is on backend network only.
Notion API token is present only in the worker container, not in the website.
Worker never issues a Notion mutation request. Use a Notion integration configured with read-only/content-read permissions, shared only with the original Trading Journal.
Never commit .env, credentials, backups, or authentication hashes into public repositories.
Traffic inside Docker uses its private bridge network. For remote administrative access, use SSH and/or NetBird.
The dashboard is intentionally not embedded into Notion initially, as your existing security headers forbid framing (X-Frame-Options: DENY); use the private HTTPS URL instead.
1. Domain DNS
In the DNS zone for gimmholding.com, set:
Type
Host
Value
A
dashboard
your own server IPv4
Do not change records for vault.gimmholding.com, the root domain, or your mail setup. If the domain uses an AAAA record, ensure it resolves to the correct IPv6 or omit it for this subdomain.
2. Create the Notion Integration
Open https://www.notion.so/profile/integrations (or the current Notion Integrations developer portal).
Create an internal integration named GIMM Trading Dashboard Reader and grant only Read content (no update/insert permissions).
Go to the original Trading Journal database, open its ... menu / Connections, and grant access to the new integration. If your workspace needs the integration on a parent page, review the inherited permissions carefully.
Copy the integration secret privately and keep it only in .env.
Use the data source ID from .env.example. The Notion API version is 2025-09-03, which queries /v1/data_sources/{data_source_id}/query, not the old /v1/databases/{id}/query endpoint.
Important: Do not paste your Notion integration token into this chat.
3. Copy project onto server
Download the ZIP attached in ChatGPT and upload it to the server. Example from a local terminal (change the local file path as needed):
scp gimm-trading-dashboard.zip root@YOUR_SERVER_IP:/root/
​
Then SSH into your server and extract:
cd /root
unzip gimm-trading-dashboard.zip
​
Alternatively, you can upload the extracted directory:
scp -r gimm-trading-dashboard root@YOUR_SERVER_IP:/root/
​
Then SSH to your server:
cd /root/gimm-trading-dashboard
cp .env.example .env
chmod 600 .env
openssl rand -hex 32
​
Copy the generated random string into the DB_PASSWORD value in .env. Add NOTION_TOKEN from your own Notion integration. Do not share either value.
nano .env
​
All settings other than the private secrets are pre-populated. Use an alphanumeric/hex DB password to avoid Compose interpolation and URL quoting issues.
4. Launch (does not stop existing containers)
cd /root/gimm-trading-dashboard
# Validate the configuration; prints a fully expanded Compose file (may include secrets)!
# Do NOT paste its output into chat.
docker compose config --quiet

docker compose up -d --build
docker compose ps
docker compose logs --tail=70 worker
​
The worker performs an initial sync immediately and then every SYNC_INTERVAL_SECONDS (default: 180 seconds). After that, the Next.js site refreshes its data every 90 seconds when open. Thus a new trade appears typically within roughly 3–5 minutes, not instantaneously.
To force a resync now:
docker compose exec worker npm run sync:once
​
This works even though the periodic worker is running: the Postgres transaction obtains an advisory lock to serialize writes. Never change the original Notion data just to trigger this.
Verify the internal site before exposing the domain
docker compose ps
docker compose logs --tail=100 web worker
# This request uses only the internal Docker networking, not public ports.
docker compose exec web node -e "require('http').get('<http://127.0.0.1:3000/api/health',r=>console.log('health> HTTP',r.statusCode)).on('error',console.error)"
​
Expected: health HTTP 200. The worker log should say Notion synced with a nonzero received count if the integration access is correct. On the website, metrics are calculated from the data; we do not show invented demo trades.
5. Protect the website with your existing Caddy
Do not install or publish a second Caddy. Your existing instance runs in the network gimmholding-credentials_default. The new web service joins that same network under the alias trading-web.
Create a bcrypt password hash interactively:
docker exec -it gimmholding-credentials-caddy-1 caddy hash-password
​
The command prompts for a password and prints the resulting hash. Copy only the hash, not your plain password, into the new Caddy block.
Back up the original Caddyfile first:
cp /root/gimmholding-credentials/Caddyfile "/root/gimmholding-credentials/Caddyfile.backup.$(date +%Y%m%d-%H%M%S)"
nano /root/gimmholding-credentials/Caddyfile
​
Append, rather than replace, the content from Caddyfile.addition and substitute REPLACE_WITH_BCRYPT_HASH with your actual bcrypt hash. Keep the existing (security_headers) snippet and vault.gimmholding.com section as-is.
Validate before reload:
docker exec gimmholding-credentials-caddy-1 caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker exec gimmholding-credentials-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
​
If validation fails, do not reload Caddy. Correct the new block and try again. This operation does not restart Vaultwarden.
Once DNS and HTTPS settle, open https://dashboard.gimmholding.com. Your browser should request the trader username and your own password.
Check from a terminal without entering any password:
curl -I <https://dashboard.gimmholding.com>
​
Expected: HTTP/2 401 (unauthenticated). A 401 indicates that Caddy's authentication gate is working. With valid credentials, the dashboard page should load.
6. Backups
PostgreSQL uses persistent named volume gimm-trading_trading_postgres. Container rebuilds do not delete this volume. Do not run docker compose down -v.
To back up the database:
cd /root/gimm-trading-dashboard
bash scripts/backup.sh
​
Default destination: /root/trading-backups, with 0600 permissions. Store encrypted, off-server copies regularly (e.g., a Hetzner Storage Box). The original Notion database remains the source of truth, but backups reduce recovery time and cover service configuration independently.
7. Common operational commands
cd /root/gimm-trading-dashboard
docker compose ps
docker compose logs -f worker
docker compose logs -f web
docker compose restart worker
docker compose up -d --build
​
To shut down only the trading stack (Postgres data persists):
docker compose down
​
These commands do not stop the existing Caddy or Vaultwarden containers. Avoid modifying their Compose project.
Metrics and limitations
Closed trade: Net € is a number, including exactly 0.00 (break-even). Trades with Net € missing are not closed.
Win rate: trades with Net € > 0 / closed trades; zero counts in denominator.
Profit factor: sum of positive Net € divided by absolute sum of negative Net €; a missing negative denominator is shown as undefined (—).
Cumulative trading P&L: sum of realized Net € sorted by the Notion trade date, aggregated per calendar day. It excludes deposits/withdrawals.
Account balance: the actual recorded Account Balance field, not derived from Net €; may include transfers.
Maximum trading drawdown: calculated from cumulative trading P&L; not necessarily the true intraday account drawdown.
Confluence labels: a checkbox's false can mean either No or not documented; the UI labels it No / untagged to avoid overstating certainty.
Setup tags: a trade may be counted in multiple setup and confluence bars, but never twice for the same setup tag.
Trade date/time: reported in Europe/Berlin by default; the API must supply offset-aware timestamps.
Period filters: the equity curve starts at zero for the selected time interval; it does not import earlier realized P&L. Account balance uses its recorded absolute value.
R values: the dashboard mirrors the original journal; if some values are abnormal (e.g. -45), the average R should be treated with caution.
Missing rows safety: failed or incomplete Notion requests do not overwrite existing records. More than 40% apparent deletions in one run triggers a warning and retains missing records rather than deleting them. On a deliberate mass deletion, resolve/adjust this safeguard after verification.
Notion permissions: if the integration cannot access your database or the data source ID is wrong, the worker logs an error and the dashboard shows sync status.
No cloud provider APIs or shared public Grafana dashboards are required.
Validation done before delivery
Core offline tests are in tests/analytics.test.ts and tests/notion.test.ts:
npm test
​
A full production build requires network access to the npm registry or an npm cache. Run docker compose up -d --build on your Hetzner server to exercise this step and report any build errors for correction.
Source code overview
app/                   Next.js App Router and API health endpoint
components/dashboard.tsx   Live dashboard and all chart headings, filters, cards
components/charts/     TradingView Lightweight Charts and ECharts
components/ui/         shadcn/ui-compatible components
lib/notion.ts          Read-only Notion client with pagination/retry
lib/sync.ts            Transactional full sync and deletion-safety check
lib/db.ts              PostgreSQL schema and database queries
lib/analytics.ts       All calculated trading metrics
scripts/worker.ts      Independent periodic sync process
scripts/backup.sh      PostgreSQL backup
compose.yaml           Deployment on your existing Caddy network
Caddyfile.addition     HTTPS routing and bcrypt auth blockGIMM Trading Intelligence
Self-hosted trading dashboard: Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui-compatible primitives · Lightweight Charts · Apache ECharts · PostgreSQL 17 · Docker Compose.
The existing Notion Trading Journal remains the single source of truth. The worker requests its data in read-only mode, stores a local indexed copy, and the website computes every KPI live from that copy. No n8n, K3s or Grafana required.
This project was prepared for your existing server:
Hostname: dashboard.gimmholding.com
Existing Caddy Docker network: gimmholding-credentials_default
Existing Caddyfile: /root/gimmholding-credentials/Caddyfile
Existing Vaultwarden: untouched at vault.gimmholding.com
Notion data source: 9b00d88a-5894-82d7-adbe-0752ccb94905 (already present in .env.example)
Deployment status: Source code created and core tests passed offline. A full Next.js production build and Docker Compose deployment were not executed in this environment because it has no npm-registry access or Docker daemon. Run the commands below on the server and inspect the build/logs before opening DNS traffic.
Security model
No new published ports: only existing Caddy exposes 80/443. The new web service is reachable from Caddy over the shared Docker bridge.
Web protected by Caddy bcrypt HTTP Basic Authentication over HTTPS. Users without credentials receive HTTP 401.
PostgreSQL has no published port. Worker is on backend network only.
Notion API token is present only in the worker container, not in the website.
Worker never issues a Notion mutation request. Use a Notion integration configured with read-only/content-read permissions, shared only with the original Trading Journal.
Never commit .env, credentials, backups, or authentication hashes into public repositories.
Traffic inside Docker uses its private bridge network. For remote administrative access, use SSH and/or NetBird.
The dashboard is intentionally not embedded into Notion initially, as your existing security headers forbid framing (X-Frame-Options: DENY); use the private HTTPS URL instead.
1. Domain DNS
In the DNS zone for gimmholding.com, set:
Type
Host
Value
A
dashboard
your own server IPv4
Do not change records for vault.gimmholding.com, the root domain, or your mail setup. If the domain uses an AAAA record, ensure it resolves to the correct IPv6 or omit it for this subdomain.
2. Create the Notion Integration
Open https://www.notion.so/profile/integrations (or the current Notion Integrations developer portal).
Create an internal integration named GIMM Trading Dashboard Reader and grant only Read content (no update/insert permissions).
Go to the original Trading Journal database, open its ... menu / Connections, and grant access to the new integration. If your workspace needs the integration on a parent page, review the inherited permissions carefully.
Copy the integration secret privately and keep it only in .env.
Use the data source ID from .env.example. The Notion API version is 2025-09-03, which queries /v1/data_sources/{data_source_id}/query, not the old /v1/databases/{id}/query endpoint.
Important: Do not paste your Notion integration token into this chat.
3. Copy project onto server
Download the ZIP attached in ChatGPT and upload it to the server. Example from a local terminal (change the local file path as needed):
scp gimm-trading-dashboard.zip root@YOUR_SERVER_IP:/root/
​
Then SSH into your server and extract:
cd /root
unzip gimm-trading-dashboard.zip
​
Alternatively, you can upload the extracted directory:
scp -r gimm-trading-dashboard root@YOUR_SERVER_IP:/root/
​
Then SSH to your server:
cd /root/gimm-trading-dashboard
cp .env.example .env
chmod 600 .env
openssl rand -hex 32
​
Copy the generated random string into the DB_PASSWORD value in .env. Add NOTION_TOKEN from your own Notion integration. Do not share either value.
nano .env
​
All settings other than the private secrets are pre-populated. Use an alphanumeric/hex DB password to avoid Compose interpolation and URL quoting issues.
4. Launch (does not stop existing containers)
cd /root/gimm-trading-dashboard
# Validate the configuration; prints a fully expanded Compose file (may include secrets)!
# Do NOT paste its output into chat.
docker compose config --quiet

docker compose up -d --build
docker compose ps
docker compose logs --tail=70 worker
​
The worker performs an initial sync immediately and then every SYNC_INTERVAL_SECONDS (default: 180 seconds). After that, the Next.js site refreshes its data every 90 seconds when open. Thus a new trade appears typically within roughly 3–5 minutes, not instantaneously.
To force a resync now:
docker compose exec worker npm run sync:once
​
This works even though the periodic worker is running: the Postgres transaction obtains an advisory lock to serialize writes. Never change the original Notion data just to trigger this.
Verify the internal site before exposing the domain
docker compose ps
docker compose logs --tail=100 web worker
# This request uses only the internal Docker networking, not public ports.
docker compose exec web node -e "require('http').get('<http://127.0.0.1:3000/api/health',r=>console.log('health> HTTP',r.statusCode)).on('error',console.error)"
​
Expected: health HTTP 200. The worker log should say Notion synced with a nonzero received count if the integration access is correct. On the website, metrics are calculated from the data; we do not show invented demo trades.
5. Protect the website with your existing Caddy
Do not install or publish a second Caddy. Your existing instance runs in the network gimmholding-credentials_default. The new web service joins that same network under the alias trading-web.
Create a bcrypt password hash interactively:
docker exec -it gimmholding-credentials-caddy-1 caddy hash-password
​
The command prompts for a password and prints the resulting hash. Copy only the hash, not your plain password, into the new Caddy block.
Back up the original Caddyfile first:
cp /root/gimmholding-credentials/Caddyfile "/root/gimmholding-credentials/Caddyfile.backup.$(date +%Y%m%d-%H%M%S)"
nano /root/gimmholding-credentials/Caddyfile
​
Append, rather than replace, the content from Caddyfile.addition and substitute REPLACE_WITH_BCRYPT_HASH with your actual bcrypt hash. Keep the existing (security_headers) snippet and vault.gimmholding.com section as-is.
Validate before reload:
docker exec gimmholding-credentials-caddy-1 caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker exec gimmholding-credentials-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
​
If validation fails, do not reload Caddy. Correct the new block and try again. This operation does not restart Vaultwarden.
Once DNS and HTTPS settle, open https://dashboard.gimmholding.com. Your browser should request the trader username and your own password.
Check from a terminal without entering any password:
curl -I <https://dashboard.gimmholding.com>
​
Expected: HTTP/2 401 (unauthenticated). A 401 indicates that Caddy's authentication gate is working. With valid credentials, the dashboard page should load.
6. Backups
PostgreSQL uses persistent named volume gimm-trading_trading_postgres. Container rebuilds do not delete this volume. Do not run docker compose down -v.
To back up the database:
cd /root/gimm-trading-dashboard
bash scripts/backup.sh
​
Default destination: /root/trading-backups, with 0600 permissions. Store encrypted, off-server copies regularly (e.g., a Hetzner Storage Box). The original Notion database remains the source of truth, but backups reduce recovery time and cover service configuration independently.
7. Common operational commands
cd /root/gimm-trading-dashboard
docker compose ps
docker compose logs -f worker
docker compose logs -f web
docker compose restart worker
docker compose up -d --build
​
To shut down only the trading stack (Postgres data persists):
docker compose down
​
These commands do not stop the existing Caddy or Vaultwarden containers. Avoid modifying their Compose project.
Metrics and limitations
Closed trade: Net € is a number, including exactly 0.00 (break-even). Trades with Net € missing are not closed.
Win rate: trades with Net € > 0 / closed trades; zero counts in denominator.
Profit factor: sum of positive Net € divided by absolute sum of negative Net €; a missing negative denominator is shown as undefined (—).
Cumulative trading P&L: sum of realized Net € sorted by the Notion trade date, aggregated per calendar day. It excludes deposits/withdrawals.
Account balance: the actual recorded Account Balance field, not derived from Net €; may include transfers.
Maximum trading drawdown: calculated from cumulative trading P&L; not necessarily the true intraday account drawdown.
Confluence labels: a checkbox's false can mean either No or not documented; the UI labels it No / untagged to avoid overstating certainty.
Setup tags: a trade may be counted in multiple setup and confluence bars, but never twice for the same setup tag.
Trade date/time: reported in Europe/Berlin by default; the API must supply offset-aware timestamps.
Period filters: the equity curve starts at zero for the selected time interval; it does not import earlier realized P&L. Account balance uses its recorded absolute value.
R values: the dashboard mirrors the original journal; if some values are abnormal (e.g. -45), the average R should be treated with caution.
Missing rows safety: failed or incomplete Notion requests do not overwrite existing records. More than 40% apparent deletions in one run triggers a warning and retains missing records rather than deleting them. On a deliberate mass deletion, resolve/adjust this safeguard after verification.
Notion permissions: if the integration cannot access your database or the data source ID is wrong, the worker logs an error and the dashboard shows sync status.
No cloud provider APIs or shared public Grafana dashboards are required.
Validation done before delivery
Core offline tests are in tests/analytics.test.ts and tests/notion.test.ts:
npm test
​
A full production build requires network access to the npm registry or an npm cache. Run docker compose up -d --build on your Hetzner server to exercise this step and report any build errors for correction.
Source code overview
app/                   Next.js App Router and API health endpoint
components/dashboard.tsx   Live dashboard and all chart headings, filters, cards
components/charts/     TradingView Lightweight Charts and ECharts
components/ui/         shadcn/ui-compatible components
lib/notion.ts          Read-only Notion client with pagination/retry
lib/sync.ts            Transactional full sync and deletion-safety check
lib/db.ts              PostgreSQL schema and database queries
lib/analytics.ts       All calculated trading metrics
scripts/worker.ts      Independent periodic sync process
scripts/backup.sh      PostgreSQL backup
compose.yaml           Deployment on your existing Caddy network
Caddyfile.addition     HTTPS routing and bcrypt auth block
