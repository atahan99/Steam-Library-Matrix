import { syncAnticheatCatalogs } from "@/lib/anticheat/sync-catalogs"
import { syncDenuvoCatalogOnly } from "@/lib/anticheat/sync-denuvo-catalog"
import { getDb } from "@/lib/db/client"
import { anticheatEntries } from "@/lib/db/schema"
import { getProfileGamesForEnrichment } from "@/lib/db/profile-appids"
import { inArray } from "drizzle-orm"
import { resolveAppidsForSource } from "@/lib/enrichment/resolve-enrichment-appids"
import { sortAnticheatByPriority } from "@/lib/enrichment/sort-anticheat-priority"
import {
  ensureAnticheatCatalogsReady,
  loadAnticheatEnrichContext,
} from "@/lib/enrichment/anticheat"
import {
  getSource,
  runRegisteredSourceStep,
} from "@/lib/enrichment/sources"
import { enrichLog } from "@/lib/jobs/enrich-logger"
import { runAchievementsBatch } from "@/lib/jobs/steps/achievements-step"
import { runAnticheatBatch } from "@/lib/jobs/steps/anticheat-step"
import { runAppDetailsBatch } from "@/lib/jobs/steps/app-details-step"
import {
  getAppDetailsBatch,
  getAppDetailsConcurrency,
  getAnticheatBatch,
  getAchievementsBatch,
  getAchievementsConcurrency,
  getDenuvoStoreBatch,
} from "@/lib/jobs/batch-config"
import { resolveAppDetailsAppids } from "@/lib/jobs/steps/resolve-appids"
import type { JobPayload, JobProgress } from "@/lib/jobs/types"
import { syncSteamWishlist } from "@/lib/steam/sync-wishlist"
import type { EnrichmentJobKind } from "@/lib/jobs/types"

const resolveAnticheatPhase = (
  payload: JobPayload
): "catalog" | "denuvo" => payload.anticheatPhase ?? "catalog"

export type StepResult = {
  done: boolean
  payload: JobPayload
  progress: JobProgress
  error?: string
}

type ScopedJobPayload = JobPayload & { scopeAppids?: number[] }

const resolveOptions = (
  steamid: string,
  payload: ScopedJobPayload,
  force: boolean,
  missingOnly: boolean
) => ({
  steamid,
  appids: payload.appids,
  scopeAppids: payload.scopeAppids,
  force,
  missingOnly,
})

