import Link from "next/link"
import { ExternalLink } from "lucide-react"
import {
  resolveSourceIcon,
  SourceIconFromConfig,
} from "@/components/icons/source-icon"
import type { BrandSlug } from "@/components/icons/brand-icon"
import type { SourceSlug } from "@/lib/sources/source-icon-config"
import { cn } from "@/lib/utils"

type SourceLinkProps = {
  href?: string
  label?: string
  source?: SourceSlug
  /** @deprecated Prefer `source` */
  brand?: BrandSlug
  /** Icon size. Defaults to "sm" (3.5); "md" (4) reads better in a horizontal row. */
  size?: "sm" | "md"
}

const SOURCE_LINK_SIZE_CLASS: Record<NonNullable<SourceLinkProps["size"]>, string> = {
  sm: "size-3.5",
  md: "size-4",
}

export const SourceLink = ({
  href,
  label,
  source,
  brand,
  size = "sm",
}: SourceLinkProps) => {
  if (!href) return null

  const icon = resolveSourceIcon(source ?? brand, href)
  const sizeClass = SOURCE_LINK_SIZE_CLASS[size]

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex shrink-0 items-center justify-center text-muted-foreground hover:text-primary",
        sizeClass
      )}
      aria-label={label ?? "Open source"}
      title={label ?? "Open source"}
    >
      {icon ? (
        <SourceIconFromConfig icon={icon} className={sizeClass} />
      ) : (
        <ExternalLink className={sizeClass} aria-hidden />
      )}
    </Link>
  )
}
