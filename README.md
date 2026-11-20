# FitTrack Frontend

Web client for the **FitTrack** fitness tracking, training planning, and AI coaching platform — built with **React 19**, **Tailwind CSS**, **TanStack Query v5**, and **i18next** (`en` / `vi`).

- **Live App:** https://fittrack.io.vn (and https://www.fittrack.io.vn)
- **Backend API:** https://api.fittrack.io.vn/api
- **Hosted On:** Vercel (`vercel.json`)

---

## Key Features

- **Authentication & Sessions**
  - Email/password login, registration, email verification, and password reset.
  - Google Sign-In (`GoogleLoginButton`) synced with backend multi-audience verification.
  - Short-lived access token in `tokenStore` paired with automatic single-flight silent refresh via `HttpOnly` refresh cookies (`src/api/axiosClient.js`).
- **Training & Schedule Management**
  - **Workout Planning & Weekly Plan Builder:** Create workout templates, build 7-day schedules, swap days, and manage plans even while a week is active.
  - **Weekly Plan Library & Weekly Calendar:** Start schedules from templates, mark workout days or full weeks complete, and adjust days on the fly.
  - **Active Workout (`/workout/:id`) & History:** Live set/rep/weight tracking and historical session review.
- **Progress & Strength Analytics**
  - Body weight & body fat history logging alongside interactive **Recharts** visualizations for strength progression, weekly volume, and workout stats.
- **AI Coach & MCP Integration**
  - Global floating **AI Coach** drawer (`AiCoachWidget` + `MarkdownMessage`) with conversation history, grounded sports-science citations, and one-click **Apply Plan** for AI-drafted schedules.
  - Manage personal MCP API keys in **Profile** for connecting external AI clients to FitTrack's `/mcp` server.
- **Bilingual UI & Browser Resilience**
  - Instant **English / Vietnamese** switching (`LanguageSwitcher`) synced with the backend `Accept-Language` header and `users.preferredLanguage`.
  - Dynamic announcement banner & hero background loaded from `/api/site-config`.
  - Protected against Chrome Google Translate DOM crashes (`ErrorBoundary` + `<span>` wrappers) and CJK/Vietnamese IME scroll jumps (`usePreventImeScrollJump`).

---

## Tech Stack

| Layer | Technology |
|---|---|
| **UI & Routing** | React `19.1.0`, React Router DOM `7.11.0` |
| **Server State & HTTP** | `@tanstack/react-query` `5.107.1`, `axios` `1.13.2` |
| **Styling & Icons** | Tailwind CSS `3.4.1`, `lucide-react` `0.562.0` |
| **Charts** | `recharts` `3.6.0` |
| **Localization** | `i18next` `23.16.8`, `react-i18next` `14.1.3`, `i18next-browser-languagedetector` `7.2.2` |
| **Tooling & Testing** | Create React App (`react-scripts` `5.0.1`), Jest + React Testing Library |
| **Deployment** | Vercel (`vercel.json`), Docker + Nginx (`Dockerfile`, `nginx.conf`) |

---

## Project Structure

```text
client/
├── .github/workflows/pipeline.yaml   # CI: Jest tests, CRA production build, Nginx Docker build check
├── Dockerfile                        # Multi-stage Node 24 build + nginx:alpine server
├── nginx.conf                        # SPA fallback + security headers synced with vercel.json
├── vercel.json                       # SPA rewrites + strict CSP & security headers
├── tailwind.config.js                # Futuristic Sporty theme tokens (neon lime/orange, dark surfaces)
├── AGENT.md                          # Futuristic Sporty visual design specification
└── src/
    ├── App.js                        # QueryClientProvider, AuthProvider, routes, site-config, AiCoachWidget
    ├── index.css                     # Google Fonts & .ft-* utility/component classes
    ├── api/
    │   ├── axiosClient.js            # Base Axios client, Accept-Language, single-flight 401 refresh
    │   ├── tokenStore.js             # Access token & auth-failure event bridge
    │   └── index.js                  # Grouped API modules (auth, user, workout, plan, schedule, analytics, ai, etc.)
    ├── components/                   # AiCoachWidget, MarkdownMessage, GoogleLoginButton, LanguageSwitcher,
    │                                 # ProtectedRoute, ErrorBoundary
    ├── context/AuthContext.jsx       # Auth state hydration & login/googleLogin/logout actions
    ├── hooks/                        # useAuth, usePreventImeScrollJump
    ├── i18n/index.js                 # i18next config (en/vi)
    ├── lib/queryClient.js            # TanStack Query client, queryKeys, cache invalidation helpers
    ├── locales/{en,vi}/              # 9 namespaces: ai, auth, common, dashboard, errors, plan, profile, progress, workout
    ├── pages/                        # All route views + co-located *.test.jsx suites
    ├── test-utils/                   # reactRouterDomMock.js, queryTestUtils.js
    └── utils/                        # localize.js (API error code mapping), formatters.js
```

---

## Local Setup & Environment Variables

### Prerequisites
- Node.js **24+** (matches CI `24.18.0`) and `npm`
- Running FitTrack Backend (`http://localhost:5000` locally or production API)

### Setup

```bash
npm ci
npm start   # http://localhost:3000
```

Create `.env` for local development (Create React App requires the `REACT_APP_` prefix):

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
```

Production settings live in `.env.production`:
- `REACT_APP_API_URL=https://api.fittrack.io.vn/api`
- `INLINE_RUNTIME_CHUNK=false` — emits the webpack runtime externally so `vercel.json` and `nginx.conf` can enforce a strict `script-src` Content Security Policy without `'unsafe-inline'`.

---

## Application Routes

| Path | Component | Access |
|---|---|---|
| `/` | `Login` | Public |
| `/login` | `Login` | Public |
| `/register` | `Register` | Public |
| `/verify-email`, `/verify-email/:token` | `VerifyEmail` | Public |
| `/reset-password`, `/reset-password/:token` | `ResetPassword` | Public |
| `/dashboard` | `Dashboard` | Protected |
| `/profile` | `Profile` | Protected |
| `/workout-planning` | `WorkoutPlanning` | Protected |
| `/weekly-planning/:id?` | `WeeklyPlanBuilder` | Protected |
| `/weekly-plan-library` | `WeeklyPlanLibrary` | Protected |
| `/weekly-schedule` | `WeeklyCalendar` | Protected |
| `/workout-history` | `WorkoutHistory` | Protected |
| `/progress-tracking` | `ProgressTracking` | Protected |
| `/workout/:id` | `ActiveWorkout` | Protected |

---

## Scripts, CI/CD & Deployment

```bash
npm start                      # Start local dev server (port 3000)
npm test -- --watchAll=false   # Run unit/component tests once (CI mode)
npm run build                  # Production build into ./build (CI=false)
```

- **GitHub Actions (`.github/workflows/pipeline.yaml`):** Runs `npm ci`, `npm test -- --watchAll=false`, `npm run build`, and validates the multi-stage `Dockerfile` (`nginx:alpine`).
- **Vercel:** Automatically builds and deploys `master` and preview branches using `vercel.json` SPA rewrites and strict CSP/security headers.
