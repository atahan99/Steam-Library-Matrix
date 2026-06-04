"use client"

import { PlatformIcon, platformAriaLabel } from "@/components/icons/platform-icon"
import { cn } from "@/lib/utils"
import {
  hasPlatformData,
  isLinuxSupported,
  isMacSupported,
  isWindowsSupported,
} from "@/lib/utils/platform-support"
import type { DashboardGame } from "@/types/dashboard"

const OsIconCell = ({
  platform,
  supported,
  unknown,
}: {
  platform: "windows" | "linux" | "mac"
  supported: boolean
  unknown: boolean
}) => {
  const muted = unknown || !supported

  return (
    <span
      className={cn(
        "inline-flex shrink-0",
        muted && "opacity-35 grayscale"
      )}
      title={
        unknown
          ? "Run Steam app details refresh"
          : platformAriaLabel(platform, supported)
      }
      aria-label={
        unknown
          ? `${platformAriaLabel(platform)} — unknown`
          : platformAriaLabel(platform, supported)
      }
    >
      <PlatformIcon platform={platform} className="size-4" />
    </span>
  )
}

export const OsSupportIcons = ({ game }: { game: DashboardGame }) => {
  const unknown = !hasPlatformData(game)

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Operating system support">
      <OsIconCell
        platform="windows"
        supported={isWindowsSupported(game)}
        unknown={unknown}
      />
      <OsIconCell
        platform="linux"
        supported={isLinuxSupported(game)}
        unknown={unknown}
      />
      <OsIconCell
        platform="mac"
        supported={isMacSupported(game)}
        unknown={unknown}
      />
    </div>
  )
}
