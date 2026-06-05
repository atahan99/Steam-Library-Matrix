#!/usr/bin/env tsx
/**
 * Fresh-profile seed smoke test against a running server.
 * Usage: tsx --env-file=.env scripts/test-fresh-profile-seed.ts --base http://localhost:3000 --profile https://steamcommunity.com/id/919100
 */
import {
  countAchievementsEnrichedGames,
  countAchievementsResolvedGames,
} from "@/lib/enrichment/achievements-lookup-outcome"
import {
  countHltbEnrichedGames,
  countHltbResolvedGames,
  isHltbConfirmedAbsentMatchedName,
} from "@/lib/enrichment/hltb-lookup-outcome"
import type { DashboardGame } from "@/types/dashboard"
const parseArgs = () => {
  const args = process.argv.slice(2)
  let base = "http://localhost:3000"
  let profile = "https://steamcommunity.com/id/919100"

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--base" && args[i + 1]) {
      base = args[i + 1].replace(/\/$/, "")
      i += 1
    } else if (args[i] === "--profile" && args[i + 1]) {
      profile = args[i + 1]
      i += 1
    }
  }

  return { base, profile }
}

type CoverageSummary = {
  detected: number
  possible: number
  unknown: number
  confirmedAbsent: number
  withDenuvoCheckedAt: number
  withAppDetails: number
  protonWithTier: number
  protonChecked: number
  hltbWithMainStory: number
  hltbConfirmedAbsent: number
  hltbChecked: number
  totalGames: number
}

const isHltbConfirmedAbsent = (matchedName: unknown): boolean =>
  isHltbConfirmedAbsentMatchedName(
    typeof matchedName === "string" ? matchedName : null
  )

const mapDashboardGames = (
  games: Array<Record<string, unknown>>
): DashboardGame[] =>
  games.map((game) => game as unknown as DashboardGame)

const summarizeGames = (games: Array<Record<string, unknown>>): CoverageSummary => {
  const summary: CoverageSummary = {
    detected: 0,
    possible: 0,
    unknown: 0,
    confirmedAbsent: 0,
    withDenuvoCheckedAt: 0,
    withAppDetails: 0,
    protonWithTier: 0,
    protonChecked: 0,
    hltbWithMainStory: 0,
    hltbConfirmedAbsent: 0,
    hltbChecked: 0,
    totalGames: games.length,
  }

  for (const game of games) {
    const antiCheat = game.antiCheat as Record<string, unknown> | undefined
    const display = antiCheat?.denuvoDisplay as { kind?: string } | undefined
    const kind = display?.kind

    if (kind === "detected") summary.detected += 1
    else if (kind === "possible") summary.possible += 1
    else if (kind === "confirmed_absent") summary.confirmedAbsent += 1
    else summary.unknown += 1

    if (antiCheat?.denuvoCheckedAt) summary.withDenuvoCheckedAt += 1
    if (game.steamDetails) summary.withAppDetails += 1

    const proton = game.protondb as Record<string, unknown> | undefined
    if (proton?.lastCheckedAt) summary.protonChecked += 1
    const tier = proton?.tier
    if (tier && tier !== "unknown") summary.protonWithTier += 1

    const hltb = game.hltb as Record<string, unknown> | undefined
    if (hltb?.lastCheckedAt) summary.hltbChecked += 1
    const mainStory = hltb?.mainStoryMinutes
    if (typeof mainStory === "number" && mainStory > 0) {
      summary.hltbWithMainStory += 1
    } else if (isHltbConfirmedAbsent(hltb?.matchedName)) {
      summary.hltbConfirmedAbsent += 1
    }
  }

  return summary
}

