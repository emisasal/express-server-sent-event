import { createApp } from "./app.js"
import { log } from "./logger.js"

const PORT = Number.parseInt(process.env.PORT ?? "8080", 10) || 8080
const app = createApp()

app.listen(PORT, () => {
  log.info("server", "listening", {
    url: `http://localhost:${PORT}`,
    stream: "GET /events",
    health: "GET /health",
  })
})
