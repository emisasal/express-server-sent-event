import express from "express"
import morgan from "morgan"

const PORT = 8080
const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(morgan("dev"))

// SSE endpoint
app.get("/events", (req, res) => {
  console.log("SSE client connected")

  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")

  // Initial event to acknowledge the connection
  res.write("data: Connected to SSE | New event every 3 seconds\n\n")

  // Periodic updates
  const intervalId = setInterval(() => {
    const data = JSON.stringify({ timestamp: new Date() })
    res.write(`data: ${data}\n\n`)
  }, 3000)

  // Cleanup when the client disconnects
  req.on("close", () => {
    console.warn("SSE client disconnected")
    clearInterval(intervalId)
    res.end()
  })
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

// Test using:
// curl -N http://localhost:8080/events
