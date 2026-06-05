import { SOURCE_ICON, type SourceIconConfig } from "@/lib/sources/source-icon-config"
import { LEVVVEL_KERNEL_URL } from "@/lib/anticheat/anticheatTypes"

export type LibraryOrbitIconConfig = { type: "app" } | SourceIconConfig

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
    icon: SOURCE_ICON.protondb,
  },
  {
    id: "howlongtobeat",
    label: "HowLongToBeat",
    url: "https://howlongtobeat.com",
    icon: SOURCE_ICON.hltb,
  },
  {
    id: "awacy",
    label: "Are We Anti-Cheat Yet",
    url: "https://areweanticheatyet.com",
    icon: SOURCE_ICON.awacy,
  },
  {
    id: "steamdb",
    label: "SteamDB",
    url: "https://steamdb.info",
    icon: SOURCE_ICON.steamdb,
  },
  {
    id: "levvvel",
    label: "Levvvel",
    url: LEVVVEL_KERNEL_URL,
    icon: SOURCE_ICON.levvvel,
  },
  {
    id: "steam-deck",
    label: "Steam Deck",
    url: "https://www.steamdeck.com/en/verified",
    icon: SOURCE_ICON["steam-deck"],
  },
]
