"use client"

import Link from "next/link"
import { X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { SteamIcon } from "@/components/icons/steam-icon"
import type { CompareProfileEntry } from "@/hooks/use-compare-profiles"
import type { DashboardProfile } from "@/types/dashboard"

type CompareProfileCardProps = {
  profile: DashboardProfile
  gameCount: number
  isPrimary?: boolean
  entry?: CompareProfileEntry
  onRemove?: () => void
  onRetry?: () => void
}

export const CompareProfileCard = ({
  profile,
  gameCount,
  isPrimary = false,
  entry,
  onRemove,
  onRetry,
}: CompareProfileCardProps) => {
  const isLoading = entry?.status === "loading"
  const isError = entry?.status === "error"
  const displayProfile = entry?.payload?.profile ?? profile
  const displayGameCount = entry?.payload?.games.length ?? gameCount

  return (
    <Card className="min-w-[180px] shrink-0 border-border">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Avatar className="size-10">
            {isLoading ? (
              <Skeleton className="size-full rounded-full" />
            ) : (
              <>
                <AvatarImage
                  src={displayProfile.avatarUrl}
                  alt={displayProfile.personaName}
                />
                <AvatarFallback>
                  {displayProfile.personaName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </>
            )}
          </Avatar>
          {!isPrimary && onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onRemove}
              aria-label={`Remove ${displayProfile.personaName} from comparison`}
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>

        <div className="min-w-0 space-y-1">
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{displayProfile.personaName}</p>
                {isPrimary ? <Badge variant="secondary">You</Badge> : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {displayGameCount} games
              </p>
            </>
          )}
        </div>

        {isError ? (
          <div className="space-y-2">
            <p className="text-xs text-destructive">{entry.error}</p>
            {onRetry ? (
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            ) : null}
          </div>
        ) : null}

        {!isLoading && !isError ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-fit gap-1.5 px-2"
            nativeButton={false}
            render={
              <Link
                href={displayProfile.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${displayProfile.personaName} on Steam`}
              />
            }
          >
            <SteamIcon className="size-3.5" />
            Steam
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

type AddCompareCardProps = {
  onClick: () => void
}

export const AddCompareCard = ({ onClick }: AddCompareCardProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Add profile to compare"
    className="flex min-h-[148px] min-w-[180px] shrink-0 cursor-pointer items-center justify-center rounded-xl border border-dashed border-border bg-transparent transition-colors hover:border-primary hover:bg-muted/30"
  >
    <span className="flex size-10 items-center justify-center rounded-full border border-border text-2xl text-muted-foreground">
      +
    </span>
  </button>
)
