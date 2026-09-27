import assert from "node:assert/strict"
import { once } from "node:events"
import type { AddressInfo } from "node:net"
import { test } from "node:test"
import { createApp, type AppOptions } from "./app.js"

async function listen(options?: AppOptions) {
  const created = createApp(options)
  const server = created.app.listen(0, "127.0.0.1")
  await once(server, "listening")
  const address = server.address() as AddressInfo
  return {
    ...created,
    server,
    base: `http://127.0.0.1:${address.port}`,
  }
}

async function readUntil(
  res: Response,
  predicate: (chunk: string) => boolean,
  options?: { cancel?: boolean },
) {
  const reader = res.body?.getReader()
  assert.ok(reader)
  const decoder = new TextDecoder()
  let buffer = ""

  while (!predicate(buffer)) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }
    buffer += decoder.decode(value, { stream: true })
  }

  if (options?.cancel !== false) {
    await reader.cancel()
  }
  return buffer
}

test("GET /health reports ok and zero clients", async (t) => {
  const { server, base } = await listen()
  t.after(() => server.close())

  const res = await fetch(`${base}/health`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { ok: true, activeClients: 0 })
})

test("GET /events sends SSE headers, retry, and the first pulse", async (t) => {
  const { server, base } = await listen()
  t.after(() => server.close())

  const res = await fetch(`${base}/events`)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get("content-type"), "text/event-stream")
  assert.equal(res.headers.get("cache-control"), "no-cache")

  const body = await readUntil(res, (chunk) => chunk.includes("data:"))
  assert.match(body, /retry: 3000/)
  assert.match(body, /id: 1/)
  assert.match(body, /data: \{"timestamp":".+"\}/)
})

test("aborting the SSE request releases the client slot", async (t) => {
  const { server, base } = await listen()
  t.after(() => server.close())

  const controller = new AbortController()
  const res = await fetch(`${base}/events`, { signal: controller.signal })
  await readUntil(res, (chunk) => chunk.includes("data:"))
  controller.abort()

  await new Promise((resolve) => setTimeout(resolve, 50))

  const health = await fetch(`${base}/health`)
  assert.deepEqual(await health.json(), { ok: true, activeClients: 0 })
})

test("closeStreams ends open clients and rejects new ones", async (t) => {
  const { server, base, closeStreams } = await listen()
  t.after(() => server.close())

  const res = await fetch(`${base}/events`)
  const reader = res.body?.getReader()
  assert.ok(reader)
  const decoder = new TextDecoder()
  let buffer = ""
  while (!buffer.includes("data:")) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }
    buffer += decoder.decode(value, { stream: true })
  }

  closeStreams()

  while (true) {
    const { done } = await reader.read()
    if (done) {
      break
    }
  }

  const health = await fetch(`${base}/health`)
  assert.deepEqual(await health.json(), { ok: true, activeClients: 0 })

  const rejected = await fetch(`${base}/events`)
  assert.equal(rejected.status, 503)
  assert.deepEqual(await rejected.json(), { error: "shutting down" })
})

test("GET /events writes a heartbeat comment", async (t) => {
  const { server, base } = await listen({ heartbeatMs: 40 })
  t.after(() => server.close())

  const res = await fetch(`${base}/events`)
  const body = await readUntil(res, (chunk) => chunk.includes(": ping "))
  assert.match(body, /: ping \d+/)
})

test("Last-Event-ID replays pulses after the given id", async (t) => {
  const { server, base } = await listen({
    minDelayMs: 50,
    maxDelayMs: 50,
  })
  t.after(() => server.close())

  const first = await fetch(`${base}/events`)
  await readUntil(first, (chunk) => chunk.includes("id: 1"))
  await new Promise((resolve) => setTimeout(resolve, 20))

  const replay = await fetch(`${base}/events`, {
    headers: { "Last-Event-ID": "0" },
  })
  const replayed = await readUntil(replay, (chunk) => chunk.includes("id: 1"))
  assert.match(replayed, /id: 1/)
  assert.doesNotMatch(replayed, /id: 2/)
  await new Promise((resolve) => setTimeout(resolve, 20))

  const resume = await fetch(`${base}/events`, {
    headers: { "Last-Event-ID": "1" },
  })
  const next = await readUntil(resume, (chunk) => /id: \d+/.test(chunk))
  assert.doesNotMatch(next, /id: 1\n/)
  assert.match(next, /id: 2/)
})

test("GET /events returns 503 when the client cap is reached", async (t) => {
  const { server, base } = await listen({ maxClients: 1 })
  const held = new AbortController()
  t.after(() => {
    held.abort()
    server.close()
  })

  const open = await fetch(`${base}/events`, { signal: held.signal })
  await readUntil(open, (chunk) => chunk.includes("data:"), { cancel: false })

  const rejected = await fetch(`${base}/events`)
  assert.equal(rejected.status, 503)
  assert.equal(rejected.headers.get("retry-after"), "10")
  assert.deepEqual(await rejected.json(), { error: "too many SSE clients" })
})
