import { Badge } from "@/components/ui/badge"
import type { SteamDeckCompatibility } from "@/lib/utils/detect-steam-deck"
import { cn } from "@/lib/utils"

const DECK_LABEL: Record<SteamDeckCompatibility, string> = {
  verified: "Verified",
  playable: "Playable",
  unsupported: "Unsupported",
  unknown: "Unknown",
}

const DECK_CLASS: Record<SteamDeckCompatibility, string> = {
  verified:
    "border-[var(--deck-verified-border)] bg-[var(--deck-verified-bg)] text-[var(--deck-verified)] shadow-[0_0_12px_-4px_var(--deck-verified-border)]",
  playable:
    "border-[var(--deck-playable-border)] bg-[var(--deck-playable-bg)] text-[var(--deck-playable)] shadow-[0_0_12px_-4px_var(--deck-playable-border)]",
  unsupported:
    "border-[var(--deck-unsupported-border)] bg-[var(--deck-unsupported-bg)] text-[var(--deck-unsupported)]",
  unknown: "border-border bg-muted/30 text-muted-foreground",
}

type SteamDeckBadgeProps = {
  compatibility?: SteamDeckCompatibility
}

export const SteamDeckBadge = ({ compatibility = "unknown" }: SteamDeckBadgeProps) => (
  <Badge
    variant="outline"
    className={cn("capitalize", DECK_CLASS[compatibility])}
  >
    {DECK_LABEL[compatibility]}
  </Badge>
)
