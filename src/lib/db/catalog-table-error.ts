export const formatDbError = (error: unknown): string => {
  if (!error) return "Unknown error"
  if (error instanceof Error) return error.message
  if (typeof error === "object") {
    const record = error as Record<string, unknown>
    const parts = [record.message, record.details, record.hint, record.code].filter(
      Boolean
    )
    if (parts.length) return parts.map(String).join(" — ")
  }
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

export const isMissingCatalogTableError = (error: unknown): boolean => {
  const text = formatDbError(error).toLowerCase()
  return (
    text.includes("does not exist") ||
    text.includes("no such table") ||
    text.includes("no such column") ||
    text.includes("could not find the table") ||
    (text.includes("relation") && text.includes("not found"))
  )
}

export const ANTICHEAT_CATALOG_MIGRATION_HINT =
  "Anti-cheat catalog tables are missing. Run pnpm db:migrate against your DATABASE_URL."

export const DENUVO_CATALOG_MIGRATION_HINT =
  "Denuvo catalog tables are missing. Run pnpm db:migrate against your DATABASE_URL."

export const DB_MIGRATE_HINT = "Run pnpm db:migrate against your DATABASE_URL."
