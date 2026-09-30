# HUE — Production Deployment Guide

This guide details the complete production deployment architecture, step-by-step setup, database migration procedures, environment variable configuration, and monitoring strategies for **HUE**.

---

## Architecture Overview

```
                      +-----------------------------+
                      |   Frontend (SPA)            |
                      |   Vercel / Netlify / Cloudflare |
                      |   (Vite + Svelte)           |
                      +--------------+--------------+
                                     |
                                     | HTTPS / REST
                                     v
                      +-----------------------------+
                      |   Backend API               |
                      |   Railway / Render / Fly.io |
                      |   (Node.js + Fastify)       |
                      +--------------+--------------+
                                     |
                                     | Prisma Client (SSL)
                                     v
                      +-----------------------------+
                      |   Managed PostgreSQL DB     |
                      |   Neon / Supabase / Railway |
                      +-----------------------------+
```

---

## 1. Environment Variables Configuration

### Frontend (`.env.production` or Hosting Dashboard)

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL of the deployed backend API without trailing slash | `https://api.huegame.com` |

### Backend (`.env` or Hosting Dashboard)

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Application environment (`production` enables security protections) | `production` |
| `PORT` | Port for the Fastify server to bind to | `3000` (or injected by platform) |
| `DATABASE_URL` | Connection string to the managed PostgreSQL database | `postgresql://user:pass@host:5432/hue?sslmode=require` |
| `FRONTEND_ORIGIN` | Allowed CORS origin (comma-separated for multiple origins, no wildcards in prod) | `https://huegame.com,https://www.huegame.com` |
| `RATE_LIMIT_MAX` | Global rate limit requests per window per IP (default: `100`) | `100` |
| `RATE_LIMIT_WINDOW` | Global rate limit window duration (default: `1 minute`) | `1 minute` |

---

## 2. Database Setup & Safe Migrations

### Managed PostgreSQL Provider
Recommended providers:
- **Neon** (Serverless PostgreSQL with connection pooling)
- **Supabase** (Managed PostgreSQL)
- **Railway PostgreSQL** (Dedicated instance)

### Safe Production Migration Strategy
> [!CAUTION]
> Never run `prisma db push --force-reset` or `prisma migrate reset` in production! This will destroy historical user scores and gameplay records.

To apply migrations safely without data loss:

1. **Generate migrations in development**:
   ```bash
   cd backend
   npx prisma migrate dev --name <migration_name>
   ```

2. **Deploy migrations in CI/CD or before backend startup**:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

3. **Verify database connection and indexing**:
   ```bash
   npx prisma db pull
   ```

### Production Indexes
The PostgreSQL schema includes composite performance indexes:
- `games([status, completed_at])`: Accelerates daily/weekly leaderboard queries.
- `games([status, total_score(sort: Desc)])`: Accelerates global ranking and percentile computation.

---

## 3. Backend Deployment (Railway / Render)

### Option A: Railway Deployment

1. **Connect Repository**: In Railway, create a new project and link the GitHub repository.
2. **Set Root Directory**: Configure the service root directory to `backend`.
3. **Build & Start Commands**:
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npx prisma migrate deploy && node src/server.js`
4. **Environment Variables**:
   Add `NODE_ENV=production`, `DATABASE_URL`, and `FRONTEND_ORIGIN`.
5. **Healthcheck Path**: Set health check path to `/ready`.

### Option B: Render Deployment

1. **Create Web Service**: Connect your GitHub repository.
2. **Build Settings**:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npx prisma migrate deploy && node src/server.js`
3. **Environment Variables**: Populate all variables listed in Section 1.
4. **Health Check Path**: `/ready`

---

## 4. Frontend Deployment (Vercel)

1. **Import Repository**: Link your GitHub repository in the Vercel dashboard.
2. **Build Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (project root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. **Environment Variables**:
   - Set `VITE_API_URL` to your production backend URL (e.g., `https://hue-backend.railway.app`).
4. **Deploy**: Trigger production build. Verify that `dist/index.html` and bundled assets load properly.

---

## 5. Health Checks & Observability

The backend exposes two specialized endpoints for load balancers and orchestrators:

### 1. Liveness Probe (`GET /health`)
- Returns HTTP 200 OK immediately if the Fastify process is running.
- Response:
  ```json
  {
    "status": "ok",
    "uptime": 124.5,
    "timestamp": "2026-09-28T18:12:00.000Z"
  }
  ```

### 2. Readiness Probe (`GET /ready`)
- Checks connectivity to PostgreSQL using `SELECT 1;`.
- Returns HTTP 200 OK when the database is connected and ready to accept traffic.
- Returns HTTP 503 Service Unavailable if database is unreachable.
- Response:
  ```json
  {
    "status": "ready",
    "database": "connected",
    "timestamp": "2026-09-28T18:12:00.000Z"
  }
  ```

---

## 6. Security Hardening Summary

1. **CORS Restrictions**: Wildcard origin `*` is explicitly blocked when `NODE_ENV=production`. Only verified `FRONTEND_ORIGIN` domains are allowed.
2. **Rate Limiting**:
   - `POST /api/users`: 20 requests / min
   - `POST /api/games`: 30 requests / min
   - `POST /api/games/:gameId/rounds`: 60 requests / min
   - `POST /api/games/:gameId/complete`: 30 requests / min
   - `GET /api/leaderboard`: 60 requests / min
   - `GET /api/users/:userId/stats`: 60 requests / min
3. **Server-Authoritative Game Logic**:
   - Scores cannot be forged from the client; they are calculated purely from server targets using `calculateScore()`.
   - Players cannot submit duplicate rounds or complete prematurely without all 5 rounds.
   - Games cannot be completed more than once (duplicate completion blocked with HTTP 400).
   - Rounds cannot be submitted for someone else's game (ownership check returns HTTP 403).
4. **Error Masking**: Stack traces and Prisma internal errors are hidden in production; clients receive structured error JSON (`{ "error": "Internal Server Error", "code": "INTERNAL_SERVER_ERROR" }`).
5. **Graceful Shutdown**: Fastify and Prisma disconnect cleanly on `SIGINT` and `SIGTERM`.
