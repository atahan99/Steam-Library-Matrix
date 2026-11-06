import { LEVVVEL_KERNEL_URL } from "@/lib/anticheat/anticheatTypes"

export type AboutFeature = {
  title: string
  description: string
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
  title: "Your Steam library in one place",
  subtitle:
    "Import a public Steam profile and see compatibility, anti-cheat, completion times and reviews for every game you own.",
}

export const aboutMission = {
  title: "Why this exists",
  paragraphs: [
    "Steam shows your playtime and tags. It doesn't tell you whether a game runs on Linux, Steam Deck or Mac, whether its anti-cheat blocks Proton, or how long it takes to finish.",
    "Finding that out usually means checking ProtonDB, Are We Anti-Cheat Yet, HowLongToBeat and the Steam store one game at a time. This app looks it all up for your whole library and wishlist and puts it in tables you can filter and sort.",
    "You can change the color theme from the sidebar, and the avatar in the header takes you back to Overview.",
  ],
}

export const aboutFeatures: AboutFeature[] = [
  {
    title: "Overview",
    description:
      "Your most played and recently played games, playtime charts, and a count of games still missing data.",
    highlights: [
      "Library rating: the average share of positive Steam reviews across your games",
      "Link to the SteamDB calculator for your account value",
      "Search your library and wishlist with ⌘K or Ctrl+K",
    ],
  },
  {
    title: "Library",
    description:
      "Every game you own, with Windows, Linux and Mac support, playtime and Steam reviews.",
    highlights: ["Sort by review score"],
  },
  {
    title: "Achievements",
    description:
      "Your achievement progress in each game, from untouched to 100%.",
  },
  {
    title: "Backlog",
    description:
      "How many games you haven't played, and how long the pile would take to clear at your recent pace.",
    highlights: [
      "Quick wins: unplayed games you can finish in an evening",
      "Almost there: games with 50 to 99% of achievements",
      "Hidden gems: your best-reviewed unplayed games",
      "Gathering dust: your oldest unplayed games",
      "A playing-next queue with a monthly goal",
      "Surprise me: random picks that skip your most played, recent and finished games",
    ],
  },
  {
    title: "Compare",
    description:
      "Add other public Steam profiles and see the games you all own.",
  },
  {
    title: "HowLongToBeat",
    description:
      "Main story, main plus extras, and completionist times for each game.",
    highlights: [
      "N/A: the game is on HowLongToBeat but nobody has submitted a time",
      "Not on HLTB: no entry found, with a link to search the site",
      "Pending: not looked up yet",
      "Retrying: the last lookup failed and will run again",
    ],
  },
  {
    title: "Anti-Cheat",
    description:
      "Which anti-cheat each game uses, whether it works on Linux, whether it runs at kernel level, and whether the game uses Denuvo.",
    highlights: [
      "Filter by Linux status or anti-cheat software",
      "Denuvo column shows Detected, Possible, None or Unknown",
    ],
  },
  {
    title: "ProtonDB",
    description:
      "How well each game runs on Linux through Proton, with charts you can click to filter the table.",
    highlights: [
      "Steam Deck Verified and Playable column",
      "Wishlist games that aren't out yet show as Not yet released",
    ],
  },
  {
    title: "Genres",
    description:
      "Your library grouped by Steam store genres or by community tags, with game counts and playtime.",
  },
  {
    title: "Mac Support",
    description:
      "Whether each game runs on Apple Silicon natively, through Rosetta 2, or through CrossOver, next to Steam's own Mac flag.",
    highlights: [
      "Ratings from Perfect to Unplayable",
      "Includes Windows games that run through CrossOver",
    ],
  },
  {
    title: "VR",
    description: "Games that support VR, and games that need it.",
  },
  {
    title: "Data Status",
    description:
      "How much of your library each source covers, with buttons to refresh any of them.",
    highlights: [
      "Browse the full anti-cheat and Denuvo lists",
      "Refresh only the HowLongToBeat games that are still missing",
    ],
  },
  {
    title: "Library and wishlist",
    description:
      "Most tables have a switch between the games you own and your wishlist.",
  },
  {
    title: "Themes",
    description:
      "Pick a color palette from the sidebar. Catppuccin is the default. Your choice is saved in this browser.",
  },
]

