type LogLevel = "info" | "warn" | "error"

const useColor = Boolean(process.stdout.isTTY)
const jsonLogs = !process.stdout.isTTY
const codes = {
  dim: "\x1b[90m",
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
  reset: "\x1b[0m",
}

function paint(color: keyof typeof codes, value: string) {
  if (!useColor) {
    return value
  }
  return `${codes[color]}${value}${codes.reset}`
}

export function serializeLog(
  level: LogLevel,
  scope: string,
  message: string,
  fields?: Record<string, unknown>,
  options?: { json?: boolean; time?: string },
) {
  const time = options?.time ?? new Date().toISOString()
  const json = options?.json ?? jsonLogs
  const payload = { time, level, scope, message, ...fields }

  if (json) {
    return JSON.stringify(payload)
  }

  const extra = Object.entries(fields ?? {})
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(" ")

  const pretty = `${paint("dim", time)} ${paint(level, level.padEnd(5))} ${paint("dim", scope.padEnd(6))} ${message}`
  return extra.length > 0 ? `${pretty} ${paint("dim", extra)}` : pretty
}

function write(
  level: LogLevel,
  scope: string,
  message: string,
  fields?: Record<string, unknown>,
) {
  if (process.env.NODE_ENV === "test") {
    return
  }
  const stream = level === "error" ? process.stderr : process.stdout
  stream.write(`${serializeLog(level, scope, message, fields)}\n`)
}

export const log = {
  info(scope: string, message: string, fields?: Record<string, unknown>) {
    write("info", scope, message, fields)
  },
  warn(scope: string, message: string, fields?: Record<string, unknown>) {
    write("warn", scope, message, fields)
  },
  error(scope: string, message: string, fields?: Record<string, unknown>) {
    write("error", scope, message, fields)
  },
}
