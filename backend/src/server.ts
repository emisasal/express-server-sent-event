import { createApp } from "./app.js"
import { log } from "./logger.js"

const PORT = Number.parseInt(process.env.PORT ?? "8080", 10) || 8080
const SHUTDOWN_MS = 5_000
const { app, closeStreams } = createApp()

const server = app.listen(PORT, () => {
  log.info("server", "listening", {
    url: `http://localhost:${PORT}`,
    stream: "GET /events",
    health: "GET /health",
  })
})

let shuttingDown = false

function shutdown(signal: string) {
  if (shuttingDown) {
    return
  }
  shuttingDown = true
  log.info("server", "shutting down", { signal })
  closeStreams()
  server.close((error) => {
    if (error) {
      log.error("server", "close failed", { message: error.message })
      process.exit(1)
    }
    process.exit(0)
  })
  setTimeout(() => {
    log.error("server", "forced exit after shutdown timeout")
    process.exit(1)
  }, SHUTDOWN_MS).unref()
}

process.once("SIGINT", () => shutdown("SIGINT"))
process.once("SIGTERM", () => shutdown("SIGTERM"))
