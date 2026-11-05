export type DashboardPageSegment =
  | "library"
  | "achievements"
  | "random"
  | "compare"
  | "howlongtobeat"
  | "anticheat"
  | "protondb"
  | "genres"
  | "mac"
  | "vr"
  | "data-status"

export const dashboardPageIntros: Record<DashboardPageSegment, string> = {
  library:
    "Every game you own, with platform support and how long you've played it.",
  achievements:
    "How far you've got with achievements in each game, from untouched to 100%.",
  random:
    "Games you haven't played yet, with a few picks to help you choose the next one.",
  compare:
    "See which games you share with other public Steam profiles and how your playtime compares.",
  howlongtobeat:
    "How long each game takes to beat, according to HowLongToBeat.",
  anticheat:
    "Games that use anti-cheat, and whether that anti-cheat works on Linux.",
  protondb:
    "How well your games run on Linux and Steam Deck, according to ProtonDB.",
  genres:
    "Your library broken down by Steam genre, with game counts and playtime.",
  mac:
    "Which of your games run on macOS, natively or through Rosetta or CrossOver.",
  vr:
    "Games in your library or wishlist that support VR.",
  "data-status":
    "Where each data source stands, and the place to refresh it.",
}
