import { startTransition, useCallback, useEffect, useRef, useState } from "react"
import EventCard from "./EventCard"
import { parsePulse } from "./parsePulse"

type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "error"
type StreamEvent = {
  id: string
  timestamp: string
}

const VISIBLE_EVENTS = 48
const STUCK_RECONNECT_MS = 15_000

const STATUS_COPY: Record<
  ConnectionStatus,
  { label: string; detail: string; tone: string }
> = {
  connecting: {
    label: "Tuning in",
    detail: "Opening the event stream…",
    tone: "bg-amber-300",
  },
  connected: {
    label: "Live",
    detail: "Pulses arrive every 1–10 seconds. Dropped connections resume from the last event id.",
    tone: "bg-signal",
  },
  reconnecting: {
    label: "Reconnecting",
    detail: "The browser is retrying the stream automatically.",
    tone: "bg-amber-300",
  },
  error: {
    label: "Signal lost",
    detail: "Automatic reconnect stalled. Retry the stream to resume from the last event id.",
    tone: "bg-ember",
  },
}

function App() {
  const [status, setStatus] = useState<ConnectionStatus>("connecting")
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [received, setReceived] = useState(0)
  const [session, setSession] = useState(0)
  const seenIds = useRef(new Set<string>())

  const reconnect = useCallback(() => {
    setStatus("connecting")
    setSession((value) => value + 1)
  }, [])

  useEffect(() => {
    const eventSource = new EventSource("/events")

    eventSource.onopen = () => {
      setStatus("connected")
    }

    eventSource.onmessage = (event) => {
      const parsed = parsePulse(event.data)
      if (!parsed) {
        return
      }

      const id = event.lastEventId || crypto.randomUUID()
      if (seenIds.current.has(id)) {
        return
      }
      seenIds.current.add(id)

      startTransition(() => {
        setReceived((count) => count + 1)
        setEvents((previous) =>
          [{ id, timestamp: parsed.timestamp }, ...previous].slice(
            0,
            VISIBLE_EVENTS,
          ),
        )
      })
    }

    eventSource.onerror = () => {
      if (eventSource.readyState === EventSource.CLOSED) {
        setStatus("error")
        return
      }
      setStatus("reconnecting")
    }

    return () => {
      eventSource.close()
    }
  }, [session])

  useEffect(() => {
    if (status !== "reconnecting") {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setStatus("error")
    }, STUCK_RECONNECT_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [status])

  const copy = STATUS_COPY[status]
  const showReconnect = status === "error"

  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-ink text-fog">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-112 w-md -translate-x-1/2 rounded-full bg-signal/18 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -bottom-32 h-104 w-104 rounded-full bg-ember/16 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-size-[56px_56px] opacity-[0.18] bg-[linear-gradient(rgba(215,236,230,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(215,236,230,0.07)_1px,transparent_1px)]"
      />

      <main className="relative mx-auto flex min-h-dvh max-w-3xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-lg">
            <p className="font-mono text-[11px] tracking-[0.28em] text-signal uppercase">
              Express · SSE
            </p>
            <h1 className="mt-3 font-display text-4xl leading-[1.05] font-medium tracking-tight text-white sm:text-5xl">
              Incoming pulses
            </h1>
            <p className="mt-3 max-w-md text-base leading-relaxed text-white/60">
              A live console for server-sent timestamps. Each card is a beat
              from the backend, arriving on an irregular cadence.
            </p>
          </div>

          <div
            className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md"
            role="status"
            aria-live="polite"
            aria-label={copy.label}
          >
            <span className="relative flex h-2.5 w-2.5">
              {status === "connected" ? (
                <span className="absolute inset-0 animate-ping rounded-full bg-signal/70 motion-reduce:animate-none" />
              ) : null}
              <span className={`relative h-2.5 w-2.5 rounded-full ${copy.tone}`} />
            </span>
            <span className="font-mono text-xs tracking-[0.18em] text-white uppercase">
              {copy.label}
            </span>
          </div>
        </header>

        <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-4">
            <p className="font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase">
              Received
            </p>
            <p className="mt-2 font-display text-3xl text-white tabular-nums">
              {received}
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-4">
            <p className="font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase">
              Cadence
            </p>
            <p className="mt-2 text-lg text-white">1–10s</p>
          </div>
          <div className="col-span-2 rounded-2xl border border-white/8 bg-white/4 px-4 py-4 sm:col-span-1">
            <p className="font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase">
              Channel
            </p>
            <p className="mt-2 font-mono text-sm text-signal">/events</p>
          </div>
        </section>

        <p className="mt-6 text-sm text-white/50">{copy.detail}</p>

        {showReconnect ? (
          <button
            type="button"
            onClick={reconnect}
            className="mt-4 w-fit rounded-full bg-fog px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          >
            Reconnect stream
          </button>
        ) : null}

        <section
          aria-label="Live event feed"
          className="mt-6 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4 [content-visibility:auto]"
        >
          {events.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-white/12 bg-white/3 px-6 py-16 text-center">
              <span className="h-12 w-12 rounded-full border border-signal/40 bg-signal/10 shadow-[0_0_30px_rgba(62,224,197,0.2)]" />
              <p className="mt-5 font-display text-2xl text-white">
                Waiting for the first pulse
              </p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/50">
                Keep this tab open. The next timestamp will land here the moment
                the server writes an event.
              </p>
            </div>
          ) : (
            events.map((event, index) => (
              <EventCard
                key={event.id}
                id={event.id}
                timestamp={event.timestamp}
                isLatest={index === 0}
              />
            ))
          )}
        </section>
      </main>
    </div>
  )
}

export default App
