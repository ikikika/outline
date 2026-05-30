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

### 2. Load activities, tasks, and schedule blocks

```bash
npm run seed:data -- you@example.com
```

This script:

1. Upserts activities from `../scripts/activities.json`
2. Upserts catalog task metadata from `../scripts/tasks.json`
3. Upserts the file's explicit `scheduleBlocks`, including multiple focus blocks per task and taskless Pomodoro breaks

Legacy timed-task JSON remains supported as an import format. Task records written to DynamoDB do not contain `date`, `plannedStart`, `plannedEnd`, or scheduling GSI fields.

---

## Frontend configuration

Set the API Gateway **root** URL in the frontend (no `/api` suffix):

```env
VITE_API_URL=https://your-api-id.execute-api.region.amazonaws.com
```

The frontend appends `/api` automatically in `API_BASE_URL`.

---

## Authentication

The API uses **HttpOnly cookies** for browser sessions (cross-origin SPA → API Gateway):

- `access_token` — JWT, 15 minutes, `HttpOnly; Secure; SameSite=None; Path=/`
- `refresh_token` — JWT, 7 days, same attributes

The browser stores cookies on the **API host** and sends them automatically when the client uses `credentials: 'include'`. Tokens are **not** returned in JSON login/refresh bodies.

`Authorization: Bearer <access_token>` remains supported as a fallback for non-browser tooling.

CORS must allow credentials (`credentials: true` / `allowCredentials: true`) with an explicit origin allowlist (never `*`).

| Endpoint | Auth |
|----------|------|
| `GET /api/health`, `GET /api/health/dynamo` | No |
| `POST /api/auth/login`, `POST /api/auth/refresh` | No (sets/rotates cookies) |
| `POST /api/auth/logout` | Cookie or Bearer (clears cookies) |
| `GET /api/auth/me` | Cookie or Bearer |
| All `/api/activities/*`, `/api/tasks/*`, `/api/schedule-blocks/*`, and `/api/time-entries/*` | Cookie or Bearer |

**Security notes**

- `SameSite=None` does not block CSRF by itself; mitigation is the CORS allowlist + JSON `Content-Type` (preflight) for mutating calls.
- XSS cannot read HttpOnly cookies; do not put tokens in localStorage or JSON responses for the SPA.
- Cookies are tied to the API host; changing the API Gateway URL clears sessions.

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

**Response `200`** — sets `access_token` and `refresh_token` cookies

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
  }
}
```

**Errors:** `400` / `401` with `{ "error": "message" }`

---

#### `GET /api/auth/me`

Sends cookies automatically (browser) or `Authorization: Bearer <access_token>`.

**Response `200`** — `IUser` object (same shape as `user` in login response)

---

#### `POST /api/auth/refresh`

Reads `refresh_token` from the cookie (preferred). Optionally accepts a body for tooling:

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

Rotates both cookies and returns:

```json
{
  "ok": true
}
```

---

#### `POST /api/auth/logout`

Revokes the refresh token (from cookie or optional body) and clears auth cookies.

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
    "sortOrder": 0,
    "createdAt": "2026-07-18T20:00:00.000Z",
    "updatedAt": "2026-07-18T20:00:00.000Z"
  }
]
```

