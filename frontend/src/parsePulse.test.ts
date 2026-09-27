import { describe, expect, it } from "vitest"
import { parsePulse } from "./parsePulse"

describe("parsePulse", () => {
  it("reads a timestamp payload", () => {
    expect(
      parsePulse('{"timestamp":"2026-09-27T10:00:00.000Z"}'),
    ).toEqual({ timestamp: "2026-09-27T10:00:00.000Z" })
  })

  it("rejects malformed payloads", () => {
    expect(parsePulse("not-json")).toBeNull()
    expect(parsePulse("{}")).toBeNull()
    expect(parsePulse('{"timestamp":1}')).toBeNull()
  })
})
