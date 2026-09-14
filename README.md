# Nova

Nova is a web based time trial FPS, similar to Seum. Run through a hand built level as fast as
you can, shoot every target, hit the goal, and your time goes on the leaderboard. There's a full
level editor built in too, so players can build their own levels and upload them for everyone
else to play.

<p align="center">
  <img src="nova-game-client/public/novaIcon.png" width="96" alt="Nova" />
</p>

**Play it:** [nova.mattheritage.dev](https://nova.mattheritage.dev)

## Features

- **Core loop**: countdown, run the level, shoot the targets, avoid taking damage, reach the goal, time gets
  submitted to that level's leaderboard.
- **Hazards**: spikes, a laser firing cannon, moving blades, falling platforms, moving doors, and color switch blocks.
- **Level editor**: a free fly editor pawn, a move/rotate/scale gizmo with multi select and
  alt drag duplication, a categorized actor palette, export/import, play in editor testing, and a
  real upload flow with validation on both ends.
- **Level browser and leaderboards**: browse community levels with thumbnails, ratings, tags and
  play counts. Every level has a real top 5 leaderboard, plus your own rank if you're outside it.
- **Accounts**: Anonymous player identity automatically, no signup needed to play (these accounts get deleted after 7 days unless claimed via GitHub)
  or show up on a leaderboard. You can also sign in with GitHub OAuth to keep your name and history permanently.

## Architecture

### System overview

The client is a static single page app. The backend is a plain Node HTTP server with no
framework. Cloudflare sits in front of both: Pages serves the client, and a Pages Function
proxies `/api/*` to Railway so the browser only ever talks to one origin.

```mermaid
flowchart LR
    subgraph Browser["Player's Browser"]
        Client["Nova Client\nThree.js + React (Vite)"]
    end

    subgraph CF["Cloudflare"]
        Pages["Pages\n(static hosting)"]
        Fn["Pages Function\nfunctions/api/[[path]].ts"]
        R2[("R2\nlevel JSON + thumbnails")]
    end

    subgraph RW["Railway"]
        Server["Node HTTP server\n(nove-game-server)"]
        PG[("PostgreSQL")]
        Redis[("Redis")]
    end

    Client -- "static assets" --> Pages
    Client -- "/api/* (cookies)" --> Fn
    Fn -- "proxied, shared secret" --> Server
    Client -- "fetch level JSON / thumbnails" --> R2
    Server --> PG
    Server -. "cache + rate limit" .-> Redis
    Server -- "on level save" --> R2
```

Postgres is the source of truth for everything: users, levels, leaderboard entries. Redis sits in
front of it as a fail open accelerator, a sorted set cache per level's leaderboard and a per IP
rate limiter. It's never the only copy of anything. A separate scheduled Railway service wipes
stale anonymous accounts every day.

### Postgres schema

```mermaid
erDiagram
    USERS ||--o{ LEVELS : authors
    USERS ||--o{ OAUTH_IDENTITIES : links
    USERS ||--o{ LEADERBOARD_ENTRIES : submits
    USERS ||--o{ LEVEL_RATINGS : rates
    LEVELS ||--o{ LEADERBOARD_ENTRIES : has
    LEVELS ||--o{ LEVEL_RATINGS : has
    LEVELS ||--o{ LEVEL_TAGS : "tagged with"

    USERS {
        uuid id PK
        text display_name
        timestamptz claimed_at "null = anonymous"
    }
    OAUTH_IDENTITIES {
        uuid user_id FK
        text provider
        text provider_user_id
    }
    LEVELS {
        text id PK
        uuid author_id FK "nullable"
        text name
        real rating
        real min_time_seconds
    }
    LEVEL_TAGS {
        text level_id FK
        text tag
    }
    LEVEL_RATINGS {
        text level_id FK
        uuid player_id FK
        smallint rating
    }
    LEADERBOARD_ENTRIES {
        bigint id PK
        text level_id FK
        uuid player_id FK
        float time_seconds
    }
```

`author_id`/`player_id` foreign keys cascade or null out depending on what should survive a
wiped anonymous account: leaderboard entries and ratings go with the player, an uploaded level
just loses its byline (`author_id` set null, see `CleanupAnonymousUsers.ts`).

### Redis usage

Redis holds nothing durable, every key here is either a cache warmed from Postgres or a
short-lived counter, safe to lose entirely (every read path falls back to Postgres on a miss).

```mermaid
flowchart LR
    Session["session:TOKEN\n→ user id (30 day TTL)"]
    OAuthState["oauth_state:STATE\n→ player id (single use, 10 min TTL)"]
    Leaderboard["leaderboard:LEVEL_ID\nsorted set: player id → time"]
    RateLimit["ratelimit:IP:ENDPOINT\nfixed window counter"]
    WeeklyPlays["level-plays:LEVEL_ID:WEEK\ncounter"]

    Session --- AuthApi["AuthApi.ts / Session.ts"]
    OAuthState --- AuthApi
    Leaderboard --- LeaderboardApi["LeaderboardApi.ts"]
    RateLimit --- RateLimitTs["RateLimit.ts, every POST endpoint"]
    WeeklyPlays --- WeeklyPlaysTs["WeeklyPlays.ts, 'popular this week'"]
```

### Repo layout

```mermaid
flowchart TB
    Root["nova-game (workspaces root)"]
    Root --> Client["nova-game-client\n« fps-web-game »\ngame + level editor"]
    Root --> Server["nova-game-server\n« gameserver »\nREST API + WebSocket"]
    Root --> Shared["shared\n« nova-shared »\ntypes shared client ⇄ server"]
    Root --> Functions["functions/api\nCloudflare Pages Function"]

    Client --> Shared
    Server --> Shared
    Functions -. proxies .-> Server
```

### Client gameplay architecture

The client uses a Unreal Engine style Actor/Component model on top of Three.js instead of a
third party ECS. `NVActor` is the base class every gameplay object extends, `NVComponent` handles
reusable pieces like meshes and physics, and `NVScene` owns spawning, ticking and collision.

```mermaid
classDiagram
    class NVActor {
        +scene : Object3D
        +spawnDescriptor : SpawnDescriptor
        +Init(descriptor)
        +Tick(deltaTime)
        +BeginPlay()
        +OnPlayerRespawned()
    }
    class NVComponent
    class NVScene {
        +SpawnActor(descriptor)
        +sceneActors : Set~NVActor~
        +worldOctree : Octree
    }

    NVScene ..> NVActor : spawns & ticks
    NVActor "1" o-- "0..*" NVComponent : owns
    NVActor <|-- NVPlayerCharacter
    NVActor <|-- NVTargetActor
    NVActor <|-- NVMovingBladeActor
    NVActor <|-- NVSwitchButtonActor
    NVActor <|-- NVDisappearingCubeActor
```

Every level is just a JSON list of `SpawnDescriptor`s (a class name plus a transform plus
editable properties) that `NVScene.SpawnActorsFromData` walks through to spawn the real actors.
It's the same format the editor exports, uploads, and loads back in.

## Gameplay Controls

`WASD` Move, `Space` Jump, `LMB` Fire, `P` Pause, `R` Reset level

## Editor Controls

`WASD` Fly (hold `RMB` to look around), `Q` / `C` Fly down, `Space` Fly up, `W` / `E` / `R` Move /
Rotate / Scale gizmo (when not holding `RMB`), `LMB` Select (`Ctrl` + click to multi select),
`Alt` + drag gizmo Duplicate, `Delete` Delete selected, `P` Play test the level

## Running it locally

1. `npm install` from the repo root.
2. Install the [Railway CLI](https://railway.app/cli), run `railway login` then `railway link`
   to the project (this gives you the shared dev Postgres/Redis, there's no local DB).
3. Open a DB tunnel and leave it running: `railway connect postgres --tunnel-only -P 5433`.
4. Add the printed connection string to `nove-game-server/.env` as `DATABASE_URL`.
5. `cd nove-game-server && npm run migrate`.
6. Backend: `npm start` in `nove-game-server`. Frontend: `npm run dev` in `nova-game-client`,
   its dev server proxies `/api` and `/game` to `localhost:8080`.

Level upload (Cloudflare R2) and GitHub sign in both need their own env vars to work locally. See
[nove-game-server/CLAUDE.md](nove-game-server/CLAUDE.md) for the full list if you need them.
Redis is optional locally, everything falls back to Postgres only without it.

## Deployment

Both sides auto deploy on push to `master`. The client goes to Cloudflare Pages, the server goes
to Railway along with its Postgres, Redis, and a small cron service that sweeps stale anonymous
accounts. Level files and thumbnails live in Cloudflare R2, public read, only the server can
write to it.

<p align="center">
  <img src="docs/railway-setup.png" width="700" alt="Railway project setup" />
</p>

## Project status

Core gameplay, the level editor, the level browser, leaderboards, and anonymous plus GitHub
identity are all live and backed by real data. See [TODO.md](TODO.md) for the full task list.
The big open item is doing something with the WebSocket/multiplayer groundwork already sitting in
the codebase (ghost racing, live races). Nothing gameplay facing uses it yet.

## Tech stack

TypeScript everywhere.

- **Client**: Three.js, React, Vite.
- **Server**: plain Node `http`, `ws`, `pg` (raw SQL, no ORM), `ioredis`, AWS SDK v3 for R2.
- **Data**: PostgreSQL, Redis, Cloudflare R2.