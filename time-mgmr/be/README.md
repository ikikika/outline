# time-mgmr Backend

Serverless REST API for the Tempo time-management app.

**Stack:** SST v3 · AWS Lambda · API Gateway HTTP API · DynamoDB · Hono

All routes are served under the **`/api`** prefix (for example `/api/health`, `/api/auth/login`).

---

## Prerequisites

- Node.js 20+
- npm
- An AWS account with permission to create Lambda, API Gateway, and DynamoDB resources
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) v2 installed and configured (see below)

---

## AWS CLI setup

SST deploys to your AWS account using the credentials and region from the AWS CLI.

### 1. Install AWS CLI v2

**macOS (Homebrew)**

```bash
brew install awscli
```

**Linux / other**

Follow the [official install guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).

Verify installation:

```bash
aws --version
# aws-cli/2.x.x ...
```

### 2. Create an IAM user (recommended for local dev)

In the [AWS IAM console](https://console.aws.amazon.com/iam/):

1. Create a user (e.g. `time-mgmr-dev`).
2. Attach a policy with enough access to manage Lambda, API Gateway, DynamoDB, CloudFormation, S3, IAM (SST creates/updates these). For personal dev, `AdministratorAccess` is simplest; for tighter access, use a custom policy scoped to your account.
3. Under **Security credentials**, create an **Access key** (use “CLI” as the use case).
4. Save the **Access key ID** and **Secret access key** — the secret is shown only once.

You can also use [AWS IAM Identity Center (SSO)](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html) instead of long-lived access keys if your organization provides it.

### 3. Configure credentials

Run:

```bash
aws configure
```

You will be prompted for:

| Prompt | Example | Notes |
|--------|---------|--------|
| AWS Access Key ID | `AKIA...` | From the IAM access key |
| AWS Secret Access Key | `wJalr...` | From the IAM access key |
| Default region name | `ap-southeast-1` | Must match where you want resources deployed |
| Default output format | `json` | Optional; `json` is fine |

This writes credentials to `~/.aws/credentials` and settings to `~/.aws/config`.

**Optional — named profile** (useful if you have multiple AWS accounts):

```bash
aws configure --profile time-mgmr
```

Then either export the profile before running SST:

```bash
export AWS_PROFILE=time-mgmr
npm run deploy
```

Or add to your shell profile:

```bash
export AWS_PROFILE=time-mgmr
```

### 4. Verify access

```bash
aws sts get-caller-identity
```

Expected output:

```json
{
  "UserId": "AIDAXXXXXXXXXXXXXXXXX",
  "Account": "123456789012",
  "Arn": "arn:aws:iam::123456789012:user/time-mgmr-dev"
}
```

If this fails, check the access key, region, and that the IAM user has the required permissions.

### 5. Region

Set the same region in `aws configure` that you intend to deploy to. SST uses the configured default region unless overridden. The example frontend URL in this repo uses `ap-southeast-1`; pick a region close to your users and stick with it for dev and prod.

---

## Install

```bash
cd be
npm install
```

---

## Local development

Start the SST dev environment (deploys to your personal stage and watches for changes):

```bash
npm run dev
```

When the stack is ready, SST prints outputs including:

- **API URL** — API Gateway base URL (append `/api` for route paths)
- **Table name** — DynamoDB table for seed scripts

Outputs are also written to `.sst/outputs.json`.

Type-check:

```bash
npm run typecheck
```

---

## Deploy

### Development / personal stage

```bash
npm run deploy
```

Uses your default SST stage (usually your username).

### Production

```bash
npm run deploy:prod
```

Production uses stage `production`, retains resources on removal, and enables stack protection (see `sst.config.ts`).

### Remove a stage

```bash
npm run remove
```

---

## Secrets (production)

JWT secrets are defined in `sst.config.ts` as SST secrets:

- `JwtAccessSecret`
- `JwtRefreshSecret`

For production, set strong values via the SST secret workflow instead of relying on the dev defaults in config.

---

## Seed data

Seed scripts talk to DynamoDB directly. They resolve `TABLE_NAME` from `.sst/outputs.json` after `sst dev` or `sst deploy`, or you can set it manually.

### 1. Create a user

```bash
npm run seed:user -- you@example.com yourpassword "Your Name"
```

Password must be at least 8 characters.

### 2. Load activities and scheduled tasks

```bash
npm run seed:data -- you@example.com 2026-07-21
```

This script:

1. Upserts activities from `../fe/public/activities.json`
2. Upserts tasks from `../fe/public/tasks.json` (ISO `plannedStart` / `plannedEnd`, `timeEstimationSeconds`)

Optional second argument is a fallback calendar date (`YYYY-MM-DD`, default `2026-07-21`) used when a task has no embedded date in `plannedStart`.

---

## Frontend configuration

Set the API Gateway **root** URL in the frontend (no `/api` suffix):

```env
VITE_API_URL=https://your-api-id.execute-api.region.amazonaws.com
```

The frontend appends `/api` automatically in `API_BASE_URL`.

---

## Authentication

Protected routes require a Bearer token from login:

```http
Authorization: Bearer <access_token>
```

| Endpoint | Auth |
|----------|------|
| `GET /api/health`, `GET /api/health/dynamo` | No |
| `POST /api/auth/login`, `POST /api/auth/refresh` | No |
| `POST /api/auth/logout` | Optional Bearer |
| `GET /api/auth/me` | Yes |
| All `/api/activities/*` and `/api/tasks/*` | Yes |

---

## API reference

Base URL placeholder: `{API_URL}/api`

### Health

#### `GET /api/health`

Liveness check.

**Response `200`**

```json
{
  "ok": true,
  "service": "time-mgmr-api",
  "table": "time-mgmr-dev-TimeMgmrTableTable-xxxxx"
}
```

#### `GET /api/health/dynamo`

Verifies DynamoDB connectivity (scan limit 1).

**Response `200`**

```json
{
  "ok": true,
  "table": "time-mgmr-dev-TimeMgmrTableTable-xxxxx"
}
```

---

### Auth

#### `POST /api/auth/login`

**Request body**

```json
{
  "email": "you@example.com",
  "password": "yourpassword"
}
```

**Response `200`**

```json
{
  "user": {
    "id": "uuid",
    "name": "Your Name",
    "displayName": "Your Name",
    "email": "you@example.com",
    "role": "user",
    "themePreference": "system",
    "createdAt": "2026-07-20T12:00:00.000Z",
    "updatedAt": "2026-07-20T12:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:** `400` / `401` with `{ "error": "message" }`

---

#### `GET /api/auth/me`

**Headers:** `Authorization: Bearer <token>`

**Response `200`** — `IUser` object (same shape as `user` in login response)

---

#### `POST /api/auth/refresh`

**Request body**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response `200`**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

#### `POST /api/auth/logout`

**Headers:** `Authorization: Bearer <token>` (optional)

**Request body** (optional)

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** `204 No Content`

---

### Activities (catalog)

`categoryId` values: `work` | `deep_work` | `admin` | `personal` | `break`

#### `GET /api/activities`

List all activities for the authenticated user.

**Response `200`**

```json
[
  {
    "id": "github-copilot",
    "title": "GitHub Copilot for Agentic Coding...",
    "categoryId": "admin",
    "notes": "Inbox zero, pick top 3 for the day",
    "createdAt": "2026-07-18T20:00:00.000Z",
    "updatedAt": "2026-07-18T20:00:00.000Z"
  }
]
```

---

#### `GET /api/activities/:id`

**Response `200`** — single activity (same shape as above)  
**Response `404`** — `{ "error": "Activity not found" }`

---

#### `POST /api/activities`

Create or upsert an activity.

**Request body**

```json
{
  "id": "github-copilot",
  "title": "GitHub Copilot for Agentic Coding. Use GitHub Copilot AI to generate code, build apps, + more. (GitHub Copilot 2026)",
  "categoryId": "admin",
  "notes": "Inbox zero, pick top 3 for the day"
}
```

Required fields: `title`, `categoryId`, `notes`.  
Optional: `id` — generated by the server when omitted.  
`categoryId` must be one of: `work`, `deep_work`, `admin`, `personal`, `break`.  
Do not send `createdAt` or `updatedAt`; the server sets them.

**Response `201`** — created activity with server-generated `id` (if omitted), `createdAt`, and `updatedAt`

**Error `400`** — `{ "error": "..." }` when validation fails

---

### Tasks (timetable)

Tasks match the shape in `fe/public/tasks.json`.  
`plannedStart` and `plannedEnd` are ISO datetimes (e.g. `2026-07-22T10:44:00.000Z`).  
`status` values: `planned` | `in_progress` | `done` | `skipped`

#### `GET /api/tasks?date=YYYY-MM-DD`

Tasks for a single day (timetable day view).

**Example:** `GET /api/tasks?date=2026-07-22`

**Response `200`**

```json
[
  {
    "id": "49739779",
    "activityId": "the-complete-agentic-ai-engineering-course",
    "title": "Day 1 - Build Your First Autonomous AI Agent with n8n (No-Code Demo)",
    "plannedStart": "2026-07-22T10:44:00.000Z",
    "plannedEnd": "2026-07-22T11:05:45.000Z",
    "timeEstimationSeconds": 870,
    "categoryId": "admin",
    "notes": "",
    "status": "planned"
  }
]
```

---

#### `GET /api/tasks?from=YYYY-MM-DD&to=YYYY-MM-DD`

Tasks for a date range (timetable week view).

**Example:** `GET /api/tasks?from=2026-07-21&to=2026-07-27`

**Response `200`** — same task array shape as above

**Error `400`** if neither `date` nor both `from` and `to` are provided.

---

#### `GET /api/tasks/:id`

**Response `200`** — single task object (same shape as above)  
**Response `404`** — `{ "error": "Task not found" }`

---

#### `POST /api/tasks`

Create a scheduled task. `categoryId` inherits from the parent activity when omitted.

**Request body**

```json
{
  "id": "49739779",
  "activityId": "the-complete-agentic-ai-engineering-course",
  "title": "Day 1 - Build Your First Autonomous AI Agent with n8n (No-Code Demo)",
  "plannedStart": "2026-07-22T10:44:00.000Z",
  "plannedEnd": "2026-07-22T11:05:45.000Z",
  "timeEstimationSeconds": 870,
  "categoryId": "admin",
  "notes": "",
  "status": "planned"
}
```

Required fields: `activityId`, `title`, `plannedStart`, `plannedEnd`.  
Optional: `id` — generated by the server when omitted.  
Do not send `createdAt` or `updatedAt`; the server sets them internally.

**Response `201`** — created task (includes server-generated `id` when omitted)

---

## Example workflow (curl)

Replace `{API_URL}` with your API Gateway URL from `sst deploy`.

```bash
# Health
curl "{API_URL}/api/health"

# Login
TOKEN=$(curl -s -X POST "{API_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}' \
  | jq -r '.token')

# List activities
curl -H "Authorization: Bearer $TOKEN" "{API_URL}/api/activities"

# Tasks for a day
curl -H "Authorization: Bearer $TOKEN" "{API_URL}/api/tasks?date=2026-07-22"

# Tasks for a week
curl -H "Authorization: Bearer $TOKEN" \
  "{API_URL}/api/tasks?from=2026-07-21&to=2026-07-27"
```

---

## CORS

Allowed origins are configured in `sst.config.ts` and mirrored in `src/handlers/api.ts`:

- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `https://tempo.codeoctagon.com`

Add your production frontend origin to both places when deploying to a new domain.

---

## Project layout

```
be/
├── sst.config.ts          # Infrastructure (DynamoDB, API Gateway, secrets)
├── src/
│   ├── handlers/api.ts    # Hono app entry (mounts /api)
│   ├── routes/            # Route handlers
│   ├── repositories/      # DynamoDB access
│   ├── services/          # Auth
│   └── types/             # Domain and auth types
└── scripts/
    ├── seed-user.ts       # Create auth user
    └── seed-data.ts       # Load demo activities/tasks
```

---

## Error responses

| Status | Shape |
|--------|--------|
| `400` | `{ "error": "description" }` |
| `401` | `{ "error": "Unauthorized" }` or auth message |
| `404` | `{ "error": "Not found" }` or resource-specific message |
| `500` | `{ "error": "Internal server error" }` |
