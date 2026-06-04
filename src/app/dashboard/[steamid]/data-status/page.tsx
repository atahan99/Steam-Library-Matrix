"use client"

import { PageIntro } from "@/components/dashboard/page-intro"
import { SourceStatusCard } from "@/components/dashboard/source-status-card"
import { dashboardPageIntros } from "@/content/dashboard-pages"
import { AnticheatCatalogBrowseCard } from "@/components/dashboard/anticheat-catalog-browse-card"
import { AnticheatCatalogStatusCard } from "@/components/dashboard/anticheat-catalog-status-card"
import { DataStatusSection } from "@/components/dashboard/data-status/data-status-section"
import { DataStatusSummary } from "@/components/dashboard/data-status/data-status-summary"
import { useDashboard } from "@/components/dashboard/dashboard-context"
import { hasMeaningfulAntiCheatData } from "@/lib/anticheat/stats"
import {
  countSteamDeckCoverage,
  hasAuthoritativeSteamDeckStatus,
} from "@/lib/dashboard/steam-deck-coverage"
import {
  countAchievementsEnrichedGames,
  countAchievementsResolvedGames,
} from "@/lib/enrichment/achievements-lookup-outcome"
import {
  countHltbEnrichedGames,
  countHltbResolvedGames,
} from "@/lib/enrichment/hltb-lookup-outcome"
import { isUnreleasedGame } from "@/lib/utils/parse-release-date"
import { hasPlatformData } from "@/lib/utils/platform-support"
import type { DashboardGame } from "@/types/dashboard"

const hasProtonCoverage = (g: DashboardGame) => {
  if (isUnreleasedGame(g.steamDetails?.releaseDate)) return true
  return Boolean(g.protondb?.tier && g.protondb.tier !== "unknown")
}

const uniqueEnrichGames = (games: DashboardGame[], wishlistGames: DashboardGame[]) => {
  const byAppid = new Map<number, DashboardGame>()
  for (const game of [...games, ...wishlistGames]) {
    byAppid.set(game.appid, game)
  }
  return [...byAppid.values()]
}

