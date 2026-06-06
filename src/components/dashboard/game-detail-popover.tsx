"use client"

import Image from "next/image"
import Link from "next/link"
import { Gamepad2, XIcon } from "lucide-react"
import { AntiCheatStatusBadge } from "@/components/badges/anticheat-status-badge"
import { PlaytimeBadge } from "@/components/badges/playtime-badge"
import { ProtonDbBadge } from "@/components/badges/protondb-badge"
import { SteamDeckBadge } from "@/components/badges/steam-deck-badge"
import { AddToBacklogButton } from "@/components/dashboard/add-to-backlog-button"
import { DashboardNavIcon } from "@/components/dashboard/dashboard-nav-icon"
import { useDashboard, useGameDetail } from "@/components/dashboard/dashboard-context"
import { SteamIcon } from "@/components/icons/steam-icon"
import { OsSupportIcons } from "@/components/tables/os-support-icons"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  buildDashboardNavHref,
  dashboardTableNavItems,
} from "@/lib/dashboard/dashboard-nav"
import {
  DETAIL_NA,
  formatHltbMinutes,
  getGenreLabelsForDetail,
  getVrDetailDisplay,
} from "@/lib/dashboard/game-detail-display"
import { filterTableNavItemsForGame } from "@/lib/dashboard/game-table-membership"
import { formatPlaytime } from "@/lib/utils/format-playtime"
import { getSteamStoreUrl } from "@/lib/utils/steam-url"
import type { DashboardGame } from "@/types/dashboard"

const DetailRow = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
    <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:w-32">
      {label}
    </dt>
    <dd className="text-sm">{children}</dd>
  </div>
)

