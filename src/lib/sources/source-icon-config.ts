import type { BrandSlug } from "@/components/icons/brand-icon"

export type SourceIconConfig =
  | { type: "steam" }
  | { type: "brand"; brand: BrandSlug }
  | { type: "favicon"; src: string; imgClassName?: string }

export type SourceSlug =
  | BrandSlug
  | "steam"
  | "awacy"
  | "levvvel"
  | "hltb"

export const SOURCE_ICON: Record<SourceSlug, SourceIconConfig> = {
  steam: { type: "steam" },
  steamdb: { type: "brand", brand: "steamdb" },
  apple: { type: "brand", brand: "apple" },
  "steam-deck": { type: "brand", brand: "steam-deck" },
  // Real site logos bundled in public/icons/sites — hotlinking their favicons breaks or is blocked.
  protondb: { type: "favicon", src: "/icons/sites/protondb.svg" },
  awacy: { type: "favicon", src: "/icons/sites/awacy.webp" },
  levvvel: { type: "favicon", src: "/icons/sites/levvvel.svg" },
  hltb: { type: "favicon", src: "/icons/sites/hltb.png" },
}

export const faviconUrlFromHref = (href: string): string | null => {
  try {
    const { hostname } = new URL(href)
    if (!hostname) return null
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=32`
  } catch {
    return null
  }
}
