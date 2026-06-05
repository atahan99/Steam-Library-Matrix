import { z } from "zod"

/** Steam often sends explicit `null` for missing string fields — not just omission. */
const nullableString = z.string().nullish()

const steamCategorySchema = z
  .object({
    id: z.union([z.number(), z.string()]).nullish(),
    description: nullableString,
  })
  .passthrough()

const steamGenreSchema = z
  .object({
    id: nullableString,
    description: nullableString,
  })
  .passthrough()

const steamPlatformsSchema = z
  .object({
    windows: z.boolean().nullish(),
    mac: z.boolean().nullish(),
    linux: z.boolean().nullish(),
  })
  .passthrough()

export const steamAppDetailsDataSchema = z
  .object({
    name: nullableString,
    type: nullableString,
    short_description: nullableString,
    header_image: nullableString,
    website: nullableString,
    developers: z.array(nullableString).nullish(),
    publishers: z.array(nullableString).nullish(),
    platforms: steamPlatformsSchema.nullish(),
    categories: z.array(steamCategorySchema).nullish(),
    genres: z.array(steamGenreSchema).nullish(),
    release_date: z.unknown().optional(),
    metacritic: z.unknown().optional(),
    recommendations: z.unknown().optional(),
  })
  .passthrough()

export const steamAppDetailsResponseSchema = z.record(
  z.string(),
  z.object({
    success: z.boolean(),
    data: steamAppDetailsDataSchema.optional(),
  })
)

export type SteamAppDetailsData = z.infer<typeof steamAppDetailsDataSchema>
