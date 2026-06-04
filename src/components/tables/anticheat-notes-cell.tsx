"use client"

import { FileTextIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type AntiCheatNotesCellProps = {
  notes?: string | null
  gameName: string
}

export const AntiCheatNotesCell = ({
  notes,
  gameName,
}: AntiCheatNotesCellProps) => {
  const trimmed = notes?.trim()
  if (!trimmed) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-6 gap-1 px-1.5 text-muted-foreground hover:text-foreground"
            aria-label={`View anti-cheat notes for ${gameName}`}
          >
            <FileTextIcon className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Note</span>
          </Button>
        }
      />
      <PopoverContent
        side="left"
        align="end"
        className="max-h-64 overflow-y-auto"
      >
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          Notes
        </p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{trimmed}</p>
      </PopoverContent>
    </Popover>
  )
}
