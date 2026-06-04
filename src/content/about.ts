import { LEVVVEL_KERNEL_URL } from "@/lib/anticheat/anticheatTypes"

export type AboutFeature = {
  title: string
  description: string
  pathPattern: string
  highlights?: string[]
}

export type AboutDataSource = {
  name: string
  url: string
  provides: string
  usedIn: string
  fetchMethod: string
  refreshCadence: string
  matchingMethod?: string
  limitations?: string
}

export type AboutStep = {
  step: number
  title: string
  description: string
}

export type AboutAttribution = {
  name: string
  url: string
  credit: string
}

export const aboutHero = {
  eyebrow: "Steam Library Matrix",
  title: "Your library, decoded",
  subtitle:
    "Import a public Steam profile, enrich each title from community and third-party sources, and explore everything in one dashboard.",
}

export const aboutMission = {
  title: "Why this exists",
  paragraphs: [
    "Steam's own library view shows playtime and tags, but not Proton/Linux compatibility, anti-cheat blockers, completion times, or cross-platform support in one place.",
    "Linux, Steam Deck, and Mac gamers often bounce between ProtonDB, Are We Anti-Cheat Yet, HowLongToBeat, SteamDB, and the Steam store — manually, game by game.",
    "Steam Library Matrix imports your public library and wishlist, enriches each title from those sources, and surfaces everything in filterable tables under one roof.",
    "Pick a dashboard theme from the sidebar, use Random Game Picker when you want a backlog nudge, and jump back to Overview from the header avatar.",
  ],
}

export const aboutFeatures: AboutFeature[] = [
  {
    title: "Overview",
    description:
      "Top played games, recent activity, playtime chart, SteamDB calculator link, and missing-enrichment summary.",
    pathPattern: "/dashboard/[steamid]",
    highlights: [
      "Wishlist-aware missing ProtonDB and enrichment counts",
      "Global game search (⌘K / Ctrl+K) across library and wishlist",
    ],
  },
  {
    title: "Library",
    description:
      "Full owned-games table with OS support icons, playtime, search, filter, and sort.",
    pathPattern: "/dashboard/[steamid]/library",
    highlights: [
      "OS column: Windows, Linux, and Mac icons (colorful when supported)",
      "Mac icon when Steam app details report platforms.mac",
    ],
  },
  {
    title: "Compare",
    description:
      "Side-by-side library intersection across multiple Steam profiles.",
    pathPattern: "/dashboard/[steamid]/compare",
  },
  {
    title: "HowLongToBeat",
    description:
      "Main story, extra, and completionist time estimates per game.",
    pathPattern: "/dashboard/[steamid]/howlongtobeat",
  },
  {
    title: "Anti-Cheat",
    description:
      "Anti-cheat software names, Linux anti-cheat status from AWACY, kernel-level anti-cheat from Levvvel, and Denuvo Anti-Tamper signals.",
    pathPattern: "/dashboard/[steamid]/anticheat",
    highlights: [
      "Table defaults to games with meaningful anti-cheat data",
      "Filters: Linux status, search, sort, played-only",
      "Compact library summary with AWACY status counts",
      "Denuvo Anti-Tamper from store DRM + Denuvo Watch curator catalog",
    ],
  },
  {
    title: "ProtonDB",
    description:
      "Proton/Linux tier ratings, confidence, report counts, and tier charts with click-to-filter sync.",
    pathPattern: "/dashboard/[steamid]/protondb",
    highlights: [
      "Steam Deck Verified / Playable column and filter (Valve store categories)",
      "“Not yet released” tier for coming-soon wishlist titles",
      "Library vs wishlist chart labels",
    ],
  },
  {
    title: "Mac Support",
    description:
      "Games with native Mac support from Steam store app details (platforms.mac).",
    pathPattern: "/dashboard/[steamid]/mac",
    highlights: [
      "Lists only titles where app details report platforms.mac",
      "Genre multiselect, search, and playtime filters",
      "Refresh Steam app details from Data Status when the list is empty",
    ],
  },
  {
    title: "VR",
    description:
      "VR-supported and VR-only titles parsed from Steam categories.",
    pathPattern: "/dashboard/[steamid]/vr",
    highlights: [
      "VR support and VR-only shown as yes/no indicators",
    ],
  },
  {
    title: "Random Game Picker",
    description:
      "Two suggestions per visit: a backlog filler from old unplayed titles and a random pick outside your top played and recent activity.",
    pathPattern: "/dashboard/[steamid]/random",
    highlights: [
      "Excludes top 30 by lifetime playtime and games played in the last two weeks",
      "Roll again without leaving the page",
    ],
  },
  {
    title: "Data Status",
    description:
      "Operational hub: coverage summary, grouped refresh cards, global catalog sync, and searchable AWACY/Levvvel/Denuvo catalog browse.",
    pathPattern: "/dashboard/[steamid]/data-status",
    highlights: [
      "Steam core, compatibility, anti-cheat, and HLTB sections",
      "HowLongToBeat Missing only refresh for incremental runs",
    ],
  },
  {
    title: "Library / Wishlist toggle",
    description:
      "Switch between owned games and wishlist on enrichment tables (ProtonDB, Anti-Cheat, HLTB, Mac, VR).",
    pathPattern: "/dashboard/[steamid]/*",
  },
  {
    title: "Theme selector",
    description:
      "Swap dashboard color palettes from the sidebar (TweakCN presets). Layout and typography stay consistent; only colors change.",
    pathPattern: "/dashboard/[steamid]/*",
    highlights: [
      "Catppuccin default plus community palettes (Cyberpunk, Terminal, and others)",
      "Preference stored in the browser",
    ],
  },
]

