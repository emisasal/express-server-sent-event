export function parsePulse(data: string): { timestamp: string } | null {
  try {
    const parsed: unknown = JSON.parse(data)
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as { timestamp?: unknown }).timestamp !== "string"
    ) {
      return null
    }
    return { timestamp: (parsed as { timestamp: string }).timestamp }
  } catch {
    return null
  }
}
