import { memo } from "react"

type EventCardProps = {
  timestamp: string
  index: number
  isLatest: boolean
}

function formatClock(timestamp: string) {
  const date = new Date(timestamp)
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date)
}

function formatDate(timestamp: string) {
  const date = new Date(timestamp)
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date)
}

const EventCard = memo(function EventCard({
  timestamp,
  index,
  isLatest,
}: EventCardProps) {
  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border px-4 py-4 transition duration-300 motion-reduce:animate-none motion-reduce:transition-none ${
        isLatest
          ? "animate-rise border-signal/50 bg-signal/10 shadow-[0_0_40px_rgba(62,224,197,0.12)]"
          : "border-white/8 bg-white/4 hover:border-white/16 hover:bg-white/7"
      }`}
    >
      <div
        className={`absolute inset-y-0 left-0 w-1 ${
          isLatest ? "bg-signal" : "bg-white/15 group-hover:bg-signal/70"
        }`}
      />
      <div className="flex items-start justify-between gap-4 pl-3">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-white/45 uppercase">
            Pulse {String(index + 1).padStart(3, "0")}
          </p>
          <p className="mt-1 font-mono text-2xl font-medium tracking-tight text-fog tabular-nums">
            {formatClock(timestamp)}
          </p>
          <p className="mt-1 text-sm text-white/50">{formatDate(timestamp)}</p>
        </div>
        {isLatest ? (
          <span className="rounded-full bg-signal/15 px-2.5 py-1 font-mono text-[10px] tracking-[0.18em] text-signal uppercase">
            Live
          </span>
        ) : null}
      </div>
    </article>
  )
})

export default EventCard
