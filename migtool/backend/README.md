# Migtool API

FastAPI backend for Migtool. Serves the built frontend from `backend/static/`.

## Run

From the repo root:

```bash
docker compose up --build -d
```

App (SPA): http://localhost:8000  
API: http://localhost:8000/api  
Docs: http://localhost:8000/docs  
Health: http://localhost:8000/api/health

Compose bind-mounts `./backend` over the image, so rebuild the UI on the host when you change frontend source:

```bash
cd frontend && npm run build
```

That writes assets into `backend/static/`. Dev UI can still use Vite separately:

```bash
cd frontend && npm run dev
```

## Seed sample data

Inserts demo users (skips any that already exist):

```bash
docker compose exec api python -m app.scripts.seed
```

| username | email | password |
|----------|--------|----------|
| `maya` | maya.chen@acme.studio | `password123` |
| `jordan` | jordan.lee@acme.studio | `password123` |
| `sam` | sam.okonkwo@acme.studio | `password123` |

Login with **username** + password (`POST /api/auth/login`).
