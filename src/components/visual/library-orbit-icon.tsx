import { Gamepad2 } from "lucide-react"
import { BrandIcon } from "@/components/icons/brand-icon"
import { SteamIcon } from "@/components/icons/steam-icon"
import type { LibraryOrbitIconConfig } from "@/content/library-orbit"
import { cn } from "@/lib/utils"

type LibraryOrbitIconProps = {
  icon: LibraryOrbitIconConfig
  className?: string
}

export const LibraryOrbitIcon = ({ icon, className }: LibraryOrbitIconProps) => {
  if (icon.type === "app") {
    return <Gamepad2 className={cn("text-primary", className)} aria-hidden />
  }

  if (icon.type === "steam") {
    return <SteamIcon className={cn("text-primary", className)} />
  }

  if (icon.type === "brand") {
    return <BrandIcon brand={icon.brand} className={cn("text-primary", className)} />
  }

  if (icon.type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external source icon; avoids next.config remotePatterns
      <img
        src={icon.src}
        alt=""
        aria-hidden
        className={cn("size-full object-contain", className)}
        loading="lazy"
        decoding="async"
      />
    )
  }

  return null
}
