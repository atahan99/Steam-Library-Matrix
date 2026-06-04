import { normalizeGameName } from "@/lib/utils/normalize-game-name"

export const calculateMatchConfidence = (
  steamName: string,
  sourceName: string
): number => {
  const a = normalizeGameName(steamName)
  const b = normalizeGameName(sourceName)
  if (!a || !b) return 0
  if (a === b) return 1
  if (a.includes(b) || b.includes(a)) return 0.85
  const aTokens = new Set(a.split(" "))
  const bTokens = new Set(b.split(" "))
  const intersection = [...aTokens].filter((t) => bTokens.has(t)).length
  const union = new Set([...aTokens, ...bTokens]).size
  return union === 0 ? 0 : intersection / union
}
