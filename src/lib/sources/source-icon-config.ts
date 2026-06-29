import type { BrandSlug } from "@/components/icons/brand-icon"

export type SourceIconConfig =
  | { type: "steam" }
  | { type: "brand"; brand: BrandSlug }
  | { type: "site"; site: "awacy" | "levvvel" | "hltb" }
  | { type: "favicon"; src: string; imgClassName?: string }

export type SourceSlug =
  | BrandSlug
  | "steam"
  | "awacy"
  | "levvvel"
  | "hltb"

export const SOURCE_ICON: Record<SourceSlug, SourceIconConfig> = {
  steam: { type: "steam" },
  protondb: { type: "brand", brand: "protondb" },
  steamdb: { type: "brand", brand: "steamdb" },
  apple: { type: "brand", brand: "apple" },
  "steam-deck": { type: "brand", brand: "steam-deck" },
  // Bundled SVG marks — external favicon URLs for these sites break or block hotlinking.
  awacy: { type: "site", site: "awacy" },
  levvvel: { type: "site", site: "levvvel" },
  hltb: { type: "site", site: "hltb" },
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
