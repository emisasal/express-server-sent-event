import { useEffect, useState } from "react"
import styles from "./App.module.css"
import Card from "./Card"

function App() {
  const [status, setStatus] = useState("Disconnected")
  const [events, setEvents] = useState<string[]>([])

  useEffect(() => {
    const eventSource = new EventSource("http://localhost:8080/events")

    eventSource.onopen = () => {
      console.info("SSE client connected")
      setStatus("Connected")
    }

    eventSource.onmessage = (event) => {
      const parsedData = JSON.parse(event.data).timestamp
      setEvents((prevEvents) => [parsedData, ...prevEvents])
    }

    eventSource.onerror = () => {
      console.warn("SSE client disconnected")
      setStatus("Error found | Disconnected")
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [])

  return (
    <main className={styles.container}>
      <h1>Server-Sent Events</h1>
      <p>Random events received every 1-10 seconds.</p>
      <p>Status: {status}</p>

      <div className={styles.cards}>
        {events.map((event, index) => (
          <Card key={index} event={event} />
        ))}
      </div>
    </main>
  )
}

export default App
