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
  protondb: { type: "brand", brand: "protondb" },
  steamdb: { type: "brand", brand: "steamdb" },
  apple: { type: "brand", brand: "apple" },
  "steam-deck": { type: "brand", brand: "steam-deck" },
  // The AWACY icon has ~25% transparent padding baked in, so it reads small next
  // to edge-to-edge favicons. Scale it up to match the others' visual weight.
  awacy: {
    type: "favicon",
    src: "https://areweanticheatyet.com/icon.webp",
    imgClassName: "scale-125",
  },
  levvvel: {
    type: "favicon",
    src: "https://levvvel.com/wp-content/uploads/vvv-favicon-square-1-100x100.png",
  },
  hltb: {
    type: "favicon",
    src: "https://howlongtobeat.com/img/icons/favicon-32x32.png",
  },
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