export const aboutDataSources: AboutDataSource[] = [
  {
    name: "Steam Web API",
    url: "https://api.steampowered.com",
    provides: "Owned games, playtime, wishlist",
    usedIn: "Import, all sections",
    fetchMethod:
      "POST /api/steam/import, /api/steam/refresh, /api/steam/wishlist-sync",
    refreshCadence: "On import or manual refresh",
  },
  {
    name: "Steam Store API",
    url: "https://store.steampowered.com/api/appdetails",
    provides:
      "Platforms, genres, categories, release date, header image",
    usedIn:
      "Library OS column, Mac Support, VR, ProtonDB Deck column (Steam Deck compatibility API), wishlist name resolution",
    fetchMethod:
      "POST /api/enrich/app-details (store appdetails + Deck compatibility report)",
    refreshCadence: "7-day TTL per game unless forced",
    matchingMethod: "Steam app ID",
  },
  {
    name: "ProtonDB",
    url: "https://www.protondb.com",
    provides:
      "Linux/Proton compatibility tier, confidence, report count",
    usedIn: "ProtonDB section",
    fetchMethod: "POST /api/enrich/protondb",
    refreshCadence: "7-day TTL per game unless forced",
    matchingMethod: "Steam app ID",
    limitations:
      "Community reports — not an official Valve rating. Unreleased titles are skipped and labeled “Not yet released”.",
  },
  {
    name: "Are We Anti-Cheat Yet (AWACY)",
    url: "https://areweanticheatyet.com",
    provides:
      "Linux anti-cheat status, software names, native Linux flag",
    usedIn: "Anti-Cheat section (Linux anti-cheat status column)",
    fetchMethod:
      "POST /api/anticheat/catalog-sync (global AWACY JSON) + POST /api/enrich/anticheat (profile link)",
    refreshCadence: "Catalog: 7-day TTL; profile link: 7-day TTL per game unless forced",
    matchingMethod: "Steam app ID first, then fuzzy title match",
    limitations:
      "Only lists games with known anti-cheat. “Linux anti-cheat status” is AWACY compatibility — not Valve’s Steam Deck Verified badge.",
  },
  {
    name: "Levvvel",
    url: LEVVVEL_KERNEL_URL,
    provides: "Kernel-level anti-cheat list",
    usedIn: "Anti-Cheat section (kernel column)",
    fetchMethod:
      "POST /api/anticheat/catalog-sync (HTML + AJAX scrape, stored globally)",
    refreshCadence: "Catalog: 7-day TTL unless forced from Data Status",
    limitations:
      "HTML scrape — partial fetches are tracked on the catalog card; kernel=no is only set when the catalog is complete.",
  },
  {
    name: "Denuvo Watch (Steam curator)",
    url: "https://store.steampowered.com/curator/26095454-Denuvo-Watch/",
    provides: "Denuvo Anti-Tamper game list (app IDs)",
    usedIn: "Anti-Cheat section (software filter and Anti-cheat software column)",
    fetchMethod:
      "POST /api/anticheat/catalog-sync (AWACY JSON + Levvvel fetch; Denuvo via Steam API)",
    refreshCadence: "7-day TTL unless forced from Data Status",
    matchingMethod: "Steam app ID",
    limitations:
      "Community-maintained Steam curator — secondary signal after store page DRM notices. Separate from Denuvo Anti-Cheat (kernel), which comes from AWACY/Levvvel software names.",
  },
  {
    name: "HowLongToBeat",
    url: "https://howlongtobeat.com",
    provides: "Completion time estimates",
    usedIn: "HowLongToBeat section",
    fetchMethod:
      "POST /api/enrich/howlongtobeat (optional missingOnly; parallel batches)",
    refreshCadence:
      "30-day TTL per game unless forced; failed/skipped lookups cached to avoid repeat scrapes",
    matchingMethod: "Fuzzy title match against HLTB search",
    limitations:
      "Unofficial site API — run scripts/verify-hltb.mts after outages. Full libraries can take several minutes.",
  },
  {
    name: "SteamDB",
    url: "https://steamdb.info",
    provides: "Account value and regional price calculator (external site)",
    usedIn: "Overview profile card — opens SteamDB in a new tab",
    fetchMethod: "External link only; not scraped or cached by this app",
    refreshCadence: "N/A — view live data on steamdb.info",
    limitations:
      "Account value and prices are shown on SteamDB, not stored in Steam Library Matrix.",
  },
]

