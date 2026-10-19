# Stock Trend Forecaster — Frontend

A complete, premium frontend for the Stock Trend Forecaster application. Built with React 19, Vite, Recharts, and a warm editorial design system. Fully integrated with the FastAPI machine learning backend for live S&P 500 (`^GSPC`) daily forecasts, model diagnostics, and experiment tracking.

---

## Quick start

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Available scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build for production (outputs to `dist/`) |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run Vitest test suite (single pass) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |

---

## Environment variables

Copy `.env.example` to `.env` to configure backend API connectivity:

```env
# Backend API Base URL (FastAPI)
VITE_API_BASE_URL=http://localhost:8000

# Set to "false" to use live FastAPI endpoints and PyTorch model predictions
VITE_USE_MOCKS=false
```

When `VITE_USE_MOCKS=false` and `VITE_API_BASE_URL` is set, the application connects to the live FastAPI backend. If the backend is unreachable or `VITE_USE_MOCKS=true`, the frontend gracefully falls back to deterministic mock data.

---

## Technology stack

| Library | Purpose |
|---------|---------|
| React 19 | UI framework |
| Vite 8 | Build tool and dev server |
| React Router v6 | Client-side routing |
| Recharts | Financial charts |
| Framer Motion | Animations and transitions |
| Lucide React | Icons (functional controls only) |
| React Hook Form | Form state management |
| Zod | Schema validation |
| @hookform/resolvers | Connects Zod to React Hook Form |
| @fontsource/fraunces | Display serif font (headlines) |
| @fontsource/dm-sans | UI sans-serif font (body, navigation) |
| @fontsource/jetbrains-mono | Monospace font (tickers, data, metadata) |
| Vitest | Unit and integration tests |
| React Testing Library | DOM testing utilities |

---

## Project structure

```
frontend/
  src/
    app/              # (reserved for app-level utilities)
    components/
      ui/             # Button, Input, Badge, Dialog, Toast, Tabs, etc.
      charts/         # (reusable chart wrappers — extend as needed)
      layout/         # AppShell, Sidebar, TopNav, MobileDrawer
    features/
      landing/        # Public landing page
      auth/           # Login, Signup, ForgotPassword, Onboarding
      dashboard/      # /app/dashboard
      stocks/         # /app/stocks, /app/stocks/:ticker
      forecasts/      # /app/forecast/:ticker
      watchlist/      # /app/watchlist
      portfolio/      # /app/portfolio
      predictions/    # /app/predictions
      backtest/       # /app/backtest
      model-card/     # /app/model-card
      settings/       # /app/settings
      scientist/      # /scientist/* (all scientist workspace pages)
    services/         # stockService.js — mock-or-real service interface
    mocks/            # Deterministic demo data (stocks, OHLCV, forecasts, etc.)
    hooks/            # useAuth, useTheme, useWatchlist
    lib/              # signals.js, dates.js — pure utility functions
    routes/           # ProtectedRoute, PublicOnlyRoute
    styles/           # tokens.css, base.css, utilities.css
    test/             # Test setup and test files
    main.jsx          # Entry point
    App.jsx           # Root router
  public/
    favicon.svg
  .env.example
  README.md
  MOCKS_AND_BACKEND_TODO.md
```

---

## Routes

### Public
| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Demo login |
| `/signup` | Demo sign-up |
| `/forgot-password` | Forgot password UI |
| `/onboarding` | Workspace role selection |

### User workspace (requires demo auth)
| Route | Description |
|-------|-------------|
| `/app/dashboard` | Market overview and signal summary |
| `/app/stocks` | Searchable, sortable stock table |
| `/app/stocks/:ticker` | Historical chart, OHLC, forecast summary |
| `/app/forecast/:ticker` | Full forecast analysis page |
| `/app/watchlist` | Personal watchlist with add/remove |
| `/app/portfolio` | Multi-stock performance comparison |
| `/app/predictions` | Paginated prediction history ledger |
| `/app/backtest` | Strategy simulation studio |
| `/app/model-card` | Verified model architecture and limitations |
| `/app/settings` | Theme, preferences, session management |

### Data Scientist workspace (requires demo auth)
| Route | Description |
|-------|-------------|
| `/scientist/performance` | Model evaluation metrics |
| `/scientist/models` | LSTM vs baseline comparisons |
| `/scientist/experiments` | Experiment log table |
| `/scientist/experiments/:id` | Experiment detail view |
| `/scientist/dataset` | Dataset metadata explorer |
| `/scientist/model-card` | Technical model card with full config |

---

## Authentication

Authentication is a **demo flow only**. There is no real backend, no password hashing, and no production security.

- Enter any valid email and a password of 6+ characters to log in
- Session is stored in `localStorage` and expires after 7 days
- Roles: `user` (investor workspace) or `scientist` (technical workspace)
- Switch roles at any time from Settings

---

## Mock data

All mock data is located in `src/mocks/`:

| File | Contents |
|------|----------|
| `stocks.js` | 11 demo tickers with prices, signals |
| `ohlcv.js` | Deterministic 2-year OHLCV series |
| `forecasts.js` | Illustrative next-day forecasts |
| `model.js` | Verified model config + unavailable metrics |
| `predictions.js` | 60-day prediction history log |
| `experiments.js` | 9 illustrative experiment records |

**Every mock value is clearly labeled in the UI** as "Demo data", "Illustrative", or "Unavailable". No mock value is presented as a genuine market price, model metric, or trading result.

---

## Design system

The design uses three font families and a warm-editorial / cool-analytical dual color palette:

- **Display:** Fraunces (headlines, financial figures)
- **UI:** DM Sans (navigation, body, forms)
- **Data:** JetBrains Mono (tickers, values, metadata)

Colors, spacing, radii, and motion durations are defined as CSS custom properties in `src/styles/tokens.css`. Light and dark themes are implemented via `html.dark` class. Theme preference is persisted in `localStorage`.

---

## Backend Integration & System Disclosures

- **Live FastAPI Integration:** Fully integrated with the FastAPI backend (`http://localhost:8000`). When running with `VITE_USE_MOCKS=false`, the Dashboard, Forecast, Model Card, Predictions, and Data Scientist views load genuine daily market data, PyTorch LSTM predictions, and SQLite experiment logs.
- **Instrument Scope:** Dedicated strictly to the S&P 500 Index (`^GSPC`). Single-stock equity prototypes have been removed to preserve architectural integrity.
- **Market Data Observations:** Data fetched via Yahoo Finance represents the latest available daily end-of-day Close, not real-time tick data.
- **Model Card & Metrics:** The Model Card and Performance pages dynamically query `GET /api/model/config` and `GET /api/model/metrics` to display verified hyperparameters and held-out test evaluation benchmarks (RMSE: 0.009655, MAE: 0.006537, DA: 55.39%).
- **Backtesting Studio:** An illustrative heuristic strategy simulator with moving threshold controls. It is strictly separated from genuine LSTM inference and does not imply guaranteed trading profitability.
- **Authentication & RBAC:** Client-side role routing (`user` vs. `data-scientist`) provides intuitive navigation between workspaces. For multi-tenant production deployments, backend token authentication (JWT/OAuth2) is recommended for mutating endpoints.
