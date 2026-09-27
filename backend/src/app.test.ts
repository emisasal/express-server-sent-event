import assert from "node:assert/strict"
import { once } from "node:events"
import type { AddressInfo } from "node:net"
import { test } from "node:test"
import { createApp } from "./app.js"

async function listen() {
  const app = createApp()
  const server = app.listen(0, "127.0.0.1")
  await once(server, "listening")
  const address = server.address() as AddressInfo
  return {
    server,
    base: `http://127.0.0.1:${address.port}`,
  }
}

async function readUntil(res: Response, predicate: (chunk: string) => boolean) {
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

  await reader.cancel()
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
