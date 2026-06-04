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
    "Games where Steam app details report native Mac support (platforms.mac). Use the genre filter to narrow the list. If nothing appears, run Steam app details refresh on Data Status.",
  vr:
    "Titles with VR support or VR-only flags parsed from Steam store categories. Filter by headset compatibility and search your library or wishlist.",
  "data-status":
    "Coverage summary, grouped refresh actions, and global catalog sync for AWACY, Levvvel, Denuvo, ProtonDB, HLTB, and Steam app details.",
  random:
    "Two picks each time you open this page: a backlog filler from old unplayed games and a random title outside your top 30 most played, recent activity, and completed games (100% achievements or HLTB playtime met). Cards show Proton tier, AWACY Linux status, and playtime chips.",
}
