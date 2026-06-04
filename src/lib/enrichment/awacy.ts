export type {
  AwacyCompatibilityStatus as AwacyStatus,
  AwacyRawGame as AwacyGame,
} from "@/lib/anticheat/anticheatTypes"

export {
  awacyGameUrl,
  fetchAwacyGames as loadAwacyDataset,
  formatAwacyNotesForStorage as formatAwacyNotes,
  indexAwacyEntries as indexAwacyDataset,
  normalizeAwacyStatus,
} from "@/lib/anticheat/anticheatClient"

export type { AwacyIndexes } from "@/lib/anticheat/anticheatClient"

export const parseAwacySteamAppId = (game: {
  storeIds?: { steam?: string }
}): number | undefined => {
  const raw = game.storeIds?.steam
  if (!raw) return undefined
  const id = parseInt(String(raw), 10)
  return Number.isFinite(id) ? id : undefined
}
