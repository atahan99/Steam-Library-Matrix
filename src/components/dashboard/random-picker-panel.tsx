"use client"

import { useCallback, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Dices, ExternalLink, Gamepad2, Library } from "lucide-react"
import {
  useDashboard,
  useGameDetail,
} from "@/components/dashboard/dashboard-context"
import { AntiCheatStatusBadge } from "@/components/badges/anticheat-status-badge"
import { PlaytimeBadge } from "@/components/badges/playtime-badge"
import { ProtonDbBadge } from "@/components/badges/protondb-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { pickRandomGames } from "@/lib/dashboard/random-game-picker"
import { resolveGameHeroImageUrl } from "@/lib/utils/steam-image-url"
import { getSteamStoreUrl } from "@/lib/utils/steam-url"
import type { DashboardGame } from "@/types/dashboard"

const formatReleaseYear = (game: DashboardGame): string => {
  const raw = game.steamDetails?.releaseDate?.date
  if (!raw) return "Release date unknown"
  const year = new Date(raw).getFullYear()
  return Number.isNaN(year) ? "Release date unknown" : `Released ${year}`
}

const getHeroImageUrl = (game: DashboardGame): string =>
  resolveGameHeroImageUrl(game.appid, { logoUrl: game.logoUrl })

type PickerCardProps = {
  label: string
  description: string
  game: DashboardGame
  steamid: string
}

const PickerCard = ({ label, description, game, steamid }: PickerCardProps) => {
  const { openGameDetail } = useGameDetail()
  const heroSrc = getHeroImageUrl(game)
  const storeHref = game.storeUrl ?? getSteamStoreUrl(game.appid)
  const libraryParams = new URLSearchParams({
    q: game.name,
    game: String(game.appid),
  })
  const libraryHref = `/dashboard/${steamid}/library?${libraryParams.toString()}`
  const achievementLabel =
    game.achievements?.hasAchievements && game.achievements.totalCount > 0
      ? `${game.achievements.completionPercent}% achievements`
      : null

  return (
    <Card
      data-highlight
      className="flex flex-1 flex-col overflow-hidden border-primary/30 bg-linear-to-br from-card via-card to-primary/10"
    >
      <div className="relative aspect-[460/215] w-full overflow-hidden border-b border-primary/20 bg-muted">
        {heroSrc ? (
          <Image
            src={heroSrc}
            alt=""
            fill
            className="object-cover"
            unoptimized
            priority
            sizes="(max-width: 1024px) 100vw, min(560px, 50vw)"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Gamepad2 className="size-12 text-muted-foreground" aria-hidden />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-md bg-background/90 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/30 backdrop-blur-sm">
          {label}
        </span>
      </div>
      <CardHeader className="pb-2">
        <CardDescription>{description}</CardDescription>
        <CardTitle className="text-xl font-semibold leading-snug">
          <Link
            href={storeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="link-game text-primary hover:underline"
          >
            {game.name}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 pt-0">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <PlaytimeBadge minutes={game.playtimeForeverMinutes} />
          {game.protondb?.tier ? (
            <ProtonDbBadge tier={game.protondb.tier} />
          ) : null}
          {game.antiCheat?.status ? (
            <AntiCheatStatusBadge status={game.antiCheat.status} />
          ) : null}
          <span className="text-muted-foreground">{formatReleaseYear(game)}</span>
          {achievementLabel ? (
            <span className="text-muted-foreground">{achievementLabel}</span>
          ) : null}
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openGameDetail(game.appid)}
          >
            View details
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={libraryHref} />}
          >
            <Library className="size-3.5" aria-hidden />
            Search in Library
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link href={storeHref} target="_blank" rel="noopener noreferrer" />
            }
          >
            <ExternalLink className="size-3.5" aria-hidden />
            Steam
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export const RandomPickerPanel = () => {
  const { games, profile } = useDashboard()
  const [picks, setPicks] = useState(() => pickRandomGames(games))

  const handleRollAgain = useCallback(() => {
    setPicks(pickRandomGames(games))
  }, [games])

  if (!picks) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 py-8 text-center text-sm text-muted-foreground">
          <p>
            Not enough games outside your top 30 most played, recent two-week
            activity, and completed titles (100% achievements or HLTB playtime
            met) to suggest two picks.
          </p>
          <Button
            variant="link"
            nativeButton={false}
            render={<Link href={`/dashboard/${profile.steamid}/library`} />}
          >
            Browse your library
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleRollAgain}>
          <Dices className="size-4" />
          Roll again
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <PickerCard
          label="Backlog filler"
          description="Buried in your library"
          game={picks.backlog}
          steamid={profile.steamid}
        />
        <PickerCard
          label="Random pick"
          description="Something different"
          game={picks.surprise}
          steamid={profile.steamid}
        />
      </div>
      <details className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">
          What gets excluded from picks?
        </summary>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Your top 30 games by total playtime</li>
          <li>Games with playtime in the last two weeks</li>
          <li>
            Completed titles: 100% Steam achievements or playtime at/above HLTB
            main-story, main+extra, or completionist estimates
          </li>
        </ul>
      </details>
    </div>
  )
}