export const aboutHowItWorks = {
  title: "How it works",
  intro:
    "Data flows from your public Steam profile into SQLite, then through on-demand enrichment into dashboard tables and charts.",
  steps: [
    {
      step: 1,
      title: "Enter a public profile",
      description:
        "Paste a public Steam profile URL or Steam ID on the landing page. No Steam login is required.",
    },
    {
      step: 2,
      title: "Sync library and wishlist",
      description:
        "Owned games and wishlist titles are stored in SQLite (steam_games, profile_games, profile_wishlist).",
    },
    {
      step: 3,
      title: "Enrich on demand",
      description:
        "After import, enrichment runs in the background (ProtonDB, HLTB, achievements, anti-cheat, app details). Data Status can force a full refresh of every source.",
    },
    {
      step: 4,
      title: "Explore the dashboard",
      description:
        "Each section reads cached enrichment joined to your games. Filter, sort, and toggle between library and wishlist.",
    },
  ] satisfies AboutStep[],
}

export const aboutTerminology = {
  title: "Terminology",
  items: [
    {
      term: "Linux anti-cheat status",
      definition:
        "AWACY compatibility for anti-cheat on Linux/Proton (Supported, Running, Broken, etc.). Shown on the Anti-Cheat page — separate from Valve’s Deck badge.",
    },
    {
      term: "Steam Deck Verified",
      definition:
        "Valve’s official Verified or Playable store category from Steam app details. Shown as the Deck column on the ProtonDB page.",
    },
    {
      term: "Not yet released",
      definition:
        "Wishlist or library titles with a coming-soon release date. ProtonDB is not queried; charts and filters use this tier instead of “Not enriched”.",
    },
    {
      term: "Not checked",
      definition:
        "Anti-cheat enrichment has not run for this game yet — distinct from AWACY “Unknown” after a refresh.",
    },
    {
      term: "Denuvo Anti-Tamper",
      definition:
        "DRM / anti-tamper protection (not kernel anti-cheat). Detected from the Steam store page DRM notices (primary) and the Denuvo Watch curator list (secondary), matched by Steam app ID.",
    },
    {
      term: "Denuvo Anti-Cheat",
      definition:
        "Kernel-level multiplayer anti-cheat product from Denuvo, distinct from Anti-Tamper. Detected from AWACY/Levvvel software names when listed as “Denuvo Anti-Cheat”.",
    },
  ],
}

export const aboutPrivacy = {
  title: "Privacy & disclaimers",
  items: [
    "Only public Steam profiles can be imported; no Steam account login is required.",
    "Data is stored server-side in SQLite. Enrichment calls third-party APIs and community-maintained lists.",
    "ProtonDB ratings are community-sourced. AWACY and Levvvel are curated or scraped lists — not official Valve or Steam guarantees.",
    "Linux anti-cheat status and kernel-level detection are separate signals. A game can use kernel anti-cheat and still show Supported on AWACY.",
    "Compatibility and completion data may be outdated or incomplete. Use refresh controls on Data Status to update.",
  ],
}

export const aboutAttributions: AboutAttribution[] = [
  {
    name: "ProtonDB",
    url: "https://www.protondb.com",
    credit: "Linux/Proton compatibility reports and tier summaries",
  },
  {
    name: "Are We Anti-Cheat Yet",
    url: "https://areweanticheatyet.com",
    credit: "Linux anti-cheat status and software names",
  },
  {
    name: "HowLongToBeat",
    url: "https://howlongtobeat.com",
    credit: "Completion time estimates",
  },
  {
    name: "SteamDB",
    url: "https://steamdb.info",
    credit: "Account calculator (external link)",
  },
  {
    name: "Levvvel",
    url: LEVVVEL_KERNEL_URL,
    credit: "Kernel-level anti-cheat reference list",
  },
  {
    name: "Valve / Steam",
    url: "https://store.steampowered.com",
    credit: "Game metadata, library, and wishlist via public APIs",
  },
]

export const aboutAffiliation =
  "Steam Library Matrix is an independent project. It is not affiliated with Valve, ProtonDB, AWACY, HowLongToBeat, SteamDB, or Levvvel."
