type LogLevel = "info" | "warn" | "error"

const useColor = Boolean(process.stdout.isTTY)
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

function formatFields(fields?: Record<string, unknown>) {
  if (!fields) {
    return ""
  }

  const parts = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`)

  return parts.length > 0 ? ` ${paint("dim", parts.join(" "))}` : ""
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
  const time = paint("dim", new Date().toISOString())
  const tag = paint(level, level.padEnd(5))
  const area = paint("dim", scope.padEnd(6))
  const stream = level === "error" ? process.stderr : process.stdout
  stream.write(`${time} ${tag} ${area} ${message}${formatFields(fields)}\n`)
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
