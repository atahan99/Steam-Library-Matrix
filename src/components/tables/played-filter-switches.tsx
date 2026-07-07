"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

type PlayedFilterSwitchesProps = {
  playedOnly: boolean
  neverPlayedOnly: boolean
  onPlayedOnlyChange: (checked: boolean) => void
  onNeverPlayedOnlyChange: (checked: boolean) => void
  playedId?: string
  neverPlayedId?: string
}

export const PlayedFilterSwitches = ({
  playedOnly,
  neverPlayedOnly,
  onPlayedOnlyChange,
  onNeverPlayedOnlyChange,
  playedId = "played",
  neverPlayedId = "never",
}: PlayedFilterSwitchesProps) => (
  <div className="flex flex-wrap gap-4">
    <div className="flex items-center gap-2">
      <Switch
        id={playedId}
        checked={playedOnly}
        onCheckedChange={onPlayedOnlyChange}
      />
      <Label htmlFor={playedId}>Played only</Label>
    </div>
    <div className="flex items-center gap-2">
      <Switch
        id={neverPlayedId}
        checked={neverPlayedOnly}
        onCheckedChange={onNeverPlayedOnlyChange}
      />
      <Label htmlFor={neverPlayedId}>Never played</Label>
    </div>
  </div>
)
