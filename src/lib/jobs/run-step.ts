import { syncAnticheatCatalogs } from "@/lib/anticheat/sync-catalogs"
import { getProfileGamesForEnrichment } from "@/lib/db/profile-appids"
import { resolveAppidsForSource } from "@/lib/enrichment/resolve-enrichment-appids"
import {
  ensureAnticheatCatalogsReady,
  loadAnticheatEnrichContext,
} from "@/lib/enrichment/anticheat"
import { enrichLog } from "@/lib/jobs/enrich-logger"
import { runAchievementsBatch } from "@/lib/jobs/steps/achievements-step"
import { runAnticheatBatch } from "@/lib/jobs/steps/anticheat-step"
import { runAppDetailsBatch } from "@/lib/jobs/steps/app-details-step"
import { runHltbBatch } from "@/lib/jobs/steps/hltb-step"
import {
  APP_DETAILS_BATCH,
  ANTICHEAT_BATCH,
  ACHIEVEMENTS_BATCH,
  ACHIEVEMENTS_CONCURRENCY,
  HLTB_BATCH,
  HLTB_CONCURRENCY,
  PROTONDB_BATCH,
  PROTONDB_CONCURRENCY,
} from "@/lib/jobs/batch-config"
import { runProtonDbBatch } from "@/lib/jobs/steps/protondb-step"
import { resolveAppDetailsAppids, resolveHltbAppids } from "@/lib/jobs/steps/resolve-appids"
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
      await syncAnticheatCatalogs(input.steamid, { force })
      enrichLog(`anticheat_catalog sync completed steamid=${input.steamid}`)
      return {
        done: true,
        payload: input.payload,
        progress: { message: "Anti-cheat catalog sync completed" },
      }
    }
    case "protondb": {
      let appids = input.payload.appids
      if (!appids?.length) {
        appids = await resolveAppidsForSource(
          "protondb",
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

      const batch = await runProtonDbBatch(
        appids,
        cursor,
        PROTONDB_BATCH,
        input.deadlineMs,
        force,
        PROTONDB_CONCURRENCY
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
            ? "ProtonDB refresh completed"
            : `ProtonDB ${nextCursor}/${total}`,
        },
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
        ACHIEVEMENTS_BATCH,
        input.deadlineMs,
        force,
        ACHIEVEMENTS_CONCURRENCY
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

      const anticheatRows = appids.map((appid) => ({
        appid,
        name: gameNames?.[String(appid)] ?? `App ${appid}`,
      }))
      const total = anticheatRows.length
      if (total === 0) {
        return {
          done: true,
          payload: { ...input.payload, appids, gameNames, cursor: 0, stats },
          progress: { ...stats, total: 0, message: "Nothing to refresh" },
        }
      }

      const context = await loadAnticheatEnrichContext()
      const batch = await runAnticheatBatch(
        anticheatRows,
        cursor,
        ANTICHEAT_BATCH,
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
        APP_DETAILS_BATCH,
        input.deadlineMs,
        force
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
    case "hltb": {
      let rows = input.payload.appids?.length
        ? input.payload.appids.map((appid) => ({
            appid,
            name: input.payload.gameNames?.[String(appid)] ?? `App ${appid}`,
          }))
        : null

      if (!rows) {
        const resolved = await resolveHltbAppids(input.steamid, {
          force,
          missingOnly,
          scopeAppids: input.payload.scopeAppids,
        })
        rows = resolved
        input.payload.appids = resolved.map((r) => r.appid)
        input.payload.gameNames = Object.fromEntries(
          resolved.map((r) => [String(r.appid), r.name])
        )
      }

      const cursor = input.payload.cursor ?? 0
      const total = rows.length
      if (total === 0) {
        return {
          done: true,
          payload: { ...input.payload, cursor: 0, stats },
          progress: { ...stats, total: 0, message: "Nothing to refresh" },
        }
      }

      const batch = await runHltbBatch(
        rows,
        cursor,
        HLTB_BATCH,
        input.deadlineMs,
        HLTB_CONCURRENCY
      )
      const nextCursor = cursor + batch.processed
      const nextStats = mergeProgress({
        checked: batch.checked,
        updated: batch.updated,
        failed: batch.failed,
        skippedLowConfidence: batch.skippedLowConfidence,
        total,
      })
      const done = nextCursor >= total
      return {
        done,
        payload: {
          ...input.payload,
          cursor: nextCursor,
          stats: nextStats,
        },
        progress: {
          ...nextStats,
          message: done
            ? "HowLongToBeat refresh completed"
            : `HowLongToBeat ${nextCursor}/${total}`,
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
