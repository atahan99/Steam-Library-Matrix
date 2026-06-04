/** True when a required table or column is missing (SQLite). */
export const isMissingRelationError = (error: unknown): boolean => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error)
  const lower = message.toLowerCase()
  return (
    lower.includes("does not exist") ||
    lower.includes("no such table") ||
    lower.includes("no such column") ||
    (lower.includes("relation") && lower.includes("not found"))
  )
}