export const runEnrichmentJobStep = async (input: {
  steamid: string
  kind: EnrichmentJobKind
  payload: JobPayload
  deadlineMs: number
}): Promise<StepResult> => {
  const registered = getSource(input.kind)
  if (registered) {
    return runRegisteredSourceStep(registered, input)
  }

  const force = input.payload.force ?? false
  const missingOnly = input.payload.missingOnly ?? false
  const stats = { ...input.payload.stats }
  const scopedPayload = input.payload as ScopedJobPayload

  const mergeProgress = (patch: JobProgress): JobProgress => ({
    checked: (stats.checked ?? 0) + (patch.checked ?? 0),
    updated: (stats.updated ?? 0) + (patch.updated ?? 0),
    failed: (stats.failed ?? 0) + (patch.failed ?? 0),
    skippedLowConfidence:
      (stats.skippedLowConfidence ?? 0) + (patch.skippedLowConfidence ?? 0),
    total: patch.total ?? stats.total,
    message: patch.message ?? stats.message,
  })

  switch (input.kind) {
    case "wishlist": {
      enrichLog(`wishlist sync steamid=${input.steamid}`)
      await syncSteamWishlist(input.steamid)
      enrichLog(`wishlist sync completed steamid=${input.steamid}`)
      return {
        done: true,
        payload: input.payload,
        progress: { message: "Wishlist sync completed" },
      }
    }
    case "anticheat_catalog": {
      enrichLog(`anticheat_catalog sync steamid=${input.steamid} force=${force}`)
      const catalogResult = await syncAnticheatCatalogs(input.steamid, { force })
      const catalogDone =
        Boolean(catalogResult.skipped) ||
        (!catalogResult.awacyError &&
          catalogResult.levvvelComplete &&
          !catalogResult.levvvelError)
      enrichLog(`anticheat_catalog sync completed steamid=${input.steamid}`)
      return {
        done: catalogDone,
        payload: input.payload,
        progress: {
          message: catalogDone
            ? "Anti-cheat catalog sync completed"
            : catalogResult.levvvelError ??
              "Anti-cheat catalog sync incomplete",
        },
        error: catalogDone ? undefined : catalogResult.levvvelError,
      }
    }
    case "denuvo_catalog": {
      enrichLog(`denuvo_catalog sync steamid=${input.steamid} force=${force}`)
      const denuvoResult = await syncDenuvoCatalogOnly(input.steamid, { force })
      const denuvoDone =
        Boolean(denuvoResult.skipped) ||
        (denuvoResult.denuvoAntiTamperComplete &&
          !denuvoResult.denuvoAntiTamperError)
      enrichLog(`denuvo_catalog sync completed steamid=${input.steamid}`)
      return {
        done: denuvoDone,
        payload: input.payload,
        progress: {
          message: denuvoDone
            ? "Denuvo catalog sync completed"
            : denuvoResult.denuvoAntiTamperError ??
              "Denuvo catalog sync incomplete",
        },
        error: denuvoDone ? undefined : denuvoResult.denuvoAntiTamperError,
      }
    }
    case "achievements": {
      let appids = input.payload.appids
      if (!appids?.length) {
        appids = await resolveAppidsForSource(
          "achievements",
          resolveOptions(input.steamid, scopedPayload, force, missingOnly)
        )
      }
      const cursor = input.payload.cursor ?? 0
      const total = appids.length
      if (total === 0) {
        return {
          done: true,
          payload: { ...input.payload, appids, cursor: 0, stats },
          progress: { ...stats, total: 0, message: "Nothing to refresh" },
        }
      }

      const batch = await runAchievementsBatch(
        input.steamid,
        appids,
        cursor,
        getAchievementsBatch(),
        input.deadlineMs,
        force,
        getAchievementsConcurrency()
      )
      const nextCursor = cursor + batch.processed
      const nextStats = mergeProgress({
        checked: batch.checked,
        updated: batch.updated,
        failed: batch.failed,
        total,
      })
      const done = nextCursor >= total
      return {
        done,
        payload: {
          ...input.payload,
          appids,
          cursor: nextCursor,
          stats: nextStats,
        },
        progress: {
          ...nextStats,
          message: done
            ? "Achievements refresh completed"
            : `Achievements ${nextCursor}/${total}`,
        },
      }
    }
    case "anticheat": {
      const phase = resolveAnticheatPhase(input.payload)
      const cursor = input.payload.cursor ?? 0
      if (cursor === 0 && phase === "catalog") {
        const catalog = await ensureAnticheatCatalogsReady(input.steamid)
        if (!catalog.ready) {
          return {
            done: true,
            payload: input.payload,
            progress: {
              ...stats,
              message: catalog.catalogError,
            },
            error: catalog.catalogError,
          }
        }
      }

      let appids = input.payload.appids
      let gameNames = input.payload.gameNames
      if (!appids?.length) {
        appids = await resolveAppidsForSource(
          "anticheat",
          resolveOptions(input.steamid, scopedPayload, force, missingOnly)
        )
        const allRows = await getProfileGamesForEnrichment(input.steamid)
        const appidSet = new Set(appids)
        const rows = allRows.filter((row) => appidSet.has(row.appid))
        appids = rows.map((row) => row.appid)
        gameNames = Object.fromEntries(
          rows.map((row) => [String(row.appid), row.name])
        )
      }

      let anticheatRows = appids.map((appid) => ({
        appid,
        name: gameNames?.[String(appid)] ?? `App ${appid}`,
      }))

      if (phase === "denuvo" && cursor === 0) {
        const db = getDb()
        const denuvoMeta = await db
          .select({
            appid: anticheatEntries.appid,
            denuvoAntiTamper: anticheatEntries.denuvoAntiTamper,
            denuvoConfidence: anticheatEntries.denuvoConfidence,
            denuvoCheckedAt: anticheatEntries.denuvoCheckedAt,
          })
          .from(anticheatEntries)
          .where(inArray(anticheatEntries.appid, appids))

        const metaByAppid = new Map(denuvoMeta.map((row) => [row.appid, row]))
        anticheatRows = sortAnticheatByPriority(
          anticheatRows.map((row) => ({
            ...row,
            ...metaByAppid.get(row.appid),
          })),
          { scopeAppids: input.payload.scopeAppids }
        )
      }

      const total = anticheatRows.length
      if (total === 0) {
        return {
          done: true,
          payload: { ...input.payload, appids, gameNames, cursor: 0, stats },
          progress: { ...stats, total: 0, message: "Nothing to refresh" },
        }
      }

      const context = await loadAnticheatEnrichContext()
      const anticheatBatchSize =
        phase === "denuvo" ? getDenuvoStoreBatch() : getAnticheatBatch()
      const batch = await runAnticheatBatch(
        anticheatRows,
        cursor,
        anticheatBatchSize,
        input.deadlineMs,
        context,
        force,
        phase === "denuvo" && cursor > 0,
        phase
      )
      const nextCursor = cursor + batch.processed
      const nextStats = mergeProgress({
        checked: batch.checked,
        updated: batch.updated,
        failed: batch.failed,
        total,
      })

      if (batch.schemaError) {
        return {
          done: true,
          payload: {
            ...input.payload,
            appids,
            gameNames,
            cursor: nextCursor,
            anticheatPhase: phase,
            stats: nextStats,
          },
          progress: {
            ...nextStats,
            message: batch.schemaError,
          },
          error: batch.schemaError,
        }
      }

      if (phase === "catalog" && nextCursor >= total) {
        return {
          done: false,
          payload: {
            ...input.payload,
            appids,
            gameNames,
            cursor: 0,
            anticheatPhase: "denuvo",
            stats: nextStats,
          },
          progress: {
            ...nextStats,
            message: `Anti-cheat catalog ${total}/${total}, starting Denuvo pass`,
          },
        }
      }

      const done = nextCursor >= total
      return {
        done,
        payload: {
          ...input.payload,
          appids,
          gameNames,
          cursor: nextCursor,
          anticheatPhase: phase,
          stats: nextStats,
        },
        progress: {
          ...nextStats,
          message: done
            ? "Anti-cheat refresh completed"
            : `Anti-cheat ${phase} ${nextCursor}/${total}`,
        },
      }
    }
    case "app_details": {
      let appids = input.payload.appids
      if (!appids?.length) {
        appids = await resolveAppDetailsAppids(
          input.steamid,
          force,
          input.payload.scopeAppids
        )
      }
      const cursor = input.payload.cursor ?? 0
      const total = appids.length
      if (total === 0) {
        return {
          done: true,
          payload: { ...input.payload, appids, cursor: 0, stats },
          progress: { ...stats, total: 0, message: "Nothing to refresh" },
        }
      }

      const batch = await runAppDetailsBatch(
        input.steamid,
        appids,
        cursor,
        getAppDetailsBatch(),
        input.deadlineMs,
        force,
        getAppDetailsConcurrency()
      )
      const nextCursor = cursor + batch.processed
      const nextStats = mergeProgress({
        checked: batch.checked,
        updated: batch.updated,
        failed: batch.failed,
        total,
      })
      const done = nextCursor >= total
      return {
        done,
        payload: {
          ...input.payload,
          appids,
          cursor: nextCursor,
          stats: nextStats,
        },
        progress: {
          ...nextStats,
          message: done
            ? "App details refresh completed"
            : `App details ${nextCursor}/${total}`,
        },
      }
    }
    default:
      return {
        done: true,
        payload: input.payload,
        progress: stats,
        error: `Unknown job kind`,
      }
  }
}
