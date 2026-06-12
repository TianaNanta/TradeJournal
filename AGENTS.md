# Repository Guidelines

## Project Overview

TradeJournal is a local single-user trading journal web app for logging, analyzing, and tracking trades. Users configure Firebase credentials (env vars or localStorage), authenticate via Email/Password or Google, create broker accounts, log trades (symbol, type, quantity, entry/exit prices, fees, notes), view a dashboard with KPIs and Recharts charts (cumulative PnL line chart, win/loss pie chart, PnL by setup bar chart), browse a paginated/filterable journal table, inspect daily PnL on a calendar heatmap, and import/export trade data as CSV or JSON.

Built with **React 18 + Vite + TypeScript + Tailwind CSS** frontend, backed by **Firebase Auth + Firestore** for production, with an optional legacy **Bun + SQLite** backend for local development.

## Architecture & Data Flow

```
index.html → src/main.tsx → src/App.tsx (global state owner)
                               ├── FirebaseSetup ← onConfigured
                               ├── Auth ← onResetConfig
                               ├── Dashboard ← stats, trades (props)
                               ├── Journal ← trades, onRefresh (props)
                               │   └── TradeModal ← api.createTrade / api.updateTrade
                               ├── CalendarView ← trades (props, pure derivation)
                               └── ImportExport ← trades, onImportSuccess (props)
                                        ↓
                                src/utils/api.ts (Firestore CRUD via Firebase SDK)
                                        ↓
                              Firebase Auth + Firestore (production)
                              Bun + SQLite server :3001 (local dev, optional)
```

- **State ownership**: All mutable state lives in `App.tsx` via `useState`. No Context, Redux, or URL router.
- **Auth flow**: Firebase `onAuthStateChanged` listener in `useEffect` sets `user` state. Unauthenticated → FirebaseSetup (config) → Auth (login/signup) → Create Account → App shell.
- **Data fetching**: `fetchData()` in `App.tsx` calls `api.getAccounts()` and (if activeAccount selected) `api.getTrades()` in parallel. Re-fetched whenever any mutating action completes.
- **Downward props**: Components receive data via props only. Mutations call back upward to `App.tsx` which re-fetches.
- **Local dev**: Vite dev server on port 3000 proxies `/api/*` to Bun/SQLite backend on port 3001 (for local-only workflow without Firebase).
- **Production**: SPA deployed to Firebase Hosting, talks directly to Firestore from the browser. The Bun/SQLite server is unused.

## Key Directories

| Directory | Purpose |
|---|---|
| `src/` | React frontend source |
| `src/components/` | 7 UI components — Dashboard, Journal, TradeModal, CalendarView, ImportExport, Auth, FirebaseSetup |
| `src/utils/` | Firebase init (`firebase.ts`), Firestore CRUD (`api.ts`), stats computation (`stats.ts`) |
| `server/` | Legacy Bun HTTP server + SQLite layer (local dev only; unused in production) |
| `dist/` | Vite production build output (gitignored) |

## Development Commands

| Command | Action |
|---|---|
| `bun install` | Install all dependencies |
| `bun run dev` | Start both Vite dev server (port 3000) and Bun backend (port 3001) concurrently |
| `bun run dev:frontend` | Start Vite dev server only |
| `bun run dev:backend` | Start Bun backend with `--watch` |
| `bun run build` | TypeScript check (`tsc`) + Vite production build (`vite build`) |
| `bun run start` | Production: serve `dist/` via Bun backend on port 3001 (local-only) |
| `bun run deploy` | Build + `firebase deploy --only hosting` |
| `bun run deploy:all` | Build + `firebase deploy` (hosting + firestore rules/indexes) |

**Runtime requirement**: Bun 1.3+ (required for `bun:sqlite` and `Bun.serve` in the local dev server). The production deployment to Firebase Hosting does not require Bun.

## Code Conventions & Common Patterns

### TypeScript

