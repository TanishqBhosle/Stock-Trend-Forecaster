# Stock Trend Forecaster — Frontend

A complete, premium frontend for the Stock Trend Forecaster application. Built with React, Vite, and a warm editorial design system.

> **Demo application.** All market data, forecasts, model metrics, and backtest results are illustrative demo values. This is not a financial advisory tool.

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

Copy `.env.example` to `.env` and configure as needed:

```env
# Leave empty to use mock data
VITE_API_BASE_URL=

# Set to "true" to use deterministic demo data
VITE_USE_MOCKS=true
```

When `VITE_API_BASE_URL` is empty, the application always uses mock data regardless of `VITE_USE_MOCKS`.

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

## Known limitations

- All financial data is illustrative demo data, not live market data
- Model evaluation metrics are unavailable (no saved training artifacts in this deployment)
- Walk-forward validation is listed in the project roadmap but not yet implemented
- No backend, API, inference server, or brokerage integration exists
- The backtest engine is a deterministic demo simulator, not a real backtesting engine
- This frontend is not production-ready from a security standpoint (demo auth only)

See `MOCKS_AND_BACKEND_TODO.md` for the full integration checklist.
