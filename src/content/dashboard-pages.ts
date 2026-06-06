export type DashboardPageSegment =
  | "library"
  | "compare"
  | "howlongtobeat"
  | "protondb"
  | "anticheat"
  | "mac"
  | "vr"
  | "data-status"
  | "random"

export const dashboardPageIntros: Record<DashboardPageSegment, string> = {
  library:
    "Your owned Steam games with OS support icons, lifetime and recent playtime, search, filters, sort, and pagination.",
  compare:
    "Compare your library with other public Steam profiles — shared titles, playtime overlap, and side-by-side stats.",
  howlongtobeat:
    "Community-sourced completion times from HowLongToBeat: main story, main + extras, and completionist estimates. Missing rows can be filled from Data Status → HowLongToBeat refresh.",
  protondb:
    "Community Proton and Linux compatibility tiers from ProtonDB — useful for Steam Deck and desktop Linux. Charts and filters sync; refresh from Data Status when tiers are missing.",
  anticheat:
    "Games with known anti-cheat signals: software names, Linux status from Are We Anti-Cheat Yet (AWACY), and kernel-level data from Levvvel. Run Anti-cheat refresh on Data Status to update matches.",
  mac:
    "Apple Silicon (native), Rosetta 2, and CrossOver compatibility from AppleGamingWiki, matched to your library — alongside Steam's native Mac flag. Filter to Apple Silicon native or CrossOver-playable titles, or refresh the data from Data Status.",
  vr:
    "Titles with VR support or VR-only flags parsed from Steam store categories. Filter by headset compatibility and search your library or wishlist.",
  "data-status":
    "Coverage summary, grouped refresh actions, and global catalog sync for AWACY, Levvvel, Denuvo, ProtonDB, HLTB, and Steam app details.",
  random:
    "Your pile of shame, quantified — how many games you've never touched, how many years it'd take to clear them at your current pace, and curated picks: quick wins, titles you're one achievement shy of 100%, and the oldest games gathering dust. Plus a random roll for when deciding what to play is the hardest part of gaming.",
}
