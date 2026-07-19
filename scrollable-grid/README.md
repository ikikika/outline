# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  # Hexboard

  A browser-based hexagonal game-board editor built with React, TypeScript, and Vite.

  ## Development

  ```sh
  npm install
  npm run dev
  ```

  Run the production typecheck/build with `npm run build` and lint with `npm run lint`.

  ## Current scope

  Phase 2 establishes the typed logical board model, rectangular and hexagonal board initialization, water defaults, configuration validation, and immutable board state updates. SVG board geometry and interactive editing are planned for later phases. Unit tests and test-framework dependencies are deferred.

  See [docs/context.md](docs/context.md) for the architecture and [docs/implementation-plan.md](docs/implementation-plan.md) for phase scope and acceptance criteria.
        tsconfigRootDir: import.meta.dirname,
