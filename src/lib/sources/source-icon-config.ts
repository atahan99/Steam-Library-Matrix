import type { BrandSlug } from "@/components/icons/brand-icon"

export type SourceIconConfig =
  | { type: "brand"; brand: BrandSlug }
  | { type: "favicon"; src: string; imgClassName?: string }

export type SourceSlug =
  | BrandSlug
  | "steam"
  | "awacy"
  | "levvvel"
  | "hltb"
  | "steamspy"

export const SOURCE_ICON: Record<SourceSlug, SourceIconConfig> = {
  apple: { type: "brand", brand: "apple" },
  // Real site logos in their brand colors, bundled in public/icons/sites — hotlinking breaks or is blocked.
  steam: { type: "favicon", src: "/icons/sites/steam.svg" },
  steamdb: { type: "favicon", src: "/icons/sites/steamdb.svg" },
  "steam-deck": { type: "favicon", src: "/icons/sites/steam-deck.svg" },
  protondb: { type: "favicon", src: "/icons/sites/protondb.svg" },
  awacy: { type: "favicon", src: "/icons/sites/awacy.webp" },
  levvvel: { type: "favicon", src: "/icons/sites/levvvel.svg" },
  hltb: { type: "favicon", src: "/icons/sites/hltb.png" },
  steamspy: { type: "favicon", src: "/icons/sites/steamspy.png" },
}
