import Link from "next/link"
import { ExternalLink } from "lucide-react"
import {
  resolveSourceIcon,
  SourceIconFromConfig,
} from "@/components/icons/source-icon"
import type { BrandSlug } from "@/components/icons/brand-icon"
import type { SourceSlug } from "@/lib/sources/source-icon-config"

type SourceLinkProps = {
  href?: string
  label?: string
  source?: SourceSlug
  /** @deprecated Prefer `source` */
  brand?: BrandSlug
}

export const SourceLink = ({ href, label, source, brand }: SourceLinkProps) => {
  if (!href) return null

  const icon = resolveSourceIcon(source ?? brand, href)

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex size-3.5 shrink-0 items-center justify-center text-muted-foreground hover:text-primary"
      aria-label={label ?? "Open source"}
      title={label ?? "Open source"}
    >
      {icon ? (
        <SourceIconFromConfig icon={icon} className="size-3.5" />
      ) : (
        <ExternalLink className="size-3.5" aria-hidden />
      )}
    </Link>
  )
}
