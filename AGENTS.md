# Repository Guidelines

## Project Overview

TradeJournal is a local single-user trading journal web app for logging and analyzing trades. Users record trades (symbol, type, quantity, entry/exit prices, fees, notes), view a dashboard with KPIs and Recharts charts (cumulative PnL line chart, win/loss pie chart, PnL by setup bar chart), browse a paginated/filterable journal table, inspect daily PnL on a calendar view, and import/export trade data as CSV or JSON.

Built with **React 18 + Vite + Tailwind CSS** frontend and a **Bun + SQLite** backend, all in one repository.

## Architecture & Data Flow

```
index.html → src/main.tsx → src/App.tsx (global state owner)
                               ├── Dashboard    ← stats, trades (props)
                               ├── Journal       ← trades, onRefresh (props)
                               │   └── TradeModal ← api.createTrade / api.updateTrade
                               ├── CalendarView  ← trades (props, pure derivation)
                               └── ImportExport  ← trades, onImportSuccess (props)
                                        ↓
                                src/utils/api.ts (fetch → /api/*)
                                        ↓
                              Bun.serve (server/index.ts, port 3001)
                                        ↓
                              server/db.ts (bun:sqlite → trades.db)
```

- **State ownership**: All mutable state lives in `App.tsx` via `useState`. No Context, Redux, or URL router.
- **Data fetching**: `fetchData()` in `App.tsx` calls `api.getTrades()` and `api.getStats()` in parallel via `Promise.all`. Re-fetched entirely whenever any mutating action completes (`onRefresh` / `onImportSuccess`).
- **Downward props**: Components receive data via props only. Mutations call back upward to `App.tsx` which re-fetches.
- **Calendar & stats**: Derived data computed server-side (stats endpoint) and client-side (calendar groups closed trades by `exit_date`).

## Key Directories

| Directory | Purpose |
|---|---|
| `src/` | React frontend source |
| `src/components/` | 5 UI components — Dashboard, Journal, TradeModal, CalendarView, ImportExport |
| `src/utils/` | API client (`api.ts`) |
| `server/` | Bun HTTP server (`index.ts`) + database layer (`db.ts`) |
| `dist/` | Vite production build output (gitignored) |

## Development Commands

| Command | Action |
|---|---|
| `bun install` | Install all dependencies |
| `bun run dev` | Start both Vite dev server (port 3000) and backend (port 3001) concurrently |
| `bun run dev:frontend` | Start Vite dev server only |
| `bun run dev:backend` | Start backend with `--watch` |
| `bun run build` | TypeScript check + Vite production build |
| `bun run start` | Production: serve `dist/` via Bun backend on port 3001 |

**Runtime requirement**: Bun (v1.3+). The backend uses `bun:sqlite` which is Bun-native.

## Code Conventions & Common Patterns

### TypeScript

- **Strict mode** enabled (`"strict": true`). All `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns` are on.
- **No `any`** — project rules enforce `unknown`, domain types, type guards, or `as unknown as T` with a reason.
- **Two exported interfaces**: `Trade` (14 fields) and `DashboardStats` (aggregated metrics + chart data arrays). Both use `| null` for nullable optional fields.

### React / Component Patterns

- **Functional components only**, defined as `export default function ComponentName({ props }: PropsType)`.
- **Props interface** defined immediately above each component, e.g. `interface DashboardProps { ... }`.
- **No hooks at top level** — only inside components.
- **`useMemo`** used for filtered/sorted/derived data (Journal filters, calendar cells, daily stats).
- **`formatCurrency`** is a standalone helper function duplicated in Dashboard, Journal, CalendarView (no shared utils file). Formats with `Intl.NumberFormat`, prepends `+`/`-` based on sign.

### Data Flow & State

- **No prop drilling beyond 1 level** — App.tsx passes directly to the active tab component.
- **Callbacks**: Mutation-triggering callbacks are named `onRefresh` or `onImportSuccess`. They re-trigger `fetchData()` in App.tsx.
- **Modal pattern**: `TradeModal` receives `trade` (null = create, object = edit), `onClose`, `onRefresh`. Visibility controlled by parent `isModalOpen` state.

### API Client (`src/utils/api.ts`)

- Singleton `api` object with 6 async methods: `getTrades`, `createTrade`, `updateTrade`, `deleteTrade`, `getStats`, `importCSV`.
- All methods throw on non-OK responses.
- Import uses `Content-Type: text/csv`, all others use `application/json`.

### Styling

- **Tailwind CSS exclusively** — no separate CSS modules or styled-components.
- **Brand colors** from `tailwind.config.js`: `brand-dark` (#0B0F19), `brand-card` (#151C2C), `brand-border` (#1F293D), `brand-primary` (#3B82F6), `brand-success` (#10B981), `brand-danger` (#EF4444).
- **Responsive**: Mobile-first with `md:` breakpoint. Sidebar on desktop, bottom nav bar on mobile. Tables use `hidden md:block` / `md:hidden` for desktop table / mobile card toggle.

### Backend Patterns

- **Database**: `bun:sqlite` with raw SQL queries (no ORM). Database file is `trades.db` at project root (gitignored).
- **PnL calculation**: Server-side on create/update. Formula:
  - `LONG`: `(exit_price - entry_price) * quantity - fee`
  - `SHORT`: `(entry_price - exit_price) * quantity - fee`
  - No exit price → status `OPEN`, pnl = `-fee`
- **Stats aggregation**: Single `getStats()` queries all trades, loops in memory computing running total, win/loss counts, setup grouping, and chronological cumulative PnL.
- **CSV import**: Server-side parser handles quoted fields, validates headers client-side before sending, server validates rows and skips malformed ones.
- **Static serving**: For non-`/api` paths, serves files from `dist/` with SPA fallback to `dist/index.html`.

## Important Files

| File | Role |
|---|---|
| `server/db.ts` | SQLite schema, CRUD, PnL calc, stats aggregation |
| `server/index.ts` | Bun HTTP server, routing, CORS, CSV import, static files |
| `src/App.tsx` | Root component, global state, layout, tab routing |
| `src/types.ts` | `Trade` and `DashboardStats` interfaces |
| `src/utils/api.ts` | Fetch-based API client (6 methods) |
| `src/components/Dashboard.tsx` | KPI cards + Recharts (Line, Pie, Bar) + recent trades |
| `src/components/Journal.tsx` | Full journal table, filters, sort, pagination, mobile cards |
| `src/components/TradeModal.tsx` | Create/edit form with validation |
| `src/components/CalendarView.tsx` | Monthly calendar with daily PnL badges |
| `src/components/ImportExport.tsx` | JSON/CSV export, CSV file/paste import |
| `tailwind.config.js` | Brand colors, content paths |
| `vite.config.ts` | Dev server port (3000), API proxy (→3001) |

## Runtime/Tooling Preferences

- **Runtime**: Bun 1.3+ (required for `bun:sqlite` and `Bun.serve`).
- **Package manager**: Bun (`bun install`, `bun add`, `bun run`).
- **No Node.js server**: The backend is `Bun.serve`, not Express or any Node framework.
- **No database migration tool**: Schema is auto-created on server start via `initDb()`.

## Testing & QA

- **No test framework installed** — no Jest, Vitest, or testing library in `package.json`.
- **Verification approach**: Manual integration tests via API calls (documented in the plan). The project is small enough that this is sufficient for now.
- **Build verification**: `bun run build` runs `tsc` (type-checks both `src/` and `server/`) then `vite build` (bundles frontend to `dist/`).
- **Backend smoke test**: Start with `bun run start`, hit `http://localhost:3001/api/trades` — should return `[]`.
