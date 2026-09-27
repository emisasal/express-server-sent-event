import express from "express"
import cors from "cors"
import morgan from "morgan"
import { log } from "./logger.js"

const PORT = 8080
const app = express()

let nextClientId = 1
let activeClients = 0

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors())
app.use(
  morgan("dev", {
    skip: (req) => req.path === "/events",
  }),
)

app.get("/events", (req, res) => {
  const clientId = nextClientId++
  const connectedAt = Date.now()
  let pulses = 0
  const remote = req.socket.remoteAddress ?? "unknown"
  const intervalMs = Math.floor(Math.random() * 10_000) + 1

  activeClients += 1
  log.info("sse", "client connected", {
    client: clientId,
    remote,
    intervalMs,
    active: activeClients,
  })

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.flushHeaders()

  const sendPulse = () => {
    if (res.writableEnded || res.destroyed) {
      return
    }

    pulses += 1
    const timestamp = new Date().toISOString()
    const payload = JSON.stringify({ timestamp })

    res.write(`data: ${payload}\n\n`)
    log.info("sse", "pulse sent", {
      client: clientId,
      pulse: pulses,
      timestamp,
    })
  }

  const intervalId = setInterval(sendPulse, intervalMs)

  let closed = false

  const finish = (reason: string) => {
    if (closed) {
      return
    }
    closed = true
    clearInterval(intervalId)
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

app.listen(PORT, () => {
  log.info("server", "listening", {
    url: `http://localhost:${PORT}`,
    stream: "GET /events",
  })
})
