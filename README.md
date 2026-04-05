# Multiplayer Tic-Tac-Toe

Real-time multiplayer Tic-Tac-Toe built with **Nakama** (server-authoritative backend) and **React** (TypeScript frontend).

## Features

- **Server-authoritative game logic** — all moves validated on server, no client-side cheating
- **Real-time matchmaking** — auto-pair with available players instantly
- **30-second turn timer** — automatic forfeit on timeout
- **Leaderboard** — global rankings by wins
- **Graceful reconnect** — automatic socket reconnection with exponential backoff
- **Concurrent sessions** — multiple games run in isolated Nakama match instances

---

## Architecture

```
┌─────────────────┐      WebSocket      ┌──────────────────────┐
│  React Client   │ ←─────────────────→ │   Nakama Server      │
│  (TypeScript)   │     REST (RPC)      │   (TypeScript TS     │
│  Zustand state  │ ←─────────────────→ │    runtime module)   │
└─────────────────┘                     └──────────┬───────────┘
                                                   │
                                          ┌────────▼────────┐
                                          │   PostgreSQL    │
                                          │  (leaderboard,  │
                                          │   user data)    │
                                          └─────────────────┘
```

### Directory Structure

```
tic-tac/
├── server/               # Nakama TypeScript runtime module
│   ├── src/
│   │   ├── constants.ts  # OpCodes, tick rates, leaderboard IDs
│   │   ├── types.ts      # MatchState, payload interfaces
│   │   ├── utils.ts      # checkWinner, validateMove, buildEmptyBoard
│   │   ├── leaderboard.ts # createLeaderboards, recordResult
│   │   ├── match_handler.ts # All 7 Nakama match handler functions
│   │   ├── match_rpc.ts  # rpcFindMatch, rpcGetLeaderboard
│   │   └── main.ts       # InitModule — registers RPCs + match handler
│   ├── tsconfig.json     # ES5 target, outFile: build/index.js
│   ├── local.yml         # Nakama server config
│   └── Dockerfile        # Multi-stage: tsc compile → nakama image
│
├── client/               # React + Vite frontend
│   ├── src/
│   │   ├── lib/          # nakama.ts singleton, constants.ts (mirrored opcodes)
│   │   ├── hooks/        # useNakama, useMatchmaker, useMatch
│   │   ├── store/        # Zustand: authStore, gameStore
│   │   ├── components/   # Auth, Lobby, Game, Leaderboard
│   │   └── types/        # game.ts type definitions
│   └── Dockerfile.prod   # nginx static build for production
│
├── docker-compose.yml    # Local dev (postgres + nakama + client dev server)
├── docker-compose.prod.yml # Production overrides
└── .env.example          # Environment variable template
```

### Key Design Decisions

**Why RPC-based matchmaking instead of Nakama's built-in matchmaker?**
The `find_match` RPC queries for open match rooms and either joins an existing one or creates a new one. This gives full control over lobby logic and is easier to debug. Nakama's built-in matchmaker is better for skill-based ELO systems.

**Why ES5 TypeScript target for the server?**
Nakama's JS runtime (based on goja) executes ES5. The `tsconfig.json` `"files"` array controls file concatenation order — `constants.ts` and `types.ts` must precede all files that reference them, with `main.ts` last.

**Why Zustand instead of Redux?**
The game state is simple enough that Zustand's minimal API suffices. The store's reducer-style actions (`applyStart`, `applyUpdate`, `applyDone`) are independently testable.

**Match lifecycle:**
1. Player A calls `find_match` RPC → creates match (label: `open:1`)
2. Player B calls `find_match` RPC → finds open match, joins it
3. `matchJoin` detects 2 players → assigns marks, broadcasts `START`
4. Each turn: client sends `MOVE` opcode → `matchLoop` validates → broadcasts `UPDATE`
5. Timer: `matchLoop` ticks every 200ms → broadcasts `TIMER_TICK` every second
6. On win/draw/timeout → broadcasts `DONE` → `matchLoop` returns `null` (match ends)

---

## Setup & Installation

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2
- Node.js 18+ (for local development without Docker)

### Local Development (Docker)

```bash
# Clone and start everything
git clone <repo-url>
cd tic-tac
docker-compose up --build
```

- Frontend: http://localhost:5173
- Nakama console: http://localhost:7351 (admin / admin123)
- Nakama API: http://localhost:7350

### Local Development (without Docker)

