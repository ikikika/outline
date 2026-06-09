# React Starter

Enterprise-oriented React + TypeScript starter with:

- Feature-based architecture
- Atomic Design component organization
- Auth strategy abstraction
- Theme provider with tokenized styling
- Shared HTTP client layer

## Start Here

- Setup, structure, and conventions: [ARCHITECTURE.md](ARCHITECTURE.md)
- Agent workflow instructions: [copilot-instructions.md](.github\copilot-instructions.md)

## Scripts

- `npm run dev` start development server
- `npm run build` build production assets
- `npm run lint` run lint checks
- `npm run preview` preview production build

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

## Module Federation (Webpack)

This starter now supports Webpack Module Federation while keeping the existing Vite workflow.

### Install dependencies

```bash
npm install
```

### Federation scripts

- `npm run dev:mf` run Webpack dev server using env vars (`MF_MODE`, `PORT`, etc.)
- `npm run build:mf` production build using env vars

Pass mode with `--env mode=...`:

```bash
npm run dev:mf -- --env mode=standalone
npm run dev:mf -- --env mode=host
npm run dev:mf -- --env mode=remote
npm run build:mf -- --env mode=standalone
npm run build:mf -- --env mode=host
npm run build:mf -- --env mode=remote
```

### Runtime configuration

The Webpack federation config is in `config-webpack/webpack.common.cjs` and supports these env values:

- `MF_MODE`: `standalone`, `host`, or `remote`
- `MF_NAME`: federation container name (default: `react_starter`)
- `PORT`: dev server port
- `MF_REMOTES`: comma-separated remote mappings for host mode
- `MF_EXPOSES`: comma-separated expose mappings for remote mode

Mapping format for `MF_REMOTES` and `MF_EXPOSES` is:

```text
key=value,key2=value2
```

By default, these values are loaded from `.env`.

### `.env` configuration for MF

Set MF values in `.env`:

```env
MF_MODE=host
MF_NAME=react_starter
PORT=3000
MF_REMOTES=profile=profile@http://localhost:3001/remoteEntry.js
MF_EXPOSES=./App=./src/app/App
```

Resolution priority is:

1. CLI `--env` values
2. Process env values (`$env:...`)
3. `.env` values
4. Hardcoded fallback in Webpack config

This means you can run host/remote with one command using `.env` defaults and override when needed.

### config-webpack folder status (microfrontend-ready)

The `config-webpack` folder is now aligned with this repo's active Module Federation implementation.

- `config-webpack/webpack.common.cjs` contains the shared Module Federation config
- `config-webpack/webpack.dev.cjs` uses development mode
- `config-webpack/webpack.prod.cjs` uses production mode

Use these scripts if your team prefers the `config-webpack` convention:

- `npm run dev:mf`
- `npm run build:mf`

Pass mode at runtime (same as main MF scripts):

```bash
npm run dev:mf -- --env mode=host
npm run dev:mf -- --env mode=remote
npm run build:mf -- --env mode=host
npm run build:mf -- --env mode=remote
```

All mode values resolve from `.env` unless overridden by process env or `--env`.

### Use as standalone project

Run it as a normal app through Webpack (no remotes required):

```bash
npm run dev:mf -- --env mode=standalone
```

### Use as a remote microfrontend

By default, remote mode exposes `./App` from `./src/app/App` and emits `remoteEntry.js`.

```bash
npm run dev:mf -- --env mode=remote
```

Using generic script with config-file mode values:

```bash
npm run dev:mf -- --env mode=remote
```

Remote entry URL example:

```text
http://localhost:3001/remoteEntry.js
```

Custom remote name and extra exposed modules:

```bash
MF_NAME=profile MF_MODE=remote MF_EXPOSES=./App=./src/app/App,./routes=./src/app/routes/index.ts npm run dev:mf
```

Note for Windows PowerShell:

```powershell
$env:MF_NAME='profile'; $env:MF_MODE='remote'; $env:MF_EXPOSES='./App=./src/app/App,./routes=./src/app/routes/index.ts'; npm run dev:mf
```

### Use as a host microfrontend shell

Provide remotes using `MF_REMOTES`:

```bash
MF_MODE=host MF_REMOTES=profile=profile@http://localhost:3001/remoteEntry.js npm run dev:mf
```

Using generic script with config-file mode values:

```bash
npm run dev:mf -- --env mode=host
```

PowerShell equivalent:

```powershell
$env:MF_MODE='host'; $env:MF_REMOTES='profile=profile@http://localhost:3001/remoteEntry.js'; npm run dev:mf
```

Then import remote modules in host code, for example:

```ts
const RemoteApp = React.lazy(() => import('profile/App'))
```

### Notes

- `src/main.tsx` uses async bootstrap (`import('./bootstrap')`) to support Module Federation shared module initialization.
- Existing Vite scripts (`npm run dev`, `npm run build`) are unchanged.
- Webpack HTML template is `index.webpack.html`.

## Stack

- React
- TypeScript
- Vite
- SCSS modules