export const aboutDataSources: AboutDataSource[] = [
  {
    name: "Steam Web API",
    url: "https://api.steampowered.com",
    provides: "Owned games, playtime, wishlist, achievements",
    usedIn: "Every page",
    fetchMethod: "Steam's official API",
    refreshCadence: "When you import or refresh",
  },
  {
    name: "Steam storefront",
    url: "https://store.steampowered.com",
    provides:
      "Platforms, genres, categories, release dates, images, Steam Deck status, DRM notices",
    usedIn: "Library, Mac Support, VR, Genres, ProtonDB (Deck column), Anti-Cheat (Denuvo)",
    fetchMethod: "Steam store pages and app details",
    refreshCadence: "Every 7 days per game",
    matchingMethod: "Steam app ID",
  },
  {
    name: "ProtonDB",
    url: "https://www.protondb.com",
    provides: "Linux compatibility tier, confidence, report count",
    usedIn: "ProtonDB",
    fetchMethod: "ProtonDB's public summaries",
    refreshCadence: "Every 7 days per game",
    matchingMethod: "Steam app ID",
    limitations:
      "Player reports, not a Valve rating. Unreleased games are skipped.",
  },
  {
    name: "HowLongToBeat",
    url: "https://howlongtobeat.com",
    provides: "Completion times",
    usedIn: "HowLongToBeat, Backlog",
    fetchMethod: "HowLongToBeat search",
    refreshCadence: "Every 30 days per game",
    matchingMethod: "Game title",
    limitations:
      "Unofficial, so lookups can fail when the site changes. A large library can take several minutes.",
  },
  {
    name: "Are We Anti-Cheat Yet",
    url: "https://areweanticheatyet.com",
    provides: "Anti-cheat software and whether it works on Linux",
    usedIn: "Anti-Cheat",
    fetchMethod: "The site's public game list",
    refreshCadence: "Every 7 days",
    matchingMethod: "Steam app ID, then game title",
    limitations: "Only covers games known to use anti-cheat.",
  },
  {
    name: "Levvvel",
    url: LEVVVEL_KERNEL_URL,
    provides: "Games with kernel-level anti-cheat",
    usedIn: "Anti-Cheat (kernel column)",
    fetchMethod: "Read from Levvvel's table",
    refreshCadence: "Every 7 days",
  },
  {
    name: "Denuvo Watch (Steam curator)",
    url: "https://store.steampowered.com/curator/26095454-Denuvo-Watch/",
    provides: "Games that use Denuvo Anti-Tamper",
    usedIn: "Anti-Cheat (Denuvo column)",
    fetchMethod: "The curator's Steam list",
    refreshCadence: "Every 7 days",
    matchingMethod: "Steam app ID",
    limitations:
      "Community list, used alongside the DRM notice on the Steam store page.",
  },
  {
    name: "AppleGamingWiki",
    url: "https://www.applegamingwiki.com",
    provides: "Apple Silicon, Rosetta 2 and CrossOver ratings",
    usedIn: "Mac Support",
    fetchMethod: "AppleGamingWiki's compatibility table",
    refreshCadence: "Included with the app; refresh from Data Status",
    matchingMethod: "Game title",
    limitations:
      "Has no Steam app IDs, so some games won't match. Untested games show as Unknown.",
  },
  {
    name: "SteamSpy",
    url: "https://steamspy.com",
    provides:
      "Review counts (shown with Steam's review labels), owner estimates, yesterday's peak players, top tags",
    usedIn: "Library (Reviews column), Overview (Library rating), Backlog (Hidden gems), Genres (community tags), game details",
    fetchMethod: "SteamSpy's public API",
    refreshCadence: "Every 7 days per game",
    matchingMethod: "Steam app ID",
    limitations:
      "Estimates, not Valve's numbers. SteamSpy allows about one request per second, so a large library fills in slowly.",
  },
  {
    name: "SteamDB",
    url: "https://steamdb.info",
    provides: "Account value and price calculator",
    usedIn: "Overview (opens SteamDB in a new tab)",
    fetchMethod: "Link only, nothing is fetched",
    refreshCadence: "Live on SteamDB",
  },
]

export const aboutDataProvenance = {
  title: "Where the data comes from",
  paragraphs: [
    "The app ships with a cached copy of data from these sources so the first import is fast. It updates as you import profiles and refresh.",
    "Game names, reports, completion times, anti-cheat lists and store data belong to Valve and to each source and its community.",
  ],
  bundledSources: [
    "Steam",
    "ProtonDB",
    "HowLongToBeat",
    "Are We Anti-Cheat Yet",
    "Levvvel",
    "Denuvo Watch",
    "AppleGamingWiki",
  ],
}

