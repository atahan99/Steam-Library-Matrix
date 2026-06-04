"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

type AddProfileSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  primarySteamid: string
  existingIds: string[]
  onAdded: (steamid: string) => void
}

export const AddProfileSheet = ({
  open,
  onOpenChange,
  primarySteamid,
  existingIds,
  onAdded,
}: AddProfileSheetProps) => {
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setInput("")
      setError(null)
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/steam/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      })
      const json = (await res.json()) as { steamid?: string; error?: string }
      if (!res.ok) {
        throw new Error(json.error ?? "Import failed")
      }
      if (!json.steamid) {
        throw new Error("Import did not return a Steam ID")
      }
      if (json.steamid === primarySteamid) {
        throw new Error("You cannot compare your profile with itself")
      }
      if (existingIds.includes(json.steamid)) {
        throw new Error("This profile is already in the comparison")
      }

      onAdded(json.steamid)
      setInput("")
      setError(null)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Add profile to compare</SheetTitle>
          <SheetDescription>
            Paste a profile URL, vanity name, or Steam64 ID. Their game details
            must be public on Steam.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
          <Input
            placeholder="https://steamcommunity.com/id/example"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Steam profile URL or ID"
            disabled={loading}
          />
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not add profile</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <SheetFooter className="px-0">
            <Button type="submit" disabled={loading || !input.trim()}>
              {loading ? "Importing…" : "Add profile"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
