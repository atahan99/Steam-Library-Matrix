import type {
  DenuvoConfidence,
  DenuvoDisplayState,
  DenuvoDisplayStateKind,
} from "@/lib/steam/denuvo/types"

const DRM_DISCLAIMER =
  "Steam does not reliably expose third-party DRM through appdetails. This status is confidence-based and may be refreshed in the background."

export type ResolveDenuvoDisplayInput = {
  denuvoAntiTamper?: boolean | null
  denuvoConfidence?: string | null
  denuvoSource?: string | null
  denuvoCheckedAt?: string | null
}

const resolveKind = (input: ResolveDenuvoDisplayInput): DenuvoDisplayStateKind => {
  const { denuvoAntiTamper, denuvoConfidence, denuvoSource } = input

  if (denuvoAntiTamper === false) {
    if (
      denuvoConfidence === "high" &&
      (denuvoSource === "removal_confirmed" || denuvoSource === "store_page")
    ) {
      return "confirmed_absent"
    }
    return "unknown"
  }

  if (denuvoAntiTamper === true) {
    if (denuvoConfidence === "high") return "detected"
    if (
      denuvoConfidence === "medium" ||
      denuvoConfidence === "low"
    ) {
      return "possible"
    }
    return "possible"
  }

  return "unknown"
}

const labelForKind = (kind: DenuvoDisplayStateKind): string => {
  switch (kind) {
    case "detected":
      return "Denuvo detected"
    case "possible":
      return "Possible Denuvo"
    case "confirmed_absent":
      return "No active Denuvo confirmed"
    default:
      return "DRM status unknown"
  }
}

const variantForKind = (
  kind: DenuvoDisplayStateKind
): DenuvoDisplayState["variant"] => {
  switch (kind) {
    case "detected":
      return "destructive"
    case "possible":
      return "secondary"
    case "confirmed_absent":
      return "outline"
    default:
      return "outline"
  }
}

export const resolveDenuvoDisplayState = (
  input: ResolveDenuvoDisplayInput
): DenuvoDisplayState => {
  const kind = resolveKind(input)
  const confidence = (input.denuvoConfidence ?? null) as DenuvoConfidence | null

  const detailParts: string[] = []
  if (confidence && confidence !== "none") {
    detailParts.push(`Confidence: ${confidence}`)
  }
  if (input.denuvoSource) {
    detailParts.push(`Source: ${input.denuvoSource}`)
  }
  if (input.denuvoCheckedAt) {
    detailParts.push(`Checked: ${input.denuvoCheckedAt}`)
  }

  const tooltip =
    detailParts.length > 0
      ? `${detailParts.join(" · ")}. ${DRM_DISCLAIMER}`
      : DRM_DISCLAIMER

  return {
    kind,
    label: labelForKind(kind),
    confidence: confidence === "none" ? null : confidence,
    source: input.denuvoSource ?? null,
    checkedAt: input.denuvoCheckedAt ?? null,
    tooltip,
    variant: variantForKind(kind),
  }
}

export const shouldShowDenuvoCuratorLink = (
  input: ResolveDenuvoDisplayInput
): boolean => {
  const kind = resolveKind(input)
  return kind === "detected" || kind === "possible"
}
