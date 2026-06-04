import type { BrandSlug } from "@/components/icons/brand-icon"
import { LEVVVEL_KERNEL_URL } from "@/lib/anticheat/anticheatTypes"

export type LibraryOrbitIconConfig =
  | { type: "app" }
  | { type: "steam" }
  | { type: "brand"; brand: BrandSlug }
  | { type: "image"; src: string }

export type LibraryOrbitNode = {
  id: string
  label: string
  url: string
  icon: LibraryOrbitIconConfig
}

export const libraryOrbitCenter = {
  icon: { type: "app" } as const,
  label: "Steam Library Matrix",
  url: "/",
}

export const libraryOrbitNodes: LibraryOrbitNode[] = [
  {
    id: "steam",
    label: "Steam Store",
    url: "https://store.steampowered.com",
    icon: { type: "steam" },
  },
  {
    id: "protondb",
    label: "ProtonDB",
    url: "https://www.protondb.com",
    icon: { type: "brand", brand: "protondb" },
  },
  {
    id: "howlongtobeat",
    label: "HowLongToBeat",
    url: "https://howlongtobeat.com",
    icon: {
      type: "image",
      src: "https://howlongtobeat.com/img/icons/favicon-32x32.png",
    },
  },
  {
    id: "awacy",
    label: "Are We Anti-Cheat Yet",
    url: "https://areweanticheatyet.com",
    icon: { type: "image", src: "https://areweanticheatyet.com/icon.webp" },
  },
  {
    id: "steamdb",
    label: "SteamDB",
    url: "https://steamdb.info",
    icon: { type: "brand", brand: "steamdb" },
  },
  {
    id: "levvvel",
    label: "Levvvel",
    url: LEVVVEL_KERNEL_URL,
    icon: {
      type: "image",
      src: "https://levvvel.com/wp-content/uploads/vvv-favicon-square-1-100x100.png",
    },
  },
  {
    id: "steam-deck",
    label: "Steam Deck",
    url: "https://www.steamdeck.com/en/verified",
    icon: { type: "brand", brand: "steam-deck" },
  },
]
