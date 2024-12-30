import { useEffect, useState } from "react"
import styles from "./App.module.css"

function App() {
  const [listening, setListening] = useState(false)
  const [events, setEvents] = useState<string[]>([])

  useEffect(() => {
    if (!listening) {
      const eventSource = new EventSource("http://localhost:8080/events")

      eventSource.onopen = () => {
        console.info("SSE client connected")
        setListening(true)
      }

      eventSource.onmessage = (event) => {
        const parsedData = JSON.parse(event.data)
        setEvents((prevEvents) => [parsedData, ...prevEvents])
      }

      eventSource.onerror = () => {
        console.warn("SSE client disconnected")
        setListening(false)
        eventSource.close()
      }

      return () => {
        console.warn("SSE client disconnected")
        setListening(false)
        eventSource.close()
      }
    }
  }, [listening])

  return (
    <main className={styles.container}>
      <h1>Server-Sent Events</h1>
      <p>Random events received every 1-10 seconds.</p>
      <ul>
        {events.map((event, index) => (
          <li key={index}>{JSON.stringify(event)}</li>
        ))}
      </ul>
    </main>
  )
}

export default App
