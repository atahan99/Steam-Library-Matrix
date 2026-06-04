"use client"

import { useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, Gamepad2 } from "lucide-react"
import { useDashboard, useGameDetail } from "@/components/dashboard/dashboard-context"
import { computeLibraryAchievementStats } from "@/lib/dashboard/achievement-stats"
import { buildCalculatorUrl } from "@/lib/steamdb/calculator-url"
import {
  formatAccountAgeYears,
  formatCountryDisplay,
  profileCountryToCalculatorCc,
} from "@/lib/steam/profile-display"
import { formatPlaytime, formatPlaytimeHoursOnly } from "@/lib/utils/format-playtime"
import { BrandIcon } from "@/components/icons/brand-icon"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { DashboardGame } from "@/types/dashboard"

const StatTile = ({ label, value }: { label: string; value: string }) => (
  <div className="surface-neon rounded-lg border border-border/60 bg-muted/30 p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
  </div>
)

const SteamDbCalculatorTile = ({
  href,
  className,
}: {
  href: string
  className?: string
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Open SteamDB calculator in a new tab"
    className={cn(
      "surface-neon group flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5 motion-reduce:transition-none",
      className
    )}
  >
    <BrandIcon
      brand="steamdb"
      className="size-8 shrink-0 text-primary transition-transform group-hover:scale-105"
    />
    <div className="min-w-0 flex-1">
      <p className="text-xs text-muted-foreground">Account value &amp; prices</p>
      <p className="mt-1 text-sm font-semibold text-foreground group-hover:text-primary">
        SteamDB Calculator
      </p>
    </div>
    <ArrowUpRight
      className="size-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary group-hover:opacity-100 group-focus-visible:translate-x-0.5 group-focus-visible:-translate-y-0.5 group-focus-visible:text-primary group-focus-visible:opacity-100"
      aria-hidden
    />
  </a>
)

const MostPlayedTile = ({
  game,
  onOpenDetail,
}: {
  game: DashboardGame | null
  onOpenDetail: (appid: number) => void
}) => (
  <div className="surface-neon rounded-lg border border-border/60 bg-muted/30 p-3">
    <p className="text-xs text-muted-foreground">Most played game</p>
    {game ? (
      <div className="mt-2 flex min-w-0 items-start gap-2">
        <button
          type="button"
          className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-background/60 ring-1 ring-border/60 outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onOpenDetail(game.appid)}
          aria-label={`Open details for ${game.name}`}
        >
          {game.iconUrl ? (
            <Image
              src={game.iconUrl}
              alt=""
              width={32}
              height={32}
              className="size-8 object-cover"
              unoptimized
            />
          ) : (
            <Gamepad2 className="size-4 text-muted-foreground" aria-hidden />
          )}
        </button>
        <div className="min-w-0">
          <button
            type="button"
            className="link-game line-clamp-2 text-left text-sm font-semibold leading-snug text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onOpenDetail(game.appid)}
            aria-label={`Open details for ${game.name}`}
          >
            {game.name}
          </button>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">
            {formatPlaytimeHoursOnly(game.playtimeForeverMinutes)}
          </p>
        </div>
      </div>
    ) : (
      <p className="mt-1 text-lg font-semibold text-muted-foreground">—</p>
    )}
  </div>
)

export const ProfileOverviewHero = () => {
  const { profile, games } = useDashboard()
  const { openGameDetail } = useGameDetail()

  const sourceUrl = useMemo(() => {
    const cc = profileCountryToCalculatorCc(profile.countryCode) ?? "us"
    return buildCalculatorUrl(profile.steamid, cc)
  }, [profile.steamid, profile.countryCode])

  const total = games.length
  const played = games.filter((g) => g.playtimeForeverMinutes > 0).length
  const percent = total > 0 ? Math.round((played / total) * 100) : 0
  const totalMinutes = games.reduce((s, g) => s + g.playtimeForeverMinutes, 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const avgMinutes = played > 0 ? Math.round(totalMinutes / played) : 0

  const achievementStats = useMemo(
    () => computeLibraryAchievementStats(games),
    [games]
  )

  const mostPlayed = useMemo(() => {
    const withPlaytime = games.filter((g) => g.playtimeForeverMinutes > 0)
    if (withPlaytime.length === 0) return null
    return withPlaytime.reduce((top, game) =>
      game.playtimeForeverMinutes > top.playtimeForeverMinutes ? game : top
    )
  }, [games])

  const dataStatusHref = `/dashboard/${profile.steamid}/data-status`

  const accountAgeLabel = formatAccountAgeYears(profile.accountCreatedAt)
  const countryLabel = formatCountryDisplay(profile.countryCode)
  const levelLabel =
    profile.steamLevel !== undefined ? `Level ${profile.steamLevel}` : undefined

  return (
    <Card
      data-highlight
      className="overflow-hidden border-primary/30 bg-linear-to-br from-card via-card to-primary/10"
    >
      <CardContent className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BrandIcon brand="steamdb" className="size-5 text-primary" />
            Profile overview
          </span>
          <SteamDbCalculatorTile
            href={sourceUrl}
            className="w-full sm:max-w-[280px] sm:shrink-0"
          />
        </div>

        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <a
                href={profile.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${profile.personaName} on Steam`}
                className="shrink-0 rounded-lg outline-none ring-offset-2 ring-offset-background transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {profile.avatarUrl ? (
                  <Image
                    src={profile.avatarUrl}
                    alt={profile.personaName}
                    width={72}
                    height={72}
                    className="size-[72px] rounded-lg border border-primary/30 object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="size-[72px] rounded-lg bg-muted" />
                )}
              </a>
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-semibold">
                  {profile.personaName}
                </h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {levelLabel ? (
                    <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs text-primary">
                      {levelLabel}
                    </span>
                  ) : (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Level —
                    </span>
                  )}
                  {accountAgeLabel ? (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {accountAgeLabel}
                    </span>
                  ) : (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Account age —
                    </span>
                  )}
                  {countryLabel ? (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {countryLabel}
                    </span>
                  ) : (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Country —
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-sm text-muted-foreground">
                  <span>
                    {played} out of {total} games played
                  </span>
                  <span>{percent}%</span>
                </div>
                <Progress value={percent} className="h-2" />
              </div>

              {achievementStats.hasData ? (
                <div>
                  <div className="mb-1 flex justify-between gap-2 text-sm text-muted-foreground">
                    <span>
                      {achievementStats.completedCount} of{" "}
                      {achievementStats.trackableCount} games completed
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {achievementStats.averageCompletionPercent}% avg
                    </span>
                  </div>
                  <Progress
                    value={achievementStats.averageCompletionPercent}
                    className="h-2"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Steam achievement completion · {achievementStats.trackableCount}{" "}
                    games with achievements · avg uses{" "}
                    {achievementStats.withProgressCount} with progress
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Steam achievement completion not synced yet.{" "}
                  <Link
                    href={dataStatusHref}
                    className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Sync on Data Status
                  </Link>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile
                label="Hours on record"
                value={`${totalHours.toLocaleString()}h`}
              />
              <StatTile
                label="Average playtime"
                value={played > 0 ? formatPlaytime(avgMinutes) : "—"}
              />
              <MostPlayedTile game={mostPlayed} onOpenDetail={openGameDetail} />
            </div>
        </div>
      </CardContent>
    </Card>
  )
}
