import Image from "next/image"
import { BrandIcon } from "@/components/icons/brand-icon"
import { cn } from "@/lib/utils"

export type Platform = "windows" | "mac" | "linux"

const ICON_SRC: Record<Exclude<Platform, "mac">, string> = {
  windows: "/icons/platforms/windows.svg",
  linux: "/icons/platforms/linux.svg",
}

const ICON_ALT: Record<Platform, string> = {
  windows: "Windows",
  mac: "macOS",
  linux: "Linux",
}

export const PlatformIcon = ({
  platform,
  className,
}: {
  platform: Platform
  className?: string
}) => {
  const sizeClass = className ?? "size-4 shrink-0"

  if (platform === "mac") {
    return <BrandIcon brand="apple" className={sizeClass} />
  }

  return (
    <Image
      src={ICON_SRC[platform]}
      alt=""
      width={16}
      height={16}
      className={cn(sizeClass)}
      aria-hidden
    />
  )
}

export const platformAriaLabel = (
  platform: Platform,
  supported?: boolean
): string => {
  const name = ICON_ALT[platform]
  if (supported === undefined) return name
  return supported ? `${name} supported` : `${name} not supported`
}
