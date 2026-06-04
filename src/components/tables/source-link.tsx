import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { BrandIcon, type BrandSlug } from "@/components/icons/brand-icon"

type SourceLinkProps = {
  href?: string
  label?: string
  brand?: BrandSlug
}

export const SourceLink = ({ href, label, brand }: SourceLinkProps) => {
  if (!href) return null

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 items-center text-muted-foreground hover:text-primary"
      aria-label={label ?? "Open source"}
      title={label ?? "Open source"}
    >
      {brand ? (
        <BrandIcon brand={brand} className="size-3.5" />
      ) : (
        <ExternalLink className="size-3.5" aria-hidden />
      )}
    </Link>
  )
}
