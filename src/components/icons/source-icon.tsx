import { BrandIcon } from "@/components/icons/brand-icon"
import {
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
      {/* eslint-disable-next-line @next/next/no-img-element -- bundled source favicon; avoids next.config remotePatterns */}
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

// Unknown sources get no icon: a third-party favicon service would leak every link domain.
export const resolveSourceIcon = (source?: SourceSlug): SourceIconConfig | null =>
  (source && SOURCE_ICON[source]) || null
