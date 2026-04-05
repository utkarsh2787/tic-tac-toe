# Multiplayer Tic-Tac-Toe

Real-time multiplayer Tic-Tac-Toe built with **Nakama** (server-authoritative backend) and **React** (TypeScript frontend).

## Live Demo

| | URL |
|---|---|
| **Frontend** | https://tic-tac-seven-pearl.vercel.app |
| **Nakama Server** | https://tic-tac-nakama.onrender.com |
| **Nakama Healthcheck** | https://tic-tac-nakama.onrender.com/healthcheck |

> Note: Nakama is hosted on Render free tier — it sleeps after 15 minutes of inactivity. The frontend automatically wakes it up and shows a "Waking up server..." banner (~30s) on first load.

---

## Features

- **Server-authoritative game logic** — all moves validated on server, no client-side cheating
- **Real-time matchmaking** — auto-pair with available players instantly via RPC
- **30-second turn timer** — automatic forfeit on timeout, enforced server-side
- **Play vs Computer** — local AI opponent with Easy (random) and Hard (minimax) difficulty
- **Leaderboard** — global rankings by wins with username + unique ID display
- **Graceful reconnect** — automatic socket reconnection with exponential backoff
- **Concurrent sessions** — multiple games run in isolated Nakama match instances

---

## Architecture

```
┌─────────────────┐      WebSocket      ┌──────────────────────┐
│  React Client   │ ←─────────────────→ │   Nakama Server      │
│  (TypeScript)   │     REST (RPC)      │   (TypeScript        │
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
├── server/                   # Nakama TypeScript runtime module (plugin)
│   ├── src/
│   │   ├── constants.ts      # OpCodes, tick rates, leaderboard IDs
│   │   ├── types.ts          # MatchState, payload interfaces
│   │   ├── utils.ts          # checkWinner, validateMove, buildEmptyBoard
│   │   ├── leaderboard.ts    # createLeaderboards, recordResult
│   │   ├── match_handler.ts  # All 7 Nakama match handler functions
│   │   ├── match_rpc.ts      # rpcFindMatch, rpcGetLeaderboard
│   │   └── main.ts           # InitModule — registers RPCs + match handler
│   ├── build/index.js        # Compiled ES5 output loaded by Nakama
│   ├── tsconfig.json         # ES5 target, outFile: build/index.js
│   ├── local.yml             # Nakama server config
│   ├── Dockerfile            # Multi-stage: tsc compile → nakama image
│   └── Dockerfile.render     # Render.com deployment variant
│
├── client/                   # React + Vite frontend
│   ├── src/
│   │   ├── lib/              # nakama.ts singleton, constants.ts, minimax.ts
│   │   ├── hooks/            # useNakama, useMatchmaker, useMatch, useLocalGame
│   │   ├── store/            # Zustand: authStore, gameStore
│   │   ├── components/       # Auth, Lobby, Game, LocalGame, Leaderboard
│   │   └── types/            # game.ts type definitions
│   └── Dockerfile.prod       # nginx static build for production
│
├── docker-compose.yml        # Local dev (postgres + nakama + client dev server)
├── docker-compose.prod.yml   # Production overrides
├── render.yaml               # Render.com blueprint (Nakama + PostgreSQL)
└── .env.example              # Environment variable template
```

### Key Design Decisions

**Server-authoritative architecture**
All game logic runs inside Nakama's JS runtime. Clients send intents (move position), server validates and broadcasts state. Clients cannot cheat or manipulate game state.

**RPC-based matchmaking vs Nakama's built-in matchmaker**
The `find_match` RPC queries for open match rooms and either joins an existing one or creates a new one. This gives full control over lobby logic. Nakama's built-in matchmaker is better for skill-based ELO systems but adds complexity not needed here.

**ES5 TypeScript target for server**
Nakama's JS runtime (based on goja) executes ES5. The `tsconfig.json` `"files"` array controls file concatenation order into a single `build/index.js` — `constants.ts` and `types.ts` must precede all files that reference them.

**Zustand for client state**
The game state is simple enough that Zustand's minimal API suffices. Reducer-style actions (`applyStart`, `applyUpdate`, `applyDone`) keep state transitions predictable.

**Play vs Computer (client-side only)**
The AI opponent runs entirely in the browser using minimax algorithm — no server involved. Easy mode uses random moves, Hard mode uses full minimax (unbeatable).

**Match lifecycle**
1. Player A calls `find_match` RPC → creates match (label: `open:1`)
2. Player B calls `find_match` RPC → finds open match, joins it
3. `matchJoin` detects 2 players → assigns marks (X/O), broadcasts `START`
4. Each turn: client sends `MOVE` opcode → `matchLoop` validates → broadcasts `UPDATE`
5. Timer: `matchLoop` ticks every 200ms → broadcasts `TIMER_TICK` every second
6. On win/draw/timeout → broadcasts `DONE` → records leaderboard → match ends

---

## Setup & Installation

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2
- Node.js 18+ (for local development without Docker)

### Local Development (Docker) — Recommended

```bash
# Clone the repo
git clone <repo-url>
cd tic-tac

# Start everything (Postgres + Nakama + React dev server)
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Nakama API | http://localhost:7350 |
| Nakama Console | http://localhost:7351 (admin / admin123) |

### Local Development (without Docker)

**Backend (compile plugin):**
```bash
cd server
npm install
npm run build   # outputs build/index.js
```

**Frontend:**
```bash
cd client
npm install

# Create .env.local
echo "VITE_NAKAMA_HOST=127.0.0.1" > .env.local
echo "VITE_NAKAMA_PORT=7350" >> .env.local
echo "VITE_NAKAMA_USE_SSL=false" >> .env.local
echo "VITE_NAKAMA_SERVER_KEY=defaultkey" >> .env.local

npm run dev
```

---

## Deployment

### Actual Deployment Used

**Backend — Render.com (free tier)**
- Nakama runs as a Docker service via `Dockerfile.render`
- PostgreSQL provisioned via `render.yaml` blueprint
- Deploy: connect GitHub repo → Render detects `render.yaml` → auto-deploys

**Frontend — Vercel (free tier)**
```bash
cd client
vercel --prod
```
Environment variables set in Vercel dashboard:
```
VITE_NAKAMA_HOST     = tic-tac-nakama.onrender.com
VITE_NAKAMA_PORT     = 443
VITE_NAKAMA_USE_SSL  = true
VITE_NAKAMA_SERVER_KEY = defaultkey
```

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
| 2 | `START` | `{ marks, currentTurn, deadline }` |
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

### Method 1: Two browser windows (easiest)
1. Open https://tic-tac-seven-pearl.vercel.app in a normal window
2. Open same URL in a **private/incognito** window (different device ID = different player)
3. Enter different usernames in each, click **Find Match** in both
4. Both players are matched and game starts automatically

### Method 2: Local with curl
```bash
# Authenticate
curl -X POST http://localhost:7350/v2/account/authenticate/device \
  -H "Authorization: Basic ZGVmYXVsdGtleTo=" \
  -d '{"id":"test-device-001","create":true}'

# Call find_match RPC with the token
curl -X POST http://localhost:7350/v2/rpc/find_match \
  -H "Authorization: Bearer <token>" \
  -d '{"fast":false}'
```

### Method 3: Nakama Console
Visit http://localhost:7351 (admin / admin123):
- **Matches** — view active game sessions
- **Accounts** — view registered players
- **Leaderboards** — inspect win/loss records
- **Runtime** — verify plugin RPCs are registered
