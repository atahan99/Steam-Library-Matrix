import { NextResponse } from "next/server"
import {
  listAnticheatCatalogPage,
  type AnticheatCatalogBrowseSource,
} from "@/lib/db/list-anticheat-catalog-page"
import {
  ANTICHEAT_CATALOG_MIGRATION_HINT,
  DENUVO_CATALOG_MIGRATION_HINT,
  formatDbError,
  isMissingCatalogTableError,
} from "@/lib/db/catalog-table-error"
import { runApiRoute } from "@/lib/api/with-api-route"

const SOURCES: AnticheatCatalogBrowseSource[] = ["awacy", "levvvel", "denuvo"]

const parseSource = (value: string | null): AnticheatCatalogBrowseSource | null => {
  if (!value) return null
  return SOURCES.includes(value as AnticheatCatalogBrowseSource)
    ? (value as AnticheatCatalogBrowseSource)
    : null
}

export const GET = async (request: Request) =>
  runApiRoute(request, { tier: "default" }, async () => {
    const url = new URL(request.url)
    const source = parseSource(url.searchParams.get("source"))
    if (!source) {
      return NextResponse.json(
        { error: "source is required (awacy, levvvel, or denuvo)" },
        { status: 400 }
      )
    }

    const search = url.searchParams.get("search") ?? undefined
    const limit = Number(url.searchParams.get("limit") ?? "25")
    const offset = Number(url.searchParams.get("offset") ?? "0")

    try {
      const result = await listAnticheatCatalogPage({
        source,
        search,
        limit: Number.isFinite(limit) ? limit : 25,
        offset: Number.isFinite(offset) ? offset : 0,
      })

      return NextResponse.json(result)
    } catch (error) {
      if (isMissingCatalogTableError(error)) {
        const message = formatDbError(error)
        const hint = message.includes("denuvo")
          ? DENUVO_CATALOG_MIGRATION_HINT
          : ANTICHEAT_CATALOG_MIGRATION_HINT
        return NextResponse.json(
          { error: `${message} ${hint}` },
          { status: 503 }
        )
      }
      throw error
    }
  })
