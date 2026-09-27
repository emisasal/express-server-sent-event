import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import App from "./App"

class FakeEventSource {
  static instances: FakeEventSource[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  readyState = 0
  url: string

  constructor(url: string) {
    this.url = url
    FakeEventSource.instances.push(this)
    queueMicrotask(() => {
      this.readyState = 1
      this.onopen?.()
    })
  }

  close() {
    this.readyState = 2
  }
}

describe("App feed", () => {
  beforeEach(() => {
    FakeEventSource.instances = []
    vi.stubGlobal("EventSource", FakeEventSource)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("appends a parsed timestamp from the stream", async () => {
    render(<App />)

    expect(FakeEventSource.instances[0]?.url).toBe("/events")
    await screen.findByRole("status", { name: /live/i })

    act(() => {
      FakeEventSource.instances[0]?.onmessage?.({
        data: '{"timestamp":"2026-09-27T10:00:00.000Z"}',
        lastEventId: "7",
      } as MessageEvent)
    })

    expect(await screen.findByText("Pulse 007")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("ignores a malformed event", async () => {
    render(<App />)
    await screen.findByRole("status", { name: /live/i })

    act(() => {
      FakeEventSource.instances[0]?.onmessage?.({
        data: "not-json",
        lastEventId: "1",
      } as MessageEvent)
    })

    expect(screen.getByText("Waiting for the first pulse")).toBeInTheDocument()
    expect(screen.getByText("0")).toBeInTheDocument()
  })

  it("pauses the feed and can clear cards", async () => {
    render(<App />)
    await screen.findByRole("status", { name: /live/i })

    fireEvent.click(screen.getByRole("button", { name: "Pause feed" }))

    act(() => {
      FakeEventSource.instances[0]?.onmessage?.({
        data: '{"timestamp":"2026-09-27T10:00:00.000Z"}',
        lastEventId: "3",
      } as MessageEvent)
    })

    expect(screen.getByText("Waiting for the first pulse")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Resume feed" }))

    act(() => {
      FakeEventSource.instances[0]?.onmessage?.({
        data: '{"timestamp":"2026-09-27T11:00:00.000Z"}',
        lastEventId: "4",
      } as MessageEvent)
    })

    expect(await screen.findByText("Pulse 004")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Clear feed" }))
    expect(screen.getByText("Waiting for the first pulse")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
  })
})
