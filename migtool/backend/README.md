# Migtool API

FastAPI backend for Migtool.

## Run

From the repo root:

```bash
docker compose up --build -d
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs

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

Login with **username** + password (`POST /auth/login`).
