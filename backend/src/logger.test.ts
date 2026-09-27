import assert from "node:assert/strict"
import { test } from "node:test"
import { serializeLog } from "./logger.js"

test("serializeLog writes JSON when json is true", () => {
  const line = serializeLog(
    "info",
    "server",
    "listening",
    { url: "http://localhost:8080" },
    { json: true, time: "2026-09-27T11:00:00.000Z" },
  )
  assert.equal(
    line,
    '{"time":"2026-09-27T11:00:00.000Z","level":"info","scope":"server","message":"listening","url":"http://localhost:8080"}',
  )
})

test("serializeLog writes a human line when json is false", () => {
  const line = serializeLog(
    "info",
    "sse",
    "pulse sent",
    { id: 1 },
    { json: false, time: "2026-09-27T11:00:00.000Z" },
  )
  assert.match(line, /2026-09-27T11:00:00.000Z/)
  assert.match(line, /info/)
  assert.match(line, /sse/)
  assert.match(line, /pulse sent/)
  assert.match(line, /id=1/)
  assert.doesNotMatch(line, /^\{/)
})
