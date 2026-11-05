import { BrandIcon } from "@/components/icons/brand-icon"
import { SteamIcon } from "@/components/icons/steam-icon"
import {
  faviconUrlFromHref,
  SOURCE_ICON,
  type SourceIconConfig,
  type SourceSlug,
} from "@/lib/sources/source-icon-config"
import { cn } from "@/lib/utils"

const DEFAULT_ICON_CLASS = "size-3.5 shrink-0"

type SourceIconProps = {
  source: SourceSlug
  className?: string
}

export const SourceIconFromConfig = ({
  icon,
  className,
}: {
  icon: SourceIconConfig
  className?: string
}) => {
  const iconClass = cn(DEFAULT_ICON_CLASS, className)

  if (icon.type === "steam") {
    return <SteamIcon className={iconClass} />
  }

  if (icon.type === "brand") {
    return <BrandIcon brand={icon.brand} className={iconClass} />
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md",
        iconClass
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- external source favicon; avoids next.config remotePatterns */}
      <img
        src={icon.src}
        alt=""
        aria-hidden
        className={cn("size-full object-cover", icon.imgClassName)}
        loading="lazy"
        decoding="async"
      />
    </span>
  )
}

export const SourceIcon = ({ source, className }: SourceIconProps) => (
  <SourceIconFromConfig icon={SOURCE_ICON[source]} className={className} />
)

export const resolveSourceIcon = (
  source?: SourceSlug,
  href?: string
): SourceIconConfig | null => {
  if (source && SOURCE_ICON[source]) {
    return SOURCE_ICON[source]
  }
  if (!href) return null
  const favicon = faviconUrlFromHref(href)
  return favicon ? { type: "favicon", src: favicon } : null
}
