# TradeJournal

A single-user trading journal web application for logging, analyzing, and reviewing trades. Built with **React 18**, **Vite**, **Tailwind CSS**, **Recharts**, and **Firebase Auth + Firestore** for production, with a legacy **Bun + SQLite** backend for local development.

## Features

- **Authentication** — Email/password sign-up/sign-in and Google OAuth via Firebase Auth.
- **Broker Accounts** — Create and manage separate broker accounts, each with its own capital tracking and trade history.
- **Dashboard** — Key performance indicators (Net PnL, Win Rate, Profit Factor, Avg Win/Loss) with interactive Recharts visualizations: Cumulative PnL line chart, Win/Loss ratio pie chart, and PnL by Setup bar chart.
- **Journal** — Tabular trade list with search, filters (status, type, setup tags), sortable columns (date, PnL), pagination, and a mobile-friendly stacked card layout.
- **Calendar View** — Month-by-month calendar showing daily aggregated PnL for closed trades. Click any date to see the day's trade details.
- **Import / Export** — Download trades as JSON (full backup) or CSV (spreadsheet-compatible). Import trades by uploading a CSV file or pasting CSV text directly.
- **Trade Modal** — Add or edit trades with automatic PnL calculation, status detection (OPEN/CLOSED), and client-side validation.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide icons |
| Auth & Database (production) | Firebase Auth, Firestore |
| Local backend (optional) | Bun (`Bun.serve`), `bun:sqlite` |
| Local database (optional) | SQLite (`trades.db`) |
| Deployment | Firebase Hosting |

## Requirements

- **Bun** v1.3+ for local development (the optional backend uses Bun-native APIs).
- **Firebase CLI** v15+ for deployment.
- A Firebase project with **Authentication** (Email/Password + Google) and **Firestore** (Native mode) enabled.

Production deployment does not require Bun — the SPA is served from Firebase Hosting.

## Getting Started

### 1. Firebase Project Setup

Create a Firebase project (or use an existing one) and enable:
- **Authentication** → Sign-in method → Email/Password and Google.
- **Firestore** → Create database in Native mode.

Copy your Firebase config (project settings → web app) into a `.env` file:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 2. Install and Run

```bash
# Install dependencies
bun install

# Start development servers (Vite on :3000, optional backend on :3001)
bun run dev

# Production build
bun run build
```

Open `http://localhost:3000`. On first visit you'll see the **Firebase Setup** screen — paste your Firebase config (or configure via `.env`) and proceed to sign in.

### 3. Deploy to Firebase Hosting

```bash
# Build and deploy everything (hosting + firestore rules/indexes)
bun run deploy:all

# Or deploy hosting only (after first deploy)
bun run deploy
```

The app will be available at `https://<project-id>.web.app`.

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── Auth.tsx             # Login/signup (email/password, Google)
│   │   ├── CalendarView.tsx     # Monthly calendar with daily PnL badges
│   │   ├── Dashboard.tsx        # KPI cards + Recharts (Line, Pie, Bar)
│   │   ├── FirebaseSetup.tsx    # Firebase config entry screen
│   │   ├── ImportExport.tsx     # CSV/JSON export, CSV file/paste import
│   │   ├── Journal.tsx          # Filterable, sortable, paginated trade table
│   │   └── TradeModal.tsx       # Create/edit trade form with validation
│   ├── utils/
│   │   ├── api.ts               # Firestore CRUD operations (8 methods)
│   │   ├── firebase.ts          # Firebase lazy initialization
│   │   └── stats.ts             # Pure stats computation (calculateStats)
│   ├── App.tsx                  # Root component: global state, auth, tabs, modals
│   ├── main.tsx                 # React 18 entry point
│   ├── types.ts                 # Trade, BrokerAccount, DashboardStats interfaces
│   └── index.css                # Tailwind directives + custom scrollbar styles
├── server/                      # Legacy local backend (optional)
│   ├── db.ts                    # SQLite schema, CRUD, PnL calculation
│   └── index.ts                 # Bun HTTP server, routing, CORS, CSV import
├── index.html                   # SPA entry HTML
├── tailwind.config.js           # Brand color palette
├── vite.config.ts               # Dev server proxy (/api → :3001)
├── tsconfig.json                # Strict TypeScript configuration
├── firebase.json                # Firebase Hosting configuration
├── .firebaserc                  # Firebase project alias
├── firestore.rules              # Firestore security rules
├── firestore.indexes.json       # Firestore composite indexes
├── .env                         # VITE_FIREBASE_* credentials (gitignored)
└── package.json                 # Dependencies and scripts
```

## PnL Calculation

- **LONG**: `(exit_price - entry_price) × quantity - fee`
- **SHORT**: `(entry_price - exit_price) × quantity - fee`
- If no exit price is set: status = `OPEN`, PnL = `-fee`.
- Status automatically switches to `CLOSED` when exit price is provided.
- PnL is computed client-side in the browser (Firestore path). The optional local backend also computes PnL server-side.

## CSV Import Format

Required headers: `symbol`, `type` (LONG/SHORT), `quantity`, `entry_price`, `entry_date`.

Optional headers: `exit_price`, `exit_date`, `fee`, `setup`, `notes`.

```csv
symbol,type,quantity,entry_price,exit_price,entry_date,exit_date,fee,setup,notes
ETHUSD,LONG,2,3500,3400,2026-06-12T08:00,2026-06-12T12:00,15,Breakout,Loss on breakout failure
```

## API Endpoints (Local Backend)

The optional Bun/SQLite backend (started with `bun run dev:backend`) provides these endpoints on port 3001:

| Method | Path | Description |
|---|---|---|
| GET | `/api/trades` | List all trades (sorted by entry_date DESC) |
| GET | `/api/trades/:id` | Get a single trade |
| POST | `/api/trades` | Create a new trade |
| PUT | `/api/trades/:id` | Update an existing trade |
| DELETE | `/api/trades/:id` | Delete a trade |
| GET | `/api/stats` | Aggregated KPIs and chart data |
| POST | `/api/import` | Import trades from CSV body |

In production (Firebase Hosting), all data operations go directly through Firestore from the browser — the local backend is not used.

## License

MIT
