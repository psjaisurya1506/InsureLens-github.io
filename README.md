# InsureLens — know your cover before you are admitted

InsureLens helps a client manage their health insurance policies and claims, and shows **how much can still be claimed before admission** so they can pick the hospital that suits their remaining cover.

## What it does

- **Cost Estimator** (`/dashboard/estimate`) — search or pick a treatment, choose a policy, and see for every hospital the estimated cost, what the insurer pays, what you pay, and an **Eligible / Eligible with limits / Not eligible** verdict. Open *Full analysis* on any hospital to see each check (policy period, treatment covered, waiting period, sum insured left, room-rent limit, procedure sub-limit, co-pay and deductible, cashless or reimbursement) and the cost split by billing area. Filter by city, budget and cashless network; sort by what you pay, total bill or insurer share. An overall verdict summarises all hospitals.
- **Administration** (`/dashboard/admin`, administrator only) — manage hospitals (prices per treatment, room rent, network, show/hide), treatments (typical stay, waiting period, covered/excluded), policies (limits, co-pay, dates, inception date), see a price-coverage matrix, and export / import / reset the whole catalog as JSON.

- **Policies & Claims** (`/dashboard/manage`) — add several policies, record claims, and see for each policy the sum insured, amount claimed and amount still claimable. Every claim is recorded **by billing area** (room, doctor fees, medicines, diagnostics, procedure, consumables, other), with totals per area showing exactly where cover has been used. Rejected claims do not reduce cover.
- **Hospital Planner** (`/dashboard/hospitals`) — pick a policy and a planned treatment; hospitals are compared on expected bill, insurer pays, **you pay**, **cover left afterwards**, and the share of remaining cover used. Filter by budget and cashless network, sort by cost or cover left, and expand any hospital to see the claim split by area. Bills that exceed the remaining cover are flagged.
- **Hospital Directory** (`/dashboard/directory`) — add your own hospitals, treatments and quoted prices; the planner compares exactly these.
- **Dashboard overview & live alerts** — totals across all policies, claims by area, recent claims, and automatic alerts (cover running low, policy expiring/expired, claims needing clarification).
- **Export & print** — export all claims to CSV, and print or save the planner's comparison as a PDF report.
- **Claim analysis, deduction explanations, utilization, documents, alerts** — the original post-bill tools (co-pay, room rent, deductible, sub-limits).

All estimates come from a deterministic rule engine (`src/lib/calculateClaim.ts`, `src/lib/hospitalPlanner.ts`). They are illustrative, not an insurer decision.

## Run locally

Easiest: double-click `start.bat` (Windows) or run `./start.sh` (macOS/Linux). Problems? See **SETUP.md**.

Requires Node.js 20.9+ (22 LTS recommended).

```bash
npm install
npm run dev        # http://localhost:3000
```

Quality checks: `npm run typecheck && npm run lint && npm run build`

## Data

Policies and claims are stored in the browser (`localStorage`, key `insurelens.store.v1`), so the app works on static hosting with no backend. "Reset demo data" on the Policies & Claims page restores the sample data. Default hospital prices in `src/lib/hospitalPlanner.ts` are **sample data** — enter real prices in the Hospital Directory (or replace them with a price API) before real use. Login is a browser-only demo; add real authentication before handling real personal or medical data.

## Deploy to GitHub Pages

1. Create a GitHub repository (any name) and push this folder's contents to the `main` branch.
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) type-checks, lints, builds a static export and deploys it. The base path is set automatically from the repository name.
4. Your site appears at `https://<your-username>.github.io/<repository-name>/`.

## Deploy to Vercel

1. Push the repository to GitHub.
2. In Vercel: **Add New → Project → import the repository**. Framework is detected as Next.js; keep the root directory at the folder containing `package.json`.
3. Click **Deploy**. No environment variables are required. Vercel serves from the domain root, so no base path is used.

## Project layout

```
src/app/dashboard/manage      Policies & claims by area
src/app/dashboard/hospitals   Pre-admission hospital planner
src/app/dashboard/directory   Editable hospitals & prices
src/lib/insights.ts           Live alert rules
src/lib/store.ts              Browser store for policies and claims
src/lib/hospitalPlanner.ts    Hospital price data + estimate engine
src/lib/calculateClaim.ts     Rule-based claim calculation
```

## Disclaimer

Amounts are estimates from the data entered. Policy wording, exclusions, waiting periods, room category and insurer/TPA interpretation can change a settlement. InsureLens does not guarantee claim approval.