export const aboutHowItWorks = {
  title: "How it works",
  intro: "You give it a public profile. It fetches the rest in the background.",
  steps: [
    {
      step: 1,
      title: "Enter a public profile",
      description:
        "Paste a Steam profile URL or Steam ID on the home page. You don't sign in to Steam.",
    },
    {
      step: 2,
      title: "Import your library and wishlist",
      description: "The app saves the games you own and the games on your wishlist.",
    },
    {
      step: 3,
      title: "Fill in the details",
      description:
        "Compatibility, anti-cheat, completion times, achievements, reviews and store details load in the background. Data Status shows progress and lets you refresh any source.",
    },
    {
      step: 4,
      title: "Explore",
      description:
        "Filter and sort each page, and switch between your library and wishlist.",
    },
  ] satisfies AboutStep[],
}

export const aboutTerminology = {
  title: "Terms",
  items: [
    {
      term: "Linux anti-cheat status",
      definition:
        "Are We Anti-Cheat Yet's verdict on whether a game's anti-cheat works on Linux (Supported, Running, Broken and so on). It's separate from Valve's Steam Deck rating.",
    },
    {
      term: "Steam Deck Verified",
      definition:
        "Valve's own Verified or Playable rating from the Steam store, shown in the Deck column on the ProtonDB page.",
    },
    {
      term: "Not yet released",
      definition:
        "A game with a coming-soon release date. ProtonDB has no reports for it yet, so it isn't looked up.",
    },
    {
      term: "Not checked",
      definition:
        "Anti-cheat data hasn't loaded for this game yet. Unknown means it loaded and the source has no answer.",
    },
    {
      term: "Denuvo Anti-Tamper",
      definition:
        "Copy protection (DRM), not anti-cheat. Found from the DRM notice on the Steam store page and the Denuvo Watch curator list.",
    },
    {
      term: "Denuvo Anti-Cheat",
      definition:
        "Denuvo's kernel-level anti-cheat for multiplayer games, a different product from Anti-Tamper. Found when Are We Anti-Cheat Yet or Levvvel lists it.",
    },
  ],
}

export const aboutPrivacy = {
  title: "Privacy and disclaimers",
  items: [
    "Only public Steam profiles can be imported, and you never sign in to Steam.",
    "Imported libraries are stored on the server that runs this app. Looking up details sends game IDs and titles to the sources listed above.",
    "ProtonDB, Are We Anti-Cheat Yet and Levvvel are community lists, not guarantees from Valve.",
    "Linux anti-cheat status and kernel-level anti-cheat are separate. A game can use kernel anti-cheat and still be Supported on Linux.",
    "Any of this data can be out of date or incomplete. Refresh it from Data Status.",
  ],
}

export const aboutAttributions: AboutAttribution[] = [
  {
    name: "Valve / Steam",
    url: "https://store.steampowered.com",
    credit: "Library, wishlist, achievements and store data",
  },
  {
    name: "ProtonDB",
    url: "https://www.protondb.com",
    credit: "Linux compatibility reports",
  },
  {
    name: "HowLongToBeat",
    url: "https://howlongtobeat.com",
    credit: "Completion times",
  },
  {
    name: "Are We Anti-Cheat Yet",
    url: "https://areweanticheatyet.com",
    credit: "Anti-cheat software and Linux status",
  },
  {
    name: "Levvvel",
    url: LEVVVEL_KERNEL_URL,
    credit: "Kernel-level anti-cheat list",
  },
  {
    name: "Denuvo Watch",
    url: "https://store.steampowered.com/curator/26095454-Denuvo-Watch/",
    credit: "Denuvo Anti-Tamper list",
  },
  {
    name: "AppleGamingWiki",
    url: "https://www.applegamingwiki.com",
    credit: "macOS compatibility ratings",
  },
  {
    name: "SteamSpy",
    url: "https://steamspy.com",
    credit: "Review counts, owner estimates, player counts and tags",
  },
  {
    name: "SteamDB",
    url: "https://steamdb.info",
    credit: "Account value calculator (link)",
  },
]

export const aboutAffiliation =
  "Steam Library Matrix is an independent project. It isn't affiliated with Valve, ProtonDB, HowLongToBeat, Are We Anti-Cheat Yet, Levvvel, AppleGamingWiki, SteamSpy or SteamDB."
