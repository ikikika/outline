# Tempo (frontend)

React + TypeScript SPA for the Tempo time-management app: plan work on a timetable, track timers, and review how planned time compared to reality.

**Stack:** React 19 · TypeScript · Vite · React Query · React Router · SCSS modules · Tailwind / shadcn

## Start here

- Setup, structure, and conventions: [ARCHITECTURE.md](ARCHITECTURE.md)
- Backend API and deploy: [../be/README.md](../be/README.md)

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Type-check and build production assets |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build |
| `npm test` / `npx vitest run` | Unit tests |

## Environment

Create `.env` (or `.env.local`) with the API Gateway **root** URL (no `/api` suffix):

```env
VITE_API_URL=https://your-api-id.execute-api.region.amazonaws.com
```

The app builds `API_BASE_URL` as `{VITE_API_URL}/api`.

## App surfaces

| Route / area | What it does |
|--------------|--------------|
| **Timetable** | Day/week grid of schedule blocks; drag/resize; timers; Pomodoro break prompts |
| **Activities** | Catalog of activities and tasks; auto-schedule; adhoc tab |
| **Report** | Day/week metrics: estimates vs logged time, schedule fit, unplanned work |
| **Profile** | Theme, timetable hours, notifications (PWA push) |

### Timetable

- View day or week; zoom; show all hours vs profile visible range.
- **Add adhoc** — one-off or **repeating** blockers under the `adhoc-blocks` activity (`excludeFromReports: true`).
  - Repeating: start date, end date, days of the week (max 90 occurrences).
  - Creates one catalog task and one focus block per occurrence.
- **Start rest** — creates a 5-minute short break and starts its timer (disabled while another timer runs).
- Task detail modal: start/stop, finish session/task, skip, edit.
- **Adhoc delete menu** (adhoc only): **This block only** or **This and future blocks** for that task.

### Activities

- Active / archived / adhoc lists; priority reorder.
- Open unplanned tasks without a schedule block (synthetic `unscheduled:…` detail).
- Starting a timer on an **unplanned** task sets `startedFromUnplanned` so reports can attribute reactive work.
- Completing a task with closed sessions creates **work-period** focus blocks (planned window = actual session) and removes leftover planned focuses plus following Pomodoro rests.

### Reports

Built from timetable blocks + time entries (adhoc blockers excluded).

| Insight | Meaning |
|---------|---------|
| Planned / actual / variance / accuracy | Task **estimate** (`timeEstimationSeconds`) vs logged time |
| Completion / coverage | Done vs planned; how many blocks have logged time |
| Category mix | Planned vs actual share by category |
| Over / under / on target / untracked | Estimate calibration (±10% = on target) |
| **Schedule fit** | Share of logged work that fell inside the planned timetable window (not meaningful for work-period clones) |
| **Unplanned** | Share of actual time from tasks with `startedFromUnplanned` |
| Schedule drift / unplanned work lists | Worst off-slot planned blocks; reactive tasks with logged time |

## Domain model (frontend)

- **Activity** — catalog group (course, project, …).
- **Task** — catalog work item (`unplanned` → `planned` → `in_progress` → `done` / `skipped`).
- **Schedule block** — timed timetable placement (`focus` / `short_break` / `long_break`).
- **Time entry** — timer or manual log against a `taskId`.

Special activity ids: `adhoc-blocks` (report-excluded blockers), `pomodoro-breaks` (rests).

## Project layout

```
src/
├── app/           # Providers, router
├── components/    # Shared UI
├── core/          # Constants, time zone helpers
├── features/      # Domain: activities, auth, reports, notifications
├── pages/         # TimetablePage, ActivitiesPage, ReportPage, …
└── services/      # HTTP client
```

Feature modules expose public APIs via `index.ts`. Prefer `@/` imports.

## Install as a PWA (phone)

Tempo can be installed as a Progressive Web App. Use a **production HTTPS** URL (or a trusted tunnel). Localhost works for Android Chrome testing; iOS needs a real HTTPS origin for a useful install.

After install, enable push under **Profile → Notifications**. On iPhone, you must open the app from the Home Screen icon before enabling notifications.

### iOS (iPhone / iPad)

1. Open the site in **Safari** (not Chrome or other browsers).
2. Tap **Share** (square with an arrow).
3. Tap **Add to Home Screen**.
4. Confirm the name (**Tempo**) and tap **Add**.
5. Launch Tempo from the new Home Screen icon (standalone, no Safari chrome).

Notes:

- Push notifications require **iOS 16.4+** and only work when the app was added to the Home Screen and opened from that icon.
- If **Add to Home Screen** is missing, scroll the Share sheet or check Safari settings.

### Android

1. Open the site in **Chrome**.
2. Use one of:
   - Chrome’s **Install app** / **Add to Home screen** banner or menu item, or
   - Chrome menu (⋮) → **Install app** / **Add to Home screen**.
3. Confirm, then open Tempo from the Home Screen / app drawer icon.

Notes:

- Chrome may show an install prompt automatically when the PWA criteria are met (HTTPS, manifest, service worker).
- You can also use **Profile → Notifications** from a Chrome tab on Android; installing still gives the best app-like experience.

## Module Federation (optional)

Webpack Module Federation remains available alongside Vite:

- `npm run dev:mf` / `npm run build:mf`
- Modes: `standalone`, `host`, `remote` via `--env mode=…` or `.env` (`MF_MODE`, `MF_NAME`, `PORT`, `MF_REMOTES`, `MF_EXPOSES`)

See `config-webpack/` for shared Webpack config. Day-to-day development uses Vite (`npm run dev`).

## Stack

- React 19, TypeScript, Vite
- TanStack Query, React Hook Form + Zod
- SCSS modules, Tailwind 4, shadcn/ui
- Vitest + Testing Library