const GameDetailBody = ({ game, steamid }: { game: DashboardGame; steamid: string }) => {
  const storeHref = game.storeUrl ?? getSteamStoreUrl(game.appid)
  const { closeGameDetail } = useGameDetail()
  const { games, wishlistGames } = useDashboard()
  const tableNavItems = filterTableNavItemsForGame(
    dashboardTableNavItems,
    game,
    { games, wishlistGames }
  )
  const vrDisplay = getVrDetailDisplay(game.steamDetails)
  const genreLabels = getGenreLabelsForDetail(game.steamDetails?.genres)
  const release = game.steamDetails?.releaseDate?.date
    ? new Date(game.steamDetails.releaseDate.date).toLocaleDateString()
    : "—"

  return (
    <>
      <header className="flex items-start gap-3 border-b border-border pb-4">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {game.iconUrl ? (
            <Image
              src={game.iconUrl}
              alt=""
              width={56}
              height={56}
              className="size-14 object-cover"
              unoptimized
            />
          ) : (
            <Gamepad2 className="size-7 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-left text-lg leading-snug font-semibold">{game.name}</h2>
          <p className="text-left text-sm text-muted-foreground">AppID {game.appid}</p>
        </div>
      </header>

      <dl className="flex flex-col gap-4 py-4">
        <DetailRow label="Playtime">
          <div className="flex flex-wrap items-center gap-2">
            <PlaytimeBadge minutes={game.playtimeForeverMinutes} />
            {game.playtime2WeeksMinutes > 0 ? (
              <span className="text-muted-foreground">
                {formatPlaytime(game.playtime2WeeksMinutes)} last 2 weeks
              </span>
            ) : null}
          </div>
        </DetailRow>
        <DetailRow label="ProtonDB">
          {game.protondb?.tier ? (
            <ProtonDbBadge tier={game.protondb.tier} />
          ) : (
            "—"
          )}
        </DetailRow>
        <DetailRow label="Steam Deck">
          {game.steamDetails ? (
            <SteamDeckBadge
              compatibility={game.steamDetails.steamDeckCompatibility}
            />
          ) : (
            "—"
          )}
        </DetailRow>
        <DetailRow label="OS">
          <OsSupportIcons game={game} />
        </DetailRow>
        <DetailRow label="HLTB">
          <ul className="flex flex-col gap-1">
            <li className="flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground">Main</span>
              <span className="tabular-nums">
                {formatHltbMinutes(game.hltb?.mainStoryMinutes)}
              </span>
            </li>
            <li className="flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground">Extra</span>
              <span className="tabular-nums">
                {formatHltbMinutes(game.hltb?.mainExtraMinutes)}
              </span>
            </li>
            <li className="flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground">100%</span>
              <span className="tabular-nums">
                {formatHltbMinutes(game.hltb?.completionistMinutes)}
              </span>
            </li>
          </ul>
        </DetailRow>
        <DetailRow label="Anti-cheat">
          {game.antiCheat?.status ? (
            <AntiCheatStatusBadge status={game.antiCheat.status} />
          ) : (
            "—"
          )}
          {game.antiCheat?.anticheatNames?.length ? (
            <p className="mt-1 text-muted-foreground">
              {game.antiCheat.anticheatNames.join(", ")}
            </p>
          ) : null}
        </DetailRow>
        <DetailRow label="Genre">
          {genreLabels.length ? (
            <ul className="flex list-none flex-col gap-0.5">
              {genreLabels.map((label) => (
                <li key={label} className="text-sm leading-snug">
                  {label}
                </li>
              ))}
            </ul>
          ) : (
            DETAIL_NA
          )}
        </DetailRow>
        <DetailRow label="VR">
          {vrDisplay === "vr-only" ? (
            "VR only"
          ) : vrDisplay === "vr-supported" ? (
            "VR supported"
          ) : (
            <span role="img" aria-label="No VR">
              ❌
            </span>
          )}
        </DetailRow>
        <DetailRow label="Release">{release}</DetailRow>
      </dl>

      <footer className="flex flex-col gap-3 border-t border-border pt-4">
        <Button
          variant="default"
          className="w-full"
          nativeButton={false}
          render={
            <Link href={storeHref} target="_blank" rel="noopener noreferrer" />
          }
        >
          <SteamIcon className="size-3.5" />
          Open on Steam Store
        </Button>

        <AddToBacklogButton steamid={steamid} appid={game.appid} />

        {tableNavItems.length > 0 ? (
          <div
            className="flex flex-wrap justify-center gap-1.5"
            role="group"
            aria-label="Open dashboard tables that list this game"
          >
            {tableNavItems.map((item) => {
            const href = buildDashboardNavHref(steamid, item, {
              name: game.name,
              appid: game.appid,
            })
            const key = item.segment || "overview"

            return (
              <Tooltip key={key}>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon-sm"
                      nativeButton={false}
                      aria-label={item.title}
                      render={<Link href={href} onClick={closeGameDetail} />}
                    >
                      <DashboardNavIcon item={item} />
                    </Button>
                  }
                />
                <TooltipContent
                  side="top"
                  className="border border-border bg-popover text-popover-foreground [&>:last-child]:bg-popover [&>:last-child]:fill-popover"
                >
                  {item.title}
                </TooltipContent>
              </Tooltip>
            )
            })}
          </div>
        ) : null}
      </footer>
    </>
  )
}

export const GameDetailPopover = () => {
  const { profile } = useDashboard()
  const { selectedGame, open, closeGameDetail } = useGameDetail()

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) closeGameDetail()
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal>
      <PopoverTrigger
        nativeButton={false}
        render={
          <span
            className="pointer-events-none fixed left-1/2 top-[20%] size-0 -translate-x-1/2"
            aria-hidden
          />
        }
      />
      <PopoverContent
        side="bottom"
        align="center"
        showBackdrop
        className="glass-panel-opaque max-h-none w-[min(24rem,calc(100vw-2rem))] max-w-[min(24rem,calc(100vw-2rem))] overflow-visible border-border/80 bg-transparent p-4 text-foreground shadow-xl ring-1 ring-border/80"
      >
        {selectedGame ? (
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-0 right-0"
              onClick={closeGameDetail}
              aria-label="Close game details"
            >
              <XIcon className="size-4" aria-hidden />
            </Button>
            <GameDetailBody game={selectedGame} steamid={profile.steamid} />
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
