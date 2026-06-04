"use client"

import { XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type TableGameSearchInputProps = {
  value: string
  onChange: (value: string) => void
  onClearPinned: () => void
  pinnedGameAppid?: number
  placeholder?: string
  id?: string
  className?: string
  "aria-label"?: string
}

export const TableGameSearchInput = ({
  value,
  onChange,
  onClearPinned,
  pinnedGameAppid,
  placeholder = "Search games...",
  id,
  className,
  "aria-label": ariaLabel = "Search games",
}: TableGameSearchInputProps) => {
  const showClear = pinnedGameAppid !== undefined
  const clearLabel = value.trim()
    ? `Clear filter for ${value.trim()}`
    : pinnedGameAppid
      ? `Clear filter for AppID ${pinnedGameAppid}`
      : "Clear search filter"

  return (
    <div className={cn("relative w-full", className)}>
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("w-full", showClear && "pr-10")}
        aria-label={ariaLabel}
      />
      {showClear ? (
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          className="absolute top-1/2 right-1 size-7 -translate-y-1/2 rounded-md border-primary/50 bg-primary/20 text-primary shadow-[0_0_12px_-4px_var(--neon-glow)] hover:border-primary hover:bg-primary hover:text-primary-foreground"
          onClick={onClearPinned}
          aria-label={clearLabel}
        >
          <XIcon className="size-4 stroke-[2.75]" aria-hidden />
        </Button>
      ) : null}
    </div>
  )
}
