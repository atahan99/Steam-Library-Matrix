"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NeonGradientCard } from "@/components/ui/neon-gradient-card"
import { cn } from "@/lib/utils"
import { validateSteamProfileInput } from "@/lib/steam/parse-steam-input"
import { sanitizeSteamProfileInputDraft } from "@/lib/utils/sanitize-text-input"
import { setActiveSteamid } from "@/lib/session/active-profile"

const importNotes = [
  "Paste a profile URL, vanity name, or Steam64 ID.",
  "Your game details must be public on Steam.",
  "No Steam login is required.",
] as const

export const SteamProfileForm = () => {
  const router = useRouter()
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validationError = useMemo(() => {
    const trimmed = input.trim()
    if (!trimmed) return null
    const result = validateSteamProfileInput(trimmed)
    return result.ok ? null : result.error
  }, [input])

  const canSubmit = Boolean(input.trim()) && validationError === null

  const handleInputChange = (value: string) => {
    setInput(sanitizeSteamProfileInputDraft(value))
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = sanitizeSteamProfileInputDraft(input).trim()
    const clientValidation = validateSteamProfileInput(trimmed)
    if (!clientValidation.ok) {
      setError(clientValidation.error)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/steam/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: trimmed }),
      })
      const json = (await res.json()) as {
        error?: string
        steamid?: string
        redirectUrl?: string
      }
      if (!res.ok) {
        throw new Error(json.error ?? "Import failed")
      }

      const steamid =
        typeof json.steamid === "string" ? json.steamid.trim() : ""
      const redirectUrl =
        typeof json.redirectUrl === "string" &&
        json.redirectUrl.startsWith("/dashboard/")
          ? json.redirectUrl
          : steamid
            ? `/dashboard/${steamid}`
            : ""

      if (!redirectUrl) {
        throw new Error("Import succeeded but no dashboard URL was returned")
      }

      if (steamid) {
        setActiveSteamid(steamid)
      }

      router.push(redirectUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <NeonGradientCard
        className="w-full"
        borderSize={3}
        borderRadius={12}
        neonColors={{
          firstColor: "oklch(0.72 0.31 341)",
          secondColor: "oklch(0.82 0.19 195)",
        }}
      >
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              className="landing-input"
              placeholder="https://steamcommunity.com/id/example"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              aria-label="Steam profile URL or ID"
              aria-invalid={validationError ? true : undefined}
              disabled={loading}
              autoComplete="off"
              spellCheck={false}
              inputMode="url"
            />
            <div className="flex justify-center">
              <Button
                type="submit"
                size="sm"
                className="min-w-36 px-5 shadow-[0_0_16px_-6px_var(--neon-glow)]"
                disabled={loading || !canSubmit}
              >
                {loading ? "Importing…" : "Import library"}
              </Button>
            </div>
            {loading ? (
              <p className="text-xs text-muted-foreground">
                Fetching your library from Steam. Wishlist sync continues in the
                background after you land on the dashboard.
              </p>
            ) : null}
          </form>
          {error ? (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Import failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : validationError ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {validationError}
            </p>
          ) : null}
        </CardContent>
      </NeonGradientCard>

      <Card
        role="note"
        className={cn("glass-panel surface-neon ring-1")}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Before you import
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <ul className="mx-auto flex w-fit flex-col gap-2.5 text-sm text-muted-foreground">
            {importNotes.map((note) => (
              <li key={note} className="flex gap-2.5 text-left">
                <span
                  aria-hidden
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-accent shadow-[0_0_6px_var(--neon-glow-accent)]"
                />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
