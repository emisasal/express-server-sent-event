import express from "express"
import morgan from "morgan"
import { log } from "./logger.js"

export const MAX_CLIENTS = 32
const BUFFER_SIZE = 100
const HEARTBEAT_MS = 15_000
const RETRY_MS = 3_000
const MIN_DELAY_MS = 1_000
const MAX_DELAY_MS = 10_000

type Pulse = {
  id: number
  timestamp: string
}

function randomDelayMs() {
  return (
    Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS
  )
}

export function createApp() {
  const app = express()
  let nextClientId = 1
  let activeClients = 0
  let nextEventId = 1
  const recentPulses: Pulse[] = []

  if (process.env.NODE_ENV !== "test") {
    app.use(
      morgan("dev", {
        skip: (req) => req.path === "/events",
      }),
    )
  }

  function remember(pulse: Pulse) {
    recentPulses.push(pulse)
    if (recentPulses.length > BUFFER_SIZE) {
      recentPulses.shift()
    }
  }

  function createPulse(): Pulse {
    const pulse = {
      id: nextEventId++,
      timestamp: new Date().toISOString(),
    }
    remember(pulse)
    return pulse
  }

  function writePulse(res: express.Response, pulse: Pulse) {
    res.write(`id: ${pulse.id}\n`)
    res.write(`data: ${JSON.stringify({ timestamp: pulse.timestamp })}\n\n`)
  }

  app.get("/health", (_req, res) => {
    res.json({ ok: true, activeClients })
  })

  app.get("/events", (req, res) => {
    if (activeClients >= MAX_CLIENTS) {
      log.warn("sse", "client rejected", {
        remote: req.socket.remoteAddress ?? "unknown",
        active: activeClients,
        max: MAX_CLIENTS,
      })
      res.setHeader("Retry-After", "10")
      res.status(503).json({ error: "too many SSE clients" })
      return
    }

    const clientId = nextClientId++
    const connectedAt = Date.now()
    const remote = req.socket.remoteAddress ?? "unknown"
    const lastEventId = Number.parseInt(
      String(req.headers["last-event-id"] ?? ""),
      10,
    )
    const isResume = Number.isFinite(lastEventId)
    const replay = isResume
      ? recentPulses.filter((pulse) => pulse.id > lastEventId)
      : []

    activeClients += 1
    let pulses = 0
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let heartbeatId: ReturnType<typeof setInterval> | undefined
    let closed = false

    log.info("sse", "client connected", {
      client: clientId,
      remote,
      lastEventId: isResume ? lastEventId : "none",
      replay: replay.length,
      active: activeClients,
    })

    res.status(200)
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("X-Accel-Buffering", "no")
    res.flushHeaders()
    res.write(`retry: ${RETRY_MS}\n\n`)

    const emit = (pulse: Pulse) => {
      if (res.writableEnded || res.destroyed) {
        return
      }
      pulses += 1
      writePulse(res, pulse)
      log.info("sse", "pulse sent", {
        client: clientId,
        id: pulse.id,
        timestamp: pulse.timestamp,
      })
    }

    for (const pulse of replay) {
      emit(pulse)
    }

    if (!isResume) {
      emit(createPulse())
    }

    const schedule = () => {
      timeoutId = setTimeout(() => {
        if (closed) {
          return
        }
        emit(createPulse())
        schedule()
      }, randomDelayMs())
    }

    schedule()
    heartbeatId = setInterval(() => {
      if (res.writableEnded || res.destroyed) {
        return
      }
      res.write(`: ping ${Date.now()}\n\n`)
    }, HEARTBEAT_MS)

    const finish = (reason: string) => {
      if (closed) {
        return
      }
      closed = true
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
      if (heartbeatId !== undefined) {
        clearInterval(heartbeatId)
      }
      activeClients = Math.max(0, activeClients - 1)
      log.info("sse", "client disconnected", {
        client: clientId,
        reason,
        durationMs: Date.now() - connectedAt,
        pulses,
        active: activeClients,
      })

      if (!res.writableEnded) {
        res.end()
      }
    }

    req.on("close", () => finish("request_closed"))
    req.on("aborted", () => finish("request_aborted"))
    res.on("error", (error) => {
      log.error("sse", "stream error", {
        client: clientId,
        message: error.message,
      })
      finish("response_error")
    })
  })

  return app
}
