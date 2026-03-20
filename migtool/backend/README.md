# Migtool API

FastAPI backend for Migtool. Serves the built frontend from `backend/static/`.

## Run

From the repo root:

```bash
docker compose up --build -d
```

Rebuild and restart only the API (e.g. after `requirements.txt` changes):

```bash
docker compose up --build -d api
```

Restart without rebuilding:

```bash
docker compose restart api
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

## Projects API

Tables (`projects`, `directus_targets`, `migration_runs`, …) are created on API startup (`create_all`). Restart the API after pulling model changes:

```bash
docker compose restart api
```

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/projects` | List current user's projects |
| `POST` | `/api/projects` | Create (`name`, optional `note`) |
| `GET` | `/api/projects/{id}` | Detail + Directus targets |
| `POST` | `/api/projects/{id}/targets` | Add Directus target |
| `POST` | `/api/projects/{id}/targets/{tid}/activate` | Set active target |
| `POST` | `/api/projects/{id}/targets/{tid}/test` | Probe Directus (`GET /users/me`) |
| `POST` | `/api/projects/{id}/targets/{tid}/migrate` | Start import from `prepared/target_{tid}/` (optional body: `schema`/`data`/`files`/`flows` booleans) |
| `GET` | `/api/projects/{id}/targets/{tid}/migrate` | Latest migration run status |
| `GET` | `/api/projects/{id}/targets/{tid}/migrate/{run_id}` | One migration run |

Prepared layout (same as `directus-scripts` export):

```text
uploads/project_{id}/prepared/target_{tid}/
  schema/  data/  files/  flows/
  files_metadata.json  folders.json
```

Import logic is vendored from `directus-scripts/import_directus.py` as `app.services.directus_import`.

All project routes require the session cookie.

Directus static tokens are encrypted at rest with Fernet (`TOKEN_ENCRYPTION_KEY` in `.env`).
Generate a key:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

If `directus_targets` already exists with a short `token` column, widen it once:

```bash
docker compose exec db mysql -umigtool -pmigtool migtool \
  -e "ALTER TABLE directus_targets MODIFY token TEXT NOT NULL;"
```
