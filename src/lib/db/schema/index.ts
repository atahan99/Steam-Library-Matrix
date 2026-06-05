import { sql } from "drizzle-orm"
import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core"

const timestampMs = (name: string) =>
  integer(name, { mode: "timestamp_ms" })

const jsonText = <T>(name: string) => text(name, { mode: "json" }).$type<T>()

const stringArray = (name: string) =>
  text(name, { mode: "json" }).$type<string[]>()

export const steamProfiles = sqliteTable("steam_profiles", {
  steamid: text("steamid").primaryKey(),
  personaName: text("persona_name"),
  avatarUrl: text("avatar_url"),
  profileUrl: text("profile_url"),
  visibilityState: integer("visibility_state"),
  steamLevel: integer("steam_level"),
  accountCreatedAt: timestampMs("account_created_at"),
  countryCode: text("country_code"),
  wishlistLastSyncedAt: timestampMs("wishlist_last_synced_at"),
  wishlistSyncError: text("wishlist_sync_error"),
  lastSyncedAt: timestampMs("last_synced_at"),
  profileTokenHash: text("profile_token_hash"),
  profileTokenVersion: integer("profile_token_version").notNull().default(0),
  profileClaimedAt: timestampMs("profile_claimed_at"),
  profileTokenRotatedAt: timestampMs("profile_token_rotated_at"),
  openidVerifiedAt: timestampMs("openid_verified_at"),
  createdAt: timestampMs("created_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
  updatedAt: timestampMs("updated_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
})

export const steamGames = sqliteTable("steam_games", {
  appid: integer("appid").primaryKey(),
  name: text("name").notNull(),
  iconUrl: text("icon_url"),
  logoUrl: text("logo_url"),
  storeUrl: text("store_url"),
  createdAt: timestampMs("created_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
  updatedAt: timestampMs("updated_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
})

export const profileGames = sqliteTable(
  "profile_games",
  {
    steamid: text("steamid")
      .notNull()
      .references(() => steamProfiles.steamid, { onDelete: "cascade" }),
    appid: integer("appid")
      .notNull()
      .references(() => steamGames.appid, { onDelete: "cascade" }),
    playtimeForeverMinutes: integer("playtime_forever_minutes").default(0),
    playtime2weeksMinutes: integer("playtime_2weeks_minutes").default(0),
    lastSyncedAt: timestampMs("last_synced_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
  },
  (t) => [primaryKey({ columns: [t.steamid, t.appid] })]
)

export const steamAppDetails = sqliteTable("steam_app_details", {
  appid: integer("appid")
    .primaryKey()
    .references(() => steamGames.appid, { onDelete: "cascade" }),
  type: text("type"),
  shortDescription: text("short_description"),
  headerImage: text("header_image"),
  website: text("website"),
  developers: jsonText<unknown>("developers"),
  publishers: jsonText<unknown>("publishers"),
  platforms: jsonText<unknown>("platforms"),
  categories: jsonText<unknown>("categories"),
  genres: jsonText<unknown>("genres"),
  releaseDate: jsonText<unknown>("release_date"),
  metacritic: jsonText<unknown>("metacritic"),
  recommendations: jsonText<unknown>("recommendations"),
  steamDeckCompatibility: text("steam_deck_compatibility"),
  lastCheckedAt: timestampMs("last_checked_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
  createdAt: timestampMs("created_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
  updatedAt: timestampMs("updated_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
})

export const howlongtobeatEntries = sqliteTable("howlongtobeat_entries", {
  appid: integer("appid")
    .primaryKey()
    .references(() => steamGames.appid, { onDelete: "cascade" }),
  hltbId: text("hltb_id"),
  matchedName: text("matched_name"),
  matchConfidence: real("match_confidence"),
  mainStoryMinutes: integer("main_story_minutes"),
  mainExtraMinutes: integer("main_extra_minutes"),
  completionistMinutes: integer("completionist_minutes"),
  allStylesMinutes: integer("all_styles_minutes"),
  imageUrl: text("image_url"),
  platforms: stringArray("platforms"),
  reviewScore: integer("review_score"),
  sourceUrl: text("source_url"),
  lastCheckedAt: timestampMs("last_checked_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
  createdAt: timestampMs("created_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
  updatedAt: timestampMs("updated_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
})

export const anticheatEntries = sqliteTable("anticheat_entries", {
  appid: integer("appid")
    .primaryKey()
    .references(() => steamGames.appid, { onDelete: "cascade" }),
  matchedName: text("matched_name"),
  anticheatNames: stringArray("anticheat_names"),
  status: text("status"),
  kernelLevel: integer("kernel_level", { mode: "boolean" }),
  notes: text("notes"),
  awacySlug: text("awacy_slug"),
  nativeLinux: integer("native_linux", { mode: "boolean" }),
  levvvelMatchedName: text("levvvel_matched_name"),
  levvvelAnticheatNames: stringArray("levvvel_anticheat_names"),
  levvvelDeveloper: text("levvvel_developer"),
  levvvelPublisher: text("levvvel_publisher"),
  awacyDateChanged: timestampMs("awacy_date_changed"),
  matchConfidence: text("match_confidence"),
  levvvelSourceUrl: text("levvvel_source_url"),
  denuvoAntiTamper: integer("denuvo_anti_tamper", { mode: "boolean" }),
  denuvoAntiCheat: integer("denuvo_anti_cheat", { mode: "boolean" }),
  denuvoConfidence: text("denuvo_confidence"),
  denuvoSource: text("denuvo_source"),
  denuvoEvidence: text("denuvo_evidence"),
  denuvoCheckedAt: timestampMs("denuvo_checked_at"),
  sourceUrl: text("source_url"),
  lastCheckedAt: timestampMs("last_checked_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
  createdAt: timestampMs("created_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
  updatedAt: timestampMs("updated_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
})

export const protondbEntries = sqliteTable("protondb_entries", {
  appid: integer("appid")
    .primaryKey()
    .references(() => steamGames.appid, { onDelete: "cascade" }),
  tier: text("tier"),
  confidence: text("confidence"),
  totalReports: integer("total_reports"),
  latestReportedAt: timestampMs("latest_reported_at"),
  sourceUrl: text("source_url"),
  lastCheckedAt: timestampMs("last_checked_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
  createdAt: timestampMs("created_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
  updatedAt: timestampMs("updated_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
})

export const enrichmentJobs = sqliteTable("enrichment_jobs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  steamid: text("steamid")
    .notNull()
    .references(() => steamProfiles.steamid, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("pending"),
  payload: jsonText<Record<string, unknown>>("payload").notNull().default({}),
  progress: jsonText<Record<string, unknown>>("progress").notNull().default({}),
  error: text("error"),
  attempts: integer("attempts").notNull().default(0),
  runAfter: timestampMs("run_after")
    .notNull()
    .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
  lockedAt: timestampMs("locked_at"),
  lockedBy: text("locked_by"),
  createdAt: timestampMs("created_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
  finishedAt: timestampMs("finished_at"),
  startedAt: timestampMs("started_at"),
})

export const dataRefreshLog = sqliteTable("data_refresh_log", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  steamid: text("steamid"),
  source: text("source").notNull(),
  status: text("status").notNull(),
  message: text("message"),
  startedAt: timestampMs("started_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
  finishedAt: timestampMs("finished_at"),
})

export const profileWishlist = sqliteTable(
  "profile_wishlist",
  {
    steamid: text("steamid")
      .notNull()
      .references(() => steamProfiles.steamid, { onDelete: "cascade" }),
    appid: integer("appid")
      .notNull()
      .references(() => steamGames.appid, { onDelete: "cascade" }),
    addedAt: timestampMs("added_at"),
    lastSyncedAt: timestampMs("last_synced_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
  },
  (t) => [primaryKey({ columns: [t.steamid, t.appid] })]
)

export const awacyCatalog = sqliteTable("awacy_catalog", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  steamAppid: integer("steam_appid"),
  status: text("status").notNull().default("Unknown"),
  anticheatNames: stringArray("anticheat_names"),
  notes: text("notes"),
  nativeLinux: integer("native_linux", { mode: "boolean" }),
  dateChanged: timestampMs("date_changed"),
  sourceUrl: text("source_url"),
  lastSyncedAt: timestampMs("last_synced_at")
    .notNull()
    .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
})

export const levvvelKernelCatalog = sqliteTable("levvvel_kernel_catalog", {
  normalizedName: text("normalized_name").primaryKey(),
  name: text("name").notNull(),
  anticheatNames: stringArray("anticheat_names"),
  developer: text("developer"),
  publisher: text("publisher"),
  lastSyncedAt: timestampMs("last_synced_at")
    .notNull()
    .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
})

export const anticheatCatalogMeta = sqliteTable("anticheat_catalog_meta", {
  source: text("source").primaryKey(),
  rowCount: integer("row_count").notNull().default(0),
  complete: integer("complete", { mode: "boolean" }).notNull().default(false),
  errorMessage: text("error_message"),
  lastSyncedAt: timestampMs("last_synced_at"),
})

export const denuvoAntiTamperCatalog = sqliteTable("denuvo_anti_tamper_catalog", {
  appid: integer("appid").primaryKey(),
  lastSyncedAt: timestampMs("last_synced_at")
    .notNull()
    .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
})

export const seedHydrationMeta = sqliteTable("seed_hydration_meta", {
  id: text("id").primaryKey().default("default"),
  manifestVersion: integer("manifest_version").notNull(),
  manifestGeneratedAt: text("manifest_generated_at"),
  hydratedAt: timestampMs("hydrated_at").notNull(),
  insertedCount: integer("inserted_count").notNull().default(0),
  updatedCount: integer("updated_count").notNull().default(0),
  skippedCount: integer("skipped_count").notNull().default(0),
})

export const profileGameAchievements = sqliteTable(
  "profile_game_achievements",
  {
    steamid: text("steamid").notNull(),
    appid: integer("appid")
      .notNull()
      .references(() => steamGames.appid, { onDelete: "cascade" }),
    unlockedCount: integer("unlocked_count").notNull().default(0),
    totalCount: integer("total_count").notNull().default(0),
    completionPercent: integer("completion_percent").notNull().default(0),
    hasAchievements: integer("has_achievements", { mode: "boolean" })
      .notNull()
      .default(false),
    lastCheckedAt: timestampMs("last_checked_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
    createdAt: timestampMs("created_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
    updatedAt: timestampMs("updated_at").default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
  },
  (t) => [primaryKey({ columns: [t.steamid, t.appid] })]
)

export const schema = {
  steamProfiles,
  steamGames,
  profileGames,
  steamAppDetails,
  howlongtobeatEntries,
  anticheatEntries,
  protondbEntries,
  enrichmentJobs,
  dataRefreshLog,
  profileWishlist,
  awacyCatalog,
  levvvelKernelCatalog,
  anticheatCatalogMeta,
  denuvoAntiTamperCatalog,
  seedHydrationMeta,
  profileGameAchievements,
}

export type AppDatabase = typeof schema