**Backend:**
```bash
cd server
npm install
npm run build        # Compiles TypeScript to build/index.js

# Start Nakama separately (requires nakama binary + postgres)
nakama --config local.yml --database.address postgres:localdb@localhost:5432/nakama
```

**Frontend:**
```bash
cd client
npm install

# Create .env.local
echo "VITE_NAKAMA_HOST=127.0.0.1" > .env.local
echo "VITE_NAKAMA_PORT=7350" >> .env.local
echo "VITE_NAKAMA_USE_SSL=false" >> .env.local

npm run dev
```

---

## Deployment

### Option A: Heroic Cloud (Managed Nakama — Recommended)

1. Sign up at [heroiclabs.com](https://heroiclabs.com)
2. Create a new project, note your server key and host
3. Upload the compiled module:
   ```bash
   cd server && npm install && npm run build
   # Upload build/index.js via Heroic Cloud dashboard
   ```
4. Deploy the frontend to Vercel/Netlify:
   ```bash
   cd client
   VITE_NAKAMA_HOST=your-project.heroiclabs.com \
   VITE_NAKAMA_PORT=443 \
   VITE_NAKAMA_USE_SSL=true \
   npm run build
   # Upload dist/ to Vercel/Netlify
   ```

### Option B: Self-Hosted (Docker on any VPS)

1. Provision a VM (DigitalOcean Droplet, AWS EC2, GCP Compute, etc.) with Docker installed
2. Point a domain at the VM's IP; set up DNS:
   - `api.yourdomain.com` → VM IP (for Nakama)
   - `yourdomain.com` → VM IP (for frontend) or use Vercel
3. Copy project to VM:
   ```bash
   scp -r ./tic-tac user@your-vm:/opt/tic-tac
   ```
4. Create `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   # Fill in DB_PASSWORD, CONSOLE_PASSWORD, NAKAMA_HOST
   ```
5. Build and start:
   ```bash
   docker-compose \
     -f docker-compose.yml \
     -f docker-compose.prod.yml \
     up --build -d
   ```

**TLS/HTTPS**: For HTTPS, add Traefik or Caddy as a reverse proxy in front of Nakama. Nakama's port 7350 handles both HTTP API and WebSocket upgrades.

---

## API / Server Configuration

### Nakama RPC Endpoints

| RPC Function | Description | Payload | Response |
|---|---|---|---|
| `find_match` | Find or create a match | `{ fast?: boolean }` | `{ matchId: string }` |
| `get_leaderboard` | Get top winners | `{ limit?: number }` | Nakama `LeaderboardRecordList` |

### Match OpCodes (Server → Client)

| Code | Name | Payload |
|---|---|---|
| 1 | `UPDATE` | `{ board, currentTurn, deadline }` |
| 2 | `START` | `{ marks, deadline }` |
| 3 | `DONE` | `{ board, winner, winnerMark }` |
| 4 | `REJECTED` | `{ reason }` |
| 5 | `OPPONENT_LEFT` | *(none)* |
| 6 | `TIMER_TICK` | `{ remaining }` |

### Match OpCodes (Client → Server)

| Code | Name | Payload |
|---|---|---|
| 101 | `MOVE` | `{ position: 0-8 }` |

### Leaderboard IDs

| ID | Description | Operator |
|---|---|---|
| `ttt_wins` | Win count | `incr` |
| `ttt_losses` | Loss count | `incr` |
| `ttt_streaks` | Win streak (best) | `best` |

---

## Testing Multiplayer

### Method 1: Two browser tabs
1. Open http://localhost:5173 in two separate browser windows (use private/incognito for the second to get a different device ID)
2. Enter different usernames and click "Play Now" in both
3. Both should be matched and the game starts

### Method 2: Using curl to inspect state
```bash
# Authenticate to get a session token
curl -X POST http://localhost:7350/v2/account/authenticate/device \
  -H "Authorization: Basic ZGVmYXVsdGtleTo=" \
  -d '{"id":"test-device-001","create":true}'

# Then call RPC with the token
curl -X POST http://localhost:7350/v2/rpc/find_match \
  -H "Authorization: Bearer <token>" \
  -d '{"fast":false}'
```

### Method 3: Nakama Console
Visit http://localhost:7351 (admin / admin123) to:
- View active matches under **Matches**
- View player accounts under **Accounts**
- Inspect leaderboard records under **Leaderboards**
- Send match signals and inspect state in real time
