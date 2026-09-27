# Express Server-Sent Events

A small teaching app: an Express 5 API pushes timestamp pulses over SSE, and a React console renders them live.

[SSE on MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) · [SSE on Wikipedia](https://en.wikipedia.org/wiki/Server-sent_events)

## Run locally

Requires [Node.js](https://nodejs.org/) 20.6+ and [pnpm 12.7.0](https://pnpm.io/) (pin is in `packageManager`; enable with `corepack enable` if needed).

```bash
git clone https://github.com/emisasal/express-server-sent-event
cd express-server-sent-event
pnpm install
pnpm dev
```

| Surface | URL |
| --- | --- |
| Console | [http://localhost:5173](http://localhost:5173) |
| API | [http://localhost:8080](http://localhost:8080) |

Vite proxies `/events` and `/health` to the API, so the browser always talks same-origin. Set `PORT` to change the API port; the proxy follows it.

Run one side only with `pnpm dev:backend` or `pnpm dev:frontend`.

## How it works

**Backend** (`GET /events`) is a `text/event-stream`. Each pulse is:

```
retry: 3000

id: 1
data: {"timestamp":"2026-09-27T10:51:41.847Z"}
```

- The first pulse is sent immediately. Later pulses wait a **new** random 1–10 seconds (not a fixed interval for the whole connection).
- `retry: 3000` tells the browser how long to wait before reconnecting.
- Heartbeat comments (`: ping <epoch-ms>`) every 15 seconds keep idle proxies from dropping the socket.
- Reconnects send `Last-Event-ID`. Missed pulses replay from an in-memory buffer of the last 100 events.
- At most 32 concurrent stream clients. Extra clients get `503` with `Retry-After: 10`.

**Frontend** is Vite + React 19 + Tailwind CSS 4. It opens `EventSource("/events")`, keeps the browser’s automatic reconnect, and shows a manual Reconnect button only if the stream stays down. Pause and clear affect the visible feed; Received is a lifetime count (the list still shows 48 cards).

## API

### `GET /health`

```json
{ "ok": true, "activeClients": 0 }
```

### `GET /events`

```bash
curl -N http://localhost:8080/events
```

Resume after event `1`:

```bash
curl -N -H "Last-Event-ID: 1" http://localhost:8080/events
```

| Status | When |
| --- | --- |
| `200` | Stream opened |
| `503` `{ "error": "too many SSE clients" }` | Cap reached |
| `503` `{ "error": "shutting down" }` | Process is exiting |

## Scripts

| Command | What it runs |
| --- | --- |
| `pnpm dev` | Backend (`tsx watch`) and Vite together |
| `pnpm test` | Backend `node:test` and frontend Vitest |
| `pnpm build` | `tsc` in the API, Vite production build for the UI |
| `pnpm --filter frontend lint` | ESLint |
| `pnpm --filter express-server-sent-event start` | `node dist/server.js` after a backend build |

CI (`.github/workflows/ci.yml`) installs with a frozen lockfile, then runs tests, lint, and builds.

## Layout

```
backend/   Express app, logger, SSE tests
frontend/   Vite app, parse helpers, UI tests
```

Workspace packages are listed in `pnpm-workspace.yaml`. TypeScript throughout.

## Ops

- **`PORT`** — API listen port (default `8080`).
- **Shutdown** — `SIGINT` and `SIGTERM` end open streams, then close the HTTP server (5s force-exit).
- **Logs** — colored lines on a TTY; one JSON object per line when stdout is piped (CI, Docker).
