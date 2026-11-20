# CLAUDE.md — FitTrack Frontend (`client/`)

Engineering rules and constraints for AI agents working in `FitTrack-Frontend`. For visual styling rules, also follow [AGENT.md](./AGENT.md).

## Commands & Verification

```bash
npm start                      # Dev server on http://localhost:3000
npm test -- --watchAll=false   # ALWAYS pass --watchAll=false in non-interactive/CI runs
npm run build                  # Production bundle (uses CI=false)
```

- Run both `npm test -- --watchAll=false` and `npm run build` before marking frontend changes complete.

## CRA, CSP & Environment Rules

- Environment variables **must** use the `REACT_APP_` prefix (`process.env.REACT_APP_*`, never `import.meta.env`).
- **Never remove `INLINE_RUNTIME_CHUNK=false` from `.env.production`:** strict CSP in `vercel.json` and `nginx.conf` forbids `'unsafe-inline'` in `script-src`.
- Keep security headers and CSP directives synchronized between `vercel.json` and `nginx.conf` whenever adding external API, font, script, or frame origins.

## API, Auth & Server State

- **HTTP Client (`src/api/axiosClient.js`):** Always import `axiosClient` (or helpers in `src/api/index.js`). It attaches `Accept-Language`, attaches the Bearer access token from `src/api/tokenStore.js`, sets `withCredentials: true`, and performs single-flight silent refresh against `/auth/refresh` on `401`.
- **Auth Redirect Safety:** Keep `AUTH_PATHS` (`/login`, `/register`, `/reset-password`, `/verify-email`) excluded from `401` redirects in `axiosClient.js` so expected form errors do not cause redirect loops.
- **TanStack Query (`src/lib/queryClient.js`):** Use `queryKeys` consistently and call `invalidateWorkoutAndAnalytics()` after workout session, schedule, or progress mutations.

## Localization (`i18n`)

- Supported languages: `en` and `vi` across 9 namespaces under `src/locales/{en,vi}/`: `ai.json`, `auth.json`, `common.json`, `dashboard.json`, `errors.json`, `plan.json`, `profile.json`, `progress.json`, `workout.json`.
- Always update **both** `en` and `vi` JSON files when adding/changing UI copy.
- Map backend error codes via `getApiErrorMessage(...)` (`src/utils/localize.js`).

## Design System & Browser Resilience

- **Futuristic Sporty UI:** Follow [AGENT.md](./AGENT.md), `tailwind.config.js`, and `src/index.css` — `#050505` / `#0A0A0A` dark surfaces, `#CCFF00` Neon Lime primary accent, `#FF5C00` Neon Orange alert/secondary accent, `Barlow Condensed` italic uppercase headings, `Inter` body, `JetBrains Mono` numbers, `2px` sharp corners, `.ft-*` classes.
- **Google Translate DOM Safety:** Browser translation mutates bare conditional text nodes and crashes React reconciliation. Wrap conditional text inside `<span>` tags, use stable `key`s on lists, and keep pages wrapped cleanly inside `ErrorBoundary.jsx`.
- **IME Input Stability:** Preserve `usePreventImeScrollJump()` in `src/App.js` to avoid viewport jumping during Vietnamese/CJK IME composition.

## Dependencies & Testing

- **Do not upgrade `i18next` or `react-i18next` casually:** `i18next@23` and `react-i18next@14` are pinned for clean CRA + React 19 compatibility.
- Component tests use `src/test-utils/queryTestUtils.js`, and Jest maps `react-router-dom` to `src/test-utils/reactRouterDomMock.js` in `package.json`.

## Git Hygiene

- Always run `git fetch origin` and branch new work from `origin/master`. Never commit `.env`.
