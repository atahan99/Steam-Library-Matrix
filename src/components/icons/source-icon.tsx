import { BrandIcon } from "@/components/icons/brand-icon"
import { SteamIcon } from "@/components/icons/steam-icon"
import {
  faviconUrlFromHref,
  SOURCE_ICON,
  type SourceIconConfig,
  type SourceSlug,
} from "@/lib/sources/source-icon-config"
import { cn } from "@/lib/utils"

const SOURCE_ICON_BOX_CLASS = "inline-flex size-3.5 shrink-0 items-center justify-center"

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
  if (icon.type === "steam") {
    return (
      <span className={cn(SOURCE_ICON_BOX_CLASS, className)}>
        <SteamIcon className="size-3.5" />
      </span>
    )
  }

  if (icon.type === "brand") {
    return (
      <span className={cn(SOURCE_ICON_BOX_CLASS, className)}>
        <BrandIcon brand={icon.brand} className="size-3.5" />
      </span>
    )
  }

  return (
    <span
      className={cn(
        SOURCE_ICON_BOX_CLASS,
        "overflow-hidden rounded-[3px]",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- external source favicon; avoids next.config remotePatterns */}
      <img
        src={icon.src}
        alt=""
        aria-hidden
        className="size-full object-cover"
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
