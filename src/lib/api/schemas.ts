import { z } from "zod"
import { steamIdSchema } from "@/lib/steam/validate-steamid"

export const enrichBodySchema = z.object({
  steamid: steamIdSchema,
  force: z.boolean().optional(),
  missingOnly: z.boolean().optional(),
})

export const wishlistSyncBodySchema = z.object({
  steamid: steamIdSchema,
})

export const catalogSyncBodySchema = z.object({
  steamid: steamIdSchema,
  force: z.boolean().optional(),
})

export const steamRefreshBodySchema = z.object({
  steamid: steamIdSchema.optional(),
  input: z.string().optional(),
})

export const steamImportBodySchema = z.object({
  input: z.string().min(1, "Input is required"),
})
