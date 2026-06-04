const VR_DEVICE_RULES = [
  { label: "VR Support", patterns: ["vr support", "vr supported"] },
  { label: "VR Only", patterns: ["vr only"] },
  { label: "Tracked controllers", patterns: ["tracked controller support"] },
  { label: "SteamVR", patterns: ["steamvr collectibles"] },
  { label: "HTC Vive", patterns: ["htc vive"] },
  { label: "Oculus Rift", patterns: ["oculus rift", "oculus quest"] },
  { label: "Valve Index", patterns: ["valve index"] },
  {
    label: "Windows Mixed Reality",
    patterns: ["windows mixed reality", "mixed reality"],
  },
] as const

const DISPLAY_ORDER = VR_DEVICE_RULES.map((rule) => rule.label)

const categoryLabel = (entry: unknown): string => {
  if (typeof entry === "object" && entry && "description" in entry) {
    return String((entry as { description: string }).description)
  }
  return String(entry)
}

const normalizeCategory = (label: string): string => label.toLowerCase().trim()

const matchesRule = (normalizedLabels: string[], patterns: readonly string[]) =>
  normalizedLabels.some((label) =>
    patterns.some((pattern) => label.includes(pattern))
  )

export const sortVrDeviceLabels = (labels: string[]): string[] =>
  [...labels].sort((a, b) => {
    const indexA = DISPLAY_ORDER.indexOf(a as (typeof DISPLAY_ORDER)[number])
    const indexB = DISPLAY_ORDER.indexOf(b as (typeof DISPLAY_ORDER)[number])
    if (indexA === -1 && indexB === -1) return a.localeCompare(b)
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  })

export const getVrDeviceLabels = (
  categories: unknown[] | null | undefined
): string[] => {
  if (!categories?.length) return []

  const normalizedLabels = categories.map(categoryLabel).map(normalizeCategory)
  const matched = new Set<string>()

  for (const rule of VR_DEVICE_RULES) {
    if (matchesRule(normalizedLabels, rule.patterns)) {
      matched.add(rule.label)
    }
  }

  return sortVrDeviceLabels([...matched])
}

export type VrDeviceFilterSource = {
  categories?: unknown[]
}

export const collectVrDeviceFilterOptions = (
  sources: Array<VrDeviceFilterSource | undefined>
): string[] => {
  const options = new Set<string>()
  for (const source of sources) {
    for (const label of getVrDeviceLabels(source?.categories)) {
      options.add(label)
    }
  }
  return sortVrDeviceLabels([...options])
}

export const gameMatchesVrDeviceFilter = (
  categories: unknown[] | undefined,
  selected: string[]
): boolean => {
  if (selected.length === 0) return true
  const labels = getVrDeviceLabels(categories)
  if (!labels.length) return false
  return selected.some((device) => labels.includes(device))
}

export const vrDeviceLabel = (categories: unknown[] | undefined): string => {
  const labels = getVrDeviceLabels(categories)
  if (!labels.length) return "—"
  return labels.join(", ")
}
