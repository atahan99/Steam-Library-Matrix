import { AppLogo } from "@/components/icons/app-logo"
import { SourceIconFromConfig } from "@/components/icons/source-icon"
import type { LibraryOrbitIconConfig } from "@/content/library-orbit"
import { cn } from "@/lib/utils"

type LibraryOrbitIconProps = {
  icon: LibraryOrbitIconConfig
  className?: string
}

export const LibraryOrbitIcon = ({ icon, className }: LibraryOrbitIconProps) => {
  if (icon.type === "app") {
    return <AppLogo className={className} />
  }

  return (
    <SourceIconFromConfig
      icon={icon}
      className={cn("text-primary", className)}
    />
  )
}
