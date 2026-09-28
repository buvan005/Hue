# HUE — Online Color Memory Game

A perceptual color memory browser game built with **Svelte 5 + Vite** and a server-authoritative **Node.js + Fastify 5 + Prisma (PostgreSQL)** backend.

Players memorize an exact color swatch, recreate it from memory using Hue, Saturation, and Brightness (HSB) sliders, and get scored based on **CIE76 $\Delta E$ perceptual color difference in CIELAB color space**.

---

## Features

- **Username-Based Identity**: Instant play with case-insensitive unique usernames stored in `localStorage`. No passwords or email barriers.
- **Server-Authoritative Gameplay**: Round targets and scores are validated and scored on the server to prevent client manipulation.
- **Graceful Offline Fallback**: If the backend or database is unreachable, the game transitions seamlessly to local offline mode with local scoring and zero interruptions.
- **Deterministic Daily Challenge**: Both backend and frontend share a date-seeded PRNG (`mulberry32`) so all players worldwide receive the exact same 5 colors each day.
- **Global Leaderboard**: Real-time rankings with period filters (`TODAY`, `WEEK`, `ALL`) and responsive score progress bars.
- **Player Dossier & Statistics**: View total games played, personal best, average score, global ranking, percentile calculation, and recent game history.
- **Aesthetic Terminal Design**: JetBrains Mono typography, macOS window frame, retro beige `#EDEAE0` backdrop, and interactive 72-swatch pixel art grid.

---

## Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | Svelte 5 + Vite | JetBrains Mono, CSS design system, responsive |
| **Backend** | Node.js + Fastify 5 | Modular architecture, rate limiting (120 req/min), CORS |
| **ORM & Database** | Prisma ORM + PostgreSQL | `users`, `games`, `rounds` tables with cascade deletes & indices |
| **Color Engine** | CIELAB $\Delta E$ | HSB $\leftrightarrow$ RGB $\leftrightarrow$ CIE XYZ $\leftrightarrow$ CIELAB conversion pipeline |
| **Validation** | Zod schemas | Strict request validation for usernames, games, and HSB coordinates |

---

## Project Structure

```
HUE/
├── src/
│   ├── api/                    # Frontend REST API client
│   │   ├── client.js           # Base HTTP request wrapper & error handling
│   │   ├── games.js            # Game session & round submission
│   │   ├── leaderboard.js      # Global leaderboard fetching
│   │   ├── stats.js            # Player dossier / stats fetching
│   │   └── users.js            # User creation & lookup
│   ├── engine/                 # Core mathematical color engine
│   │   ├── color.js            # HSB/RGB/XYZ/LAB conversions, ΔE, and daily PRNG
│   │   ├── game.js             # Round result computation and target creation
│   │   └── scoring.js          # Linear ΔE falloff (10 * (1 - ΔE/100)) & messages
│   ├── lib/                    # Svelte components
│   │   ├── App.svelte          # Main window chrome, topnav, routing
│   │   ├── StartScreen.svelte  # Start screen: pixel art grid, identity, leaderboard
│   │   ├── ColorStage.svelte   # Memorize phase: 5s countdown
│   │   ├── Sliders.svelte      # Guess phase: interactive HSB slider tracks
│   │   ├── ResultView.svelte   # Result phase: side-by-side guess vs target & score
│   │   ├── EndModal.svelte     # Game complete summary, round breakdown, retry
│   │   └── StatsModal.svelte   # Player dossier & stats modal
│   └── stores/
│       └── gameStore.js        # Central Svelte reactive store with offline fallback
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Prisma schema for PostgreSQL
│   │   └── seed.js             # Realistic test seed script
│   ├── src/
│   │   ├── middleware/         # Zod validation middleware
│   │   ├── routes/             # Fastify REST endpoints (/users, /games, /leaderboard, /stats)
│   │   ├── services/           # Business logic: game, scoring, stats, user
│   │   ├── utils/              # Color math, Prisma client singleton
│   │   ├── app.js              # Fastify application builder
│   │   └── server.js           # Entrypoint with graceful shutdown
│   └── tests/                  # Backend unit & integration tests
└── tests/                      # Frontend core logic tests
```

---

## Quick Start

### 1. Run the Frontend (Vite)

```bash
# In project root:
npm install
npm run dev
```

Frontend runs at `http://localhost:5173/`.

### 2. Run the Backend (Fastify)

```bash
cd backend
npm install

# Configure environment variables (copy .env.example)
cp .env.example .env

# Generate Prisma Client:
npm run prisma:generate

# Start development server:
npm run dev
```

Backend runs at `http://localhost:3000/`.

---

## Database Setup (PostgreSQL)

You can use either a **local PostgreSQL database** or a **free cloud database** (e.g. [Neon](https://neon.tech), [Railway](https://railway.app), or [Supabase](https://supabase.com)).

1. Set your `DATABASE_URL` in `backend/.env`:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/huedb?schema=public"
   ```

2. Run Prisma migrations:
   ```bash
   cd backend
   npx prisma migrate dev --name init
   ```

3. (Optional) Seed demo players and leaderboard scores:
   ```bash
   npm run prisma:seed
   ```

---

## Running Automated Tests

### Frontend Core Engine Tests
```bash
npm test
```
Tests username validation, normalization, HSB $\leftrightarrow$ RGB $\leftrightarrow$ LAB color conversion, $\Delta E$ accuracy, scoring formula, and deterministic daily challenge seed generators.

### Backend API & Service Tests
```bash
cd backend
npm test
```
Tests Fastify health endpoint, input validation schemas, scoring engine, user normalization, and daily challenge PRNG.

---

## Production Deployment

### Frontend (Vercel / Netlify)
1. Set the root directory or configure build command: `npm run build`.
2. Set output directory: `dist`.
3. Set environment variable:
   ```env
   VITE_API_URL=https://your-backend-domain.com
   ```

### Backend (Railway / Render / Fly.io)
1. Deploy from the `backend/` directory or root with root directory set to `backend`.
2. Build command: `npm run prisma:generate && npm run prisma:deploy`.
3. Start command: `npm start`.
4. Environment variables:
   ```env
   PORT=3000
   DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
   FRONTEND_URL=https://your-frontend-domain.com
   ```