- **Strict mode** enabled (`"strict": true`). All `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns` are on.
- **No `any`** — project uses `unknown`, domain types, type guards, or explicit casts with comments.
- **Three exported interfaces** in `src/types.ts`: `Trade`, `BrokerAccount`, `DashboardStats`. All use `| null` for nullable optional fields.
- **Interfaces** in `src/utils/firebase.ts`: `FirebaseConfig` (6 VITE_FIREBASE_* fields).

### React / Component Patterns

- **Functional components only**, defined as `export default function ComponentName({ props }: PropsType)`.
- **Props interface** defined immediately above each component, e.g. `interface DashboardProps { ... }`.
- **No hooks at top level** — only inside components.
- **`useMemo`** used for filtered/sorted/derived data (Journal filters, calendar cells, daily stats).
- **`useCallback`** used for stable callback references passed to children.
- **Default exports only** — all components export via `export default function`.
- **No React.FC** — functions typed via destructured Props interface.

### Styling

- **Tailwind CSS exclusively** — no separate CSS modules or styled-components.
- **Brand colors** from `tailwind.config.js`: `brand-dark` (#0B0F19), `brand-card` (#151C2C), `brand-border` (#1F293D), `brand-primary` (#3B82F6), `brand-success` (#10B981), `brand-danger` (#EF4444).
- **Responsive**: Mobile-first with `md:` breakpoint. Sidebar on desktop, bottom nav bar on mobile. Tables use `hidden md:block` / `md:hidden` for desktop table / mobile card toggles.
- **Icons**: Lucide React (`lucide-react`) exclusively for all UI icons.
- **Dark theme**: `body` class `bg-brand-dark text-slate-100 min-h-screen` in `index.html`.
- **Custom scrollbar**: `::-webkit-scrollbar` styling in `src/index.css` matching brand colors.

### Error Handling

- All async operations wrapped in `try/catch` — errors logged to `console.error` and surfaced as dismissible inline alert banners (not toasts or modal dialogs).
- TradeModal performs client-side field validation before submission.
- Auth component maps Firebase `auth/` error codes to user-friendly strings.
- FirebaseSetup accepts pasted JSON config or regex-fallback extraction with validation.

### Data Layer Conventions

- **Firebase lazy init** (`src/utils/firebase.ts`): Supports both `VITE_FIREBASE_*` env vars (build-time) and localStorage config (runtime). Singleton pattern with module-level `let` variables. Exports getter functions (`getFirebaseAuth()`, `getFirestoreDb()`) that initialize on first call.
- **Firestore CRUD** (`src/utils/api.ts`): Singleton `api` object with 8 methods. PnL computed client-side via `calculateTradePnL()`. Account capital updated atomically via Firebase `increment()`. Batch writes for cascade deletes and CSV import (batches of 490 to stay under Firestore limit).
- **Stats computation** (`src/utils/stats.ts`): Pure function `calculateStats(trades) → DashboardStats`. No side effects, no Firebase dependency. Computes cumulative PnL, win rate, profit factor, avg win/loss, PnL by setup, win/loss counts.

### Data Flow & State

- **No prop drilling beyond 1 level** — App.tsx passes directly to the active tab component.
- **Callbacks**: Named `onRefresh`, `onClose`, `onImportSuccess`, `onViewJournal`, `onResetConfig`, `onConfigured`.
- **Modal pattern**: TradeModal receives `trade` (null = create, object = edit), `onClose`, `onRefresh`. Visibility controlled by parent state. Account modals are inline in App.tsx.
- **Active account**: Persisted via `localStorage` keyed by user UID.
- **No React Router**: Tab switching via `activeTab` state + conditional rendering.
- **All dates**: ISO 8601 strings. Components split on `'T'` for display.

### Duplicate Patterns (notable)

- **`formatCurrency`** — standalone helper duplicated across Dashboard, Journal, TradeModal, CalendarView, and App.tsx (each defines its own). Uses `Intl.NumberFormat`, prepends `+`/`-`.

### Backend Patterns (local dev only)

- **Database**: `bun:sqlite` with raw SQL queries (no ORM). Database file is `trades.db` at project root (gitignored).
- **PnL calculation**: Server-side on create/update. Formula:
  - `LONG`: `(exit_price - entry_price) * quantity - fee`
  - `SHORT`: `(entry_price - exit_price) * quantity - fee`
  - No exit price → status `OPEN`, pnl = `-fee`
- **Stats aggregation**: Single `getStats()` queries all trades, loops in memory computing running total, win/loss counts, setup grouping, and chronological cumulative PnL.
- **API routing**: Raw `fetch` handler on `Bun.serve` — no Express, Elysia, or Hono. Manual route matching on URL pathname.
- **CSV import**: Server-side parser handles quoted fields, validates headers client-side before sending.
- **Static serving**: For non-`/api` paths, serves files from `dist/` with SPA fallback to `dist/index.html`.

## Important Files

| File | Role |
|---|---|
| `src/main.tsx` | Entry point — React 18 `createRoot` with StrictMode |
| `src/App.tsx` | Root component — global state, auth, accounts, tabs, all modals |
| `src/types.ts` | `Trade`, `BrokerAccount`, `DashboardStats` interfaces |
| `src/utils/firebase.ts` | Firebase lazy initialization — config, auth, firestore singletons |
| `src/utils/api.ts` | Firestore CRUD operations (8 methods on `api` object) |
| `src/utils/stats.ts` | Pure `calculateStats()` function |
| `src/components/Dashboard.tsx` | KPI cards + Recharts (Line, Pie, Bar) + recent trades |
| `src/components/Journal.tsx` | Trade table with filters, sort, pagination, inline TradeModal |
| `src/components/TradeModal.tsx` | Create/edit trade form with validation |
| `src/components/CalendarView.tsx` | Monthly calendar with daily PnL badges (pure derivation) |
| `src/components/ImportExport.tsx` | CSV/JSON export, CSV file/paste import |
| `src/components/Auth.tsx` | Email/password + Google sign-in/sign-up |
| `src/components/FirebaseSetup.tsx` | Firebase config input (JSON paste or manual fields) |
| `server/db.ts` | SQLite schema, CRUD, PnL calc, stats aggregation (local dev) |
| `server/index.ts` | Bun HTTP server, routing, CORS, CSV import, static files (local dev) |
| `vite.config.ts` | Dev server port (3000), API proxy (→3001) |
| `tailwind.config.js` | Brand colors, content paths |
| `firebase.json` | Firebase Hosting config — public dir, SPA rewrites, cache headers |
| `firestore.rules` | Security rules — user-scoped read/write by `request.auth.uid` |
| `firestore.indexes.json` | Composite index definitions (empty — single-field queries covered) |
| `.env` | Gitignored — `VITE_FIREBASE_*` credentials for build-time embedding |

## Runtime/Tooling Preferences

- **Runtime**: Bun 1.3+ (required for `bun:sqlite` and `Bun.serve` in local dev). Production is Firebase Hosting (no Bun needed).
- **Package manager**: Bun (`bun install`, `bun add`, `bun run`).
- **Node.js**: Not used for local dev. Production deployment via Firebase CLI (`firebase deploy`).
- **No database migration tool**: SQLite schema auto-created on server start via `initDb()` (local dev). Firestore is schema-less.
- **No linter**: No ESLint, Prettier, or Biome configured. `tsc` provides type checking only.
- **Firebase CLI** (v15+) used for deployment.

## Testing & QA

- **No test framework installed** — no Jest, Vitest, or testing library in `package.json`.
- **Verification approach**: Manual integration tests via the browser. Build verification via `bun run build` (runs `tsc` + `vite build`).
- **Local smoke test**: `bun run build && cd dist && python3 -m http.server 8080` — open `http://localhost:8080` to verify the SPA works without Firebase (will show FirebaseSetup screen).
- **Deployment verification**: `bun run deploy:all` — then open the Firebase Hosting URL to confirm Auth flow, Firestore reads/writes, and SPA routing work.