const main = async () => {
  const { base, profile } = parseArgs()
  console.log(`\n=== Seed smoke test: ${base} ===`)
  console.log(`Profile: ${profile}`)

  const healthRes = await fetch(`${base}/api/health`)
  const health = (await healthRes.json()) as { ok?: boolean; steamApiKey?: string }
  console.log(`Health: ok=${health.ok} steamApiKey=${health.steamApiKey}`)

  if (!healthRes.ok || health.steamApiKey !== "ok") {
    throw new Error("Server not ready — check STEAM_API_KEY")
  }

  const importStarted = Date.now()
  const importRes = await fetch(`${base}/api/steam/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: profile }),
  })
  const importJson = (await importRes.json()) as {
    error?: string
    steamid?: string
    gameCount?: number
    redirectUrl?: string
  }

  if (!importRes.ok) {
    throw new Error(importJson.error ?? `Import failed (${importRes.status})`)
  }

  const importMs = Date.now() - importStarted
  const steamid = importJson.steamid
  console.log(
    `Import: steamid=${steamid} games=${importJson.gameCount} in ${importMs}ms`
  )

  const dashStarted = Date.now()
  const dashRes = await fetch(`${base}/api/dashboard/${steamid}`)
  const dash = (await dashRes.json()) as {
    games?: Array<Record<string, unknown>>
    profile?: { personaName?: string }
  }
  const dashMs = Date.now() - dashStarted

  if (!dashRes.ok) {
    throw new Error(`Dashboard fetch failed (${dashRes.status})`)
  }

  const games = dash.games ?? []
  const summary = summarizeGames(games)

  console.log(`Dashboard: ${dash.profile?.personaName ?? steamid} (${games.length} games) in ${dashMs}ms`)
  console.log("Denuvo display (immediate, no wait for background scrape):")
  console.log(`  detected: ${summary.detected}`)
  console.log(`  possible: ${summary.possible}`)
  console.log(`  unknown: ${summary.unknown}`)
  console.log(`  confirmed absent: ${summary.confirmedAbsent}`)
  console.log(`  with denuvoCheckedAt: ${summary.withDenuvoCheckedAt}`)
  console.log(`  with steamDetails (seed/lite): ${summary.withAppDetails}`)
  console.log("ProtonDB (immediate):")
  console.log(`  with tier: ${summary.protonWithTier}`)
  console.log(`  with lastCheckedAt: ${summary.protonChecked}`)
  console.log("HowLongToBeat (immediate):")
  console.log(`  with main story minutes: ${summary.hltbWithMainStory}`)
  console.log(`  confirmed absent (negative cache): ${summary.hltbConfirmedAbsent}`)
  console.log(`  with lastCheckedAt: ${summary.hltbChecked}`)

  const dashboardGames = mapDashboardGames(games)
  const hltbResolved = countHltbResolvedGames(dashboardGames)
  const hltbEnriched = countHltbEnrichedGames(dashboardGames)
  const achievementsResolved = countAchievementsResolvedGames(dashboardGames)
  const achievementsEnriched = countAchievementsEnrichedGames(dashboardGames)

  console.log("Lookup resolution (Data Status metrics):")
  console.log(
    `  HLTB resolved: ${hltbResolved}/${games.length} · enriched: ${hltbEnriched} · pending: ${Math.max(0, games.length - hltbResolved)}`
  )
  console.log(
    `  Achievements resolved: ${achievementsResolved}/${games.length} · enriched: ${achievementsEnriched} · pending: ${Math.max(0, games.length - achievementsResolved)}`
  )

  const sample = games
    .filter((g) => {
      const ac = g.antiCheat as Record<string, unknown> | undefined
      return ac?.denuvoDisplay && (ac.denuvoDisplay as { kind?: string }).kind !== "unknown"
    })
    .slice(0, 5)
    .map((g) => {
      const ac = g.antiCheat as Record<string, unknown>
      const display = ac.denuvoDisplay as { kind?: string; label?: string }
      return {
        appid: g.appid,
        name: g.name,
        denuvo: display.label,
        kind: display.kind,
        confidence: ac.denuvoConfidence,
        source: ac.denuvoSource,
      }
    })

  console.log("Sample seeded Denuvo games:")
  for (const row of sample) {
    console.log(`  ${row.appid} ${row.name}: ${row.denuvo} (${row.confidence}/${row.source})`)
  }

  console.log(`Anticheat URL: ${base}/dashboard/${steamid}/anticheat`)
  console.log(`ProtonDB URL: ${base}/dashboard/${steamid}/protondb`)
  console.log(`HLTB URL: ${base}/dashboard/${steamid}/howlongtobeat`)
  console.log(`Total wall time: ${Date.now() - importStarted}ms\n`)

  const hasSeedSignal =
    summary.detected + summary.possible > 0 ||
    summary.withAppDetails > 0 ||
    summary.protonWithTier > 0 ||
    summary.hltbWithMainStory > 0

  if (!hasSeedSignal) {
    console.warn("WARNING: no seeded coverage visible — check seed hydration")
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