export default function DataStatusPage() {
  const { profile, games, wishlistGames } = useDashboard()
  const libraryTotal = games.length
  const wishlistTotal = wishlistGames.length
  const enrichGames = uniqueEnrichGames(games, wishlistGames)
  const enrichTotal = enrichGames.length
  const unreleasedCount = enrichGames.filter((g) =>
    isUnreleasedGame(g.steamDetails?.releaseDate)
  ).length
  const hltbEnriched = countHltbEnrichedGames(enrichGames)
  const hltbResolved = countHltbResolvedGames(enrichGames)
  const achievementsEnriched = countAchievementsEnrichedGames(games)
  const achievementsResolved = countAchievementsResolvedGames(games)
  const protonWithData = enrichGames.filter(hasProtonCoverage).length
  const anticheatWithData = enrichGames.filter(hasMeaningfulAntiCheatData).length
  const deckCoverage = countSteamDeckCoverage(enrichGames)
  const appDetailsWithData = enrichGames.filter(hasPlatformData).length
  const enrichmentPercent =
    enrichTotal > 0 ? Math.round((appDetailsWithData / enrichTotal) * 100) : 0

  const maxChecked = (getter: (g: DashboardGame) => string | undefined) => {
    const dates = enrichGames
      .map(getter)
      .filter(Boolean)
      .map((d) => new Date(d!).getTime())
    return dates.length ? new Date(Math.max(...dates)).toISOString() : profile.lastSyncedAt
  }

  return (
    <div className="flex flex-col gap-8">
      <PageIntro
        title="Data Status"
        description={dashboardPageIntros["data-status"]}
      />

      <DataStatusSummary
        libraryTotal={libraryTotal}
        wishlistTotal={wishlistTotal}
        enrichTotal={enrichTotal}
        enrichmentPercent={enrichmentPercent}
        lastProfileSync={profile.lastSyncedAt}
      />

      <DataStatusSection
        title="Steam core"
        description="Library, wishlist, and Steam Web API metadata."
      >
        <SourceStatusCard
          title="Steam library"
          source="steam"
          endpoint="/api/steam/refresh?force=true"
          lastChecked={profile.lastSyncedAt}
          totalGames={libraryTotal}
          withData={libraryTotal}
          ttlHours={12}
        />
        <SourceStatusCard
          title="Steam wishlist"
          source="steam_wishlist"
          endpoint="/api/steam/wishlist-sync"
          lastChecked={profile.wishlistLastSyncedAt}
          totalGames={wishlistTotal}
          withData={wishlistTotal}
          errorMessage={profile.wishlistSyncError}
        />
        <SourceStatusCard
          title="Steam app details"
          source="steam_app_details"
          endpoint="/api/enrich/app-details"
          lastChecked={maxChecked((g) => g.steamDetails?.lastCheckedAt)}
          totalGames={enrichTotal}
          withData={appDetailsWithData}
          ttlHours={168}
        />
        <SourceStatusCard
          title="Steam achievements"
          source="steam_achievements"
          endpoint="/api/enrich/achievements"
          lastChecked={maxChecked((g) => g.achievements?.lastCheckedAt)}
          totalGames={libraryTotal}
          withData={achievementsEnriched}
          resolvedCount={achievementsResolved}
          coverageNote={
            achievementsResolved >= libraryTotal &&
            achievementsEnriched < libraryTotal
              ? `${libraryTotal - achievementsEnriched} titles have no Steam achievements — lookup complete`
              : "Full library · requires public game details · re-sync after logic updates"
          }
        />
      </DataStatusSection>

      <DataStatusSection
        title="Compatibility"
        description="Deck status and ProtonDB from Steam app details."
      >
        <SourceStatusCard
          title="Steam Deck compatibility"
          source="steam_deck_compatibility"
          endpoint="/api/enrich/app-details"
          lastChecked={maxChecked((g) => g.steamDetails?.lastCheckedAt)}
          totalGames={enrichTotal}
          withData={enrichGames.filter(hasAuthoritativeSteamDeckStatus).length}
          coverageNote={`Verified / Playable / Unsupported: ${deckCoverage.authoritative} · Unknown: ${deckCoverage.unknown}. Library re-sync and Steam app details both refresh Deck status.`}
        />
        <SourceStatusCard
          title="ProtonDB"
          source="protondb"
          endpoint="/api/enrich/protondb"
          lastChecked={maxChecked((g) => g.protondb?.lastCheckedAt)}
          totalGames={enrichTotal}
          withData={protonWithData}
          ttlHours={168}
          coverageNote={
            unreleasedCount > 0
              ? `Not yet released (skipped): ${unreleasedCount}`
              : undefined
          }
        />
      </DataStatusSection>

      <DataStatusSection
        title="Anti-cheat"
        description="Global catalogs, profile linking, and browse tools."
      >
        <AnticheatCatalogStatusCard />
        <SourceStatusCard
          title="Anti-cheat (profile link)"
          source="anticheat"
          endpoint="/api/enrich/anticheat"
          lastChecked={maxChecked((g) => g.antiCheat?.lastCheckedAt)}
          totalGames={enrichTotal}
          withData={anticheatWithData}
          errorMessage={profile.anticheatLinkError}
          coverageNote="Links your library against the global AWACY + Levvvel catalogs"
          ttlHours={168}
        />
      </DataStatusSection>

      <DataStatusSection
        title="Browse catalogs"
        description="Search AWACY, Levvvel, and Denuvo Anti-Tamper tables stored in the database."
        fullWidth
      >
        <AnticheatCatalogBrowseCard />
      </DataStatusSection>

      <DataStatusSection title="Other" description="Completion time estimates from HowLongToBeat.">
        <SourceStatusCard
          title="HowLongToBeat"
          source="howlongtobeat"
          endpoint="/api/enrich/howlongtobeat"
          lastChecked={maxChecked((g) => g.hltb?.lastCheckedAt)}
          totalGames={enrichTotal}
          withData={hltbEnriched}
          resolvedCount={hltbResolved}
          ttlHours={720}
          showMissingOnlyAction
          coverageNote={
            hltbResolved >= enrichTotal && hltbEnriched < enrichTotal
              ? `${enrichTotal - hltbEnriched} titles have no HowLongToBeat listing — lookup complete`
              : undefined
          }
        />
      </DataStatusSection>
    </div>
  )
}
