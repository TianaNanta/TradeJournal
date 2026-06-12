# TradeJournal

A local, single-user trading journal web application for logging, analyzing, and reviewing trades. Built with **React 18**, **Vite**, **Tailwind CSS**, **Recharts**, and a **Bun + SQLite** backend.

## Features

- **Dashboard** — Key performance indicators (Net PnL, Win Rate, Profit Factor, Avg Win/Loss) with interactive Recharts visualizations: Cumulative PnL line chart, Win/Loss ratio pie chart, and PnL by Setup bar chart.
- **Journal** — Tabular trade list with search, filters (status, type, setup tags), sortable columns (date, PnL), pagination, and a mobile-friendly stacked card layout.
- **Calendar View** — Month-by-month calendar showing daily aggregated PnL for closed trades. Click any date to see the day's trade details.
- **Import / Export** — Download trades as JSON (full backup) or CSV (spreadsheet-compatible). Import trades by uploading a CSV file or pasting CSV text directly.
- **Trade Modal** — Add or edit trades with automatic PnL calculation, status detection (OPEN/CLOSED), and client-side validation.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide icons |
| Backend | Bun (`Bun.serve`), `bun:sqlite` |
| Database | SQLite (`trades.db` — auto-created, gitignored) |

## Requirements

- **Bun** v1.3+ (the backend uses `bun:sqlite` and `Bun.serve`, which are Bun-native)
- No Node.js, no Docker, no external database required.

## Getting Started

```bash
# Install dependencies
bun install

# Start development servers (Vite on :3000, backend on :3001)
bun run dev

# Production build
bun run build

# Run production server (serves dist/ on :3001)
bun run start
```

Open `http://localhost:3000` in development, or `http://localhost:3001` in production.

## Project Structure

```
├── server/
│   ├── db.ts          # SQLite schema, CRUD, PnL calculation, stats aggregation
│   └── index.ts       # Bun HTTP server, routing, CORS, CSV import, static files
├── src/
│   ├── components/
│   │   ├── CalendarView.tsx   # Monthly calendar with daily PnL badges
│   │   ├── Dashboard.tsx      # KPI cards + Recharts (Line, Pie, Bar)
│   │   ├── ImportExport.tsx   # CSV/JSON export, CSV file/paste import
│   │   ├── Journal.tsx        # Filterable, sortable, paginated trade table
│   │   └── TradeModal.tsx     # Create/edit trade form with validation
│   ├── utils/
│   │   └── api.ts             # Fetch-based API client (6 methods)
│   ├── App.tsx                # Root component: global state, layout, tab routing
│   ├── main.tsx               # React 18 entry point
│   ├── types.ts               # Trade and DashboardStats interfaces
│   └── index.css              # Tailwind directives + custom scrollbar styles
├── index.html                 # SPA entry HTML
├── tailwind.config.js         # Brand color palette
├── vite.config.ts             # Dev server proxy (/api → :3001)
├── tsconfig.json              # Strict TypeScript configuration
└── package.json               # Dependencies and scripts
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/trades` | List all trades (sorted by entry_date DESC) |
| GET | `/api/trades/:id` | Get a single trade |
| POST | `/api/trades` | Create a new trade |
| PUT | `/api/trades/:id` | Update an existing trade |
| DELETE | `/api/trades/:id` | Delete a trade |
| GET | `/api/stats` | Aggregated KPIs and chart data |
| POST | `/api/import` | Import trades from CSV body |

## PnL Calculation

- **LONG**: `(exit_price - entry_price) × quantity - fee`
- **SHORT**: `(entry_price - exit_price) × quantity - fee`
- If no exit price is set: status = `OPEN`, PnL = `-fee`.
- Status automatically switches to `CLOSED` when exit price is provided.

## CSV Import Format

Required headers: `symbol`, `type` (LONG/SHORT), `quantity`, `entry_price`, `entry_date`.

Optional headers: `exit_price`, `exit_date`, `fee`, `setup`, `notes`.

```csv
symbol,type,quantity,entry_price,exit_price,entry_date,exit_date,fee,setup,notes
ETHUSD,LONG,2,3500,3400,2026-06-12T08:00,2026-06-12T12:00,15,Breakout,Loss on breakout failure
```

## License

MIT
