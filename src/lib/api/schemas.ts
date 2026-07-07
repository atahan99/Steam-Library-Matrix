import { z } from "zod"
import { validateSteamProfileInput } from "@/lib/steam/parse-steam-input"
import { sanitizeSteamProfileInputDraft } from "@/lib/utils/sanitize-text-input"
import { steamIdSchema } from "@/lib/steam/validate-steamid"

const steamProfileInputSchema = z
  .string()
  .superRefine((value, ctx) => {
    const result = validateSteamProfileInput(value)
    if (!result.ok) {
      ctx.addIssue({ code: "custom", message: result.error })
    }
  })
  .transform((value) => sanitizeSteamProfileInputDraft(value).trim())

export const steamRefreshBodySchema = z.object({
  steamid: steamIdSchema.optional(),
  input: steamProfileInputSchema.optional(),
})

export const steamImportBodySchema = z.object({
  input: steamProfileInputSchema,
})