Activities are ordered by `sortOrder` ascending (lower = higher priority).

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
  "notes": "Inbox zero, pick top 3 for the day",
  "sortOrder": 0
}
```

Required fields: `title`, `categoryId`, `notes`.  
Optional: `id` — generated by the server when omitted.  
Optional: `sortOrder` — defaults to the next available index.  
`categoryId` must be one of: `work`, `deep_work`, `admin`, `personal`, `break`.  
Do not send `createdAt` or `updatedAt`; the server sets them.

**Response `201`** — created activity with server-generated `id` (if omitted), `createdAt`, and `updatedAt`

**Error `400`** — `{ "error": "..." }` when validation fails

---

#### `PATCH /api/activities/:id`

Partial update (reorder / edit).

**Request body** (at least one field)

```json
{
  "sortOrder": 2,
  "title": "Updated title"
}
```

Allowed fields: `title`, `categoryId`, `notes`, `sortOrder`.

**Response `200`** — updated activity  
**Response `404`** — `{ "error": "Activity not found" }`

---

#### `DELETE /api/activities/:id`

Deletes the activity, all of its tasks, and their schedule blocks and time entries.

**Response `204`** — deleted  
**Response `404`** — `{ "error": "Activity not found" }`

---

### Tasks (catalog)

Tasks are untimed catalog entities. Scheduling fields belong to ScheduleBlocks.
`status` values: `unplanned` | `planned` | `in_progress` | `done` | `skipped`  
`sortOrder` is catalog priority within an activity.

**Response `200`**

```json
[
  {
    "id": "49739779",
    "activityId": "the-complete-agentic-ai-engineering-course",
    "title": "Day 1 - Build Your First Autonomous AI Agent with n8n (No-Code Demo)",
    "timeEstimationSeconds": 870,
    "categoryId": "admin",
    "notes": "",
    "status": "planned",
    "sortOrder": 0
  }
]
```

#### `GET /api/tasks?activityId=...`

Tasks for one activity, ordered by `sortOrder` (catalog).

---

#### `GET /api/tasks`

All tasks for the user, ordered by `(activityId, sortOrder)` (catalog).

Legacy task `date` and `from`/`to` scheduling queries return `410`; use `/api/schedule-blocks`.

---

#### `GET /api/tasks/:id`

**Response `200`** — single task object (same shape as above)  
**Response `404`** — `{ "error": "Task not found" }`

---

#### `POST /api/tasks`

Create an unscheduled catalog task. `categoryId` inherits from the parent activity when omitted and status defaults to `unplanned`.

**Request body**

```json
{
  "id": "49739779",
  "activityId": "the-complete-agentic-ai-engineering-course",
  "title": "Day 1 - Build Your First Autonomous AI Agent with n8n (No-Code Demo)",
  "timeEstimationSeconds": 870,
  "categoryId": "admin",
  "notes": "",
  "status": "unplanned",
  "sortOrder": 0
}
```

Required fields: `activityId`, `title`.
Optional: `id` — generated by the server when omitted.  
Optional: `sortOrder` — defaults to the next index under that activity.  
`date`, `plannedStart`, and `plannedEnd` are rejected; create a ScheduleBlock instead.
Do not send `createdAt` or `updatedAt`; the server sets them internally.

**Response `201`** — created task (includes server-generated `id` when omitted)

---

#### `PATCH /api/tasks/:id`

Partial update (reorder / reparent / edit).

**Request body** (at least one field)

```json
{
  "sortOrder": 1,
  "activityId": "github-copilot"
}
```

Allowed fields: `activityId`, `title`, `timeEstimationSeconds`, `categoryId`, `notes`, `status`, `sortOrder`.
When reparenting without an explicit `sortOrder`, the task is appended at the end of the new activity.

**Response `200`** — updated task  
**Response `404`** — `{ "error": "Task not found" }` or `{ "error": "Activity not found" }` when reparenting to a missing activity

---

#### `DELETE /api/tasks/:id`

Deletes the task and all of its schedule blocks and time entries.

**Response `204`** — deleted  
**Response `404`** — `{ "error": "Task not found" }`

---

### ScheduleBlocks (timetable)

ScheduleBlocks are the only calendar entities:

```json
{
  "id": "block-1",
  "taskId": "49739779",
  "blockType": "focus",
  "plannedStart": "2026-07-22T10:44:00.000Z",
  "plannedEnd": "2026-07-22T11:05:45.000Z",
  "createdAt": "2026-07-21T12:00:00.000Z",
  "updatedAt": "2026-07-21T12:00:00.000Z"
}
```

`blockType` is `focus`, `short_break`, or `long_break`. `taskId` is optional.

- `GET /api/schedule-blocks?date=YYYY-MM-DD` queries blocks by UTC start date.
- `GET /api/schedule-blocks?from=<ISO>&to=<ISO>` returns blocks whose start is in `[from, to)`.
- `GET /api/schedule-blocks?taskId=...` returns all blocks for a task.
- `GET /api/schedule-blocks/:id` returns one block.
- `POST /api/schedule-blocks` creates a block.
- `PATCH /api/schedule-blocks/:id` updates its task, type, or times. Send `"taskId": null` to detach it.
- `DELETE /api/schedule-blocks/:id` deletes it.

Creating a focus block linked to an unplanned task marks that task planned. Deleting or detaching the last block linked to a task marks the task unplanned. A supplied `taskId` must identify an existing task.

ScheduleBlocks use `pk=USER#{userId}`, `sk=SCHEDULE_BLOCK#{id}`, and `Gsi1` keys `USER#{userId}#DATE#{UTC date}` / `{plannedStart}#{id}`. Task lookup queries the user's `SCHEDULE_BLOCK#` partition-key prefix and filters by `taskId`.

---

## Example workflow (curl)

Replace `{API_URL}` with your API Gateway URL from `sst deploy`.

```bash
# Health
curl "{API_URL}/api/health"

# Login (stores cookies in jar)
curl -c cookies.txt -s -X POST "{API_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}'

# List activities (sends cookies)
curl -b cookies.txt "{API_URL}/api/activities"

# Schedule blocks for a day
curl -b cookies.txt \
  "{API_URL}/api/schedule-blocks?date=2026-07-22"

# Schedule blocks in an instant range
curl -b cookies.txt \
  "{API_URL}/api/schedule-blocks?from=2026-07-21T00%3A00%3A00.000Z&to=2026-07-28T00%3A00%3A00.000Z"

# Refresh session (rotates cookies)
curl -c cookies.txt -b cookies.txt -s -X POST "{API_URL}/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{}'

# Logout
curl -c cookies.txt -b cookies.txt -s -X POST "{API_URL}/api/auth/logout" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## CORS

Allowed origins are configured in `sst.config.ts` and mirrored in `src/handlers/api.ts`, with **`allowCredentials` / `credentials: true`** so browsers can send cookies:

- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `https://tempo.codeoctagon.com`

Add your production frontend origin to both places when deploying to a new domain. Origins must be explicit (not `*`) when credentials are enabled.

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
