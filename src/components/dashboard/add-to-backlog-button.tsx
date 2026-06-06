"use client"

import { useState } from "react"
import { Check, ListPlus, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

type AddToBacklogButtonProps = {
  steamid: string
  appid: number
  /** Render a small icon-only button for use inside list rows. */
  compact?: boolean
}

export const AddToBacklogButton = ({
  steamid,
  appid,
  compact = false,
}: AddToBacklogButtonProps) => {
  const [added, setAdded] = useState(false)
  const [pending, setPending] = useState(false)

  const handleAdd = async () => {
    setPending(true)
    try {
      const res = await fetch(`/api/dashboard/${steamid}/backlog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appid }),
      })
      if (!res.ok) throw new Error("Request failed")
      setAdded(true)
      toast.success("Added to backlog")
    } catch {
      toast.error("Could not add to backlog")
    } finally {
      setPending(false)
    }
  }

  if (compact) {
    return (
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={handleAdd}
        disabled={pending || added}
        aria-label={added ? "In backlog" : "Add to backlog"}
        title={added ? "In backlog" : "Add to backlog"}
      >
        {added ? (
          <Check className="size-4 text-primary" aria-hidden />
        ) : (
          <Plus className="size-4" aria-hidden />
        )}
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleAdd}
      disabled={pending || added}
    >
      {added ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <ListPlus className="size-3.5" aria-hidden />
      )}
      {added ? "In backlog" : "Add to backlog"}
    </Button>
  )
}
