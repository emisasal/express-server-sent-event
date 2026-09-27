# Express Server-Sent Events

Example of Server-Sent Events: an Express API pushes timestamp pulses, and a React console renders them live.

- [SSE on MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [SSE on Wikipedia](https://en.wikipedia.org/wiki/Server-sent_events)

## What it does

The backend opens `GET /events` as an SSE stream. Each pulse is a JSON payload `{ "timestamp": "<ISO-8601>" }` with an event `id`. The first pulse is sent immediately; later pulses wait a new random **1–10 seconds**. Heartbeat comments keep idle connections alive. Reconnects send `Last-Event-ID` so missed pulses can replay from a short in-memory buffer.

The frontend is a Vite + React + Tailwind console. It connects to `/events` on the same origin (proxied to the API in development), shows connection status, and lists pulses as they arrive.

## Setup

Requires Node.js 20.6+ and [pnpm 12.7.0](https://pnpm.io/) (via Corepack).

```bash
git clone https://github.com/emisasal/express-server-sent-event
cd express-server-sent-event
pnpm install
pnpm dev
```

- UI: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:8080](http://localhost:8080) (`PORT` overrides this). Vite proxies `/events` and `/health` to that port.

Run the apps separately with `pnpm dev:backend` and `pnpm dev:frontend`.

## API

`GET /health` — `{ "ok": true, "activeClients": <number> }`

`GET /events` — `text/event-stream`. Example:

```bash
curl -N http://localhost:8080/events
```

```
retry: 3000

id: 1
data: {"timestamp":"2026-09-27T10:51:41.847Z"}
```

Comments look like `: ping <epoch-ms>`. At most 32 concurrent stream clients; extras receive `503`.

## Scripts

| Command | What it runs |
| --- | --- |
| `pnpm dev` | Backend watch server and Vite together |
| `pnpm test` | Backend `node:test` and frontend Vitest |
| `pnpm build` | `tsc` / Vite production builds |
| `pnpm --filter frontend lint` | ESLint |

## Stack

pnpm workspace (`backend`, `frontend`). TypeScript throughout.

- Backend: Node.js, Express 5, SSE
- Frontend: React 19, Vite 8, Tailwind CSS 4
