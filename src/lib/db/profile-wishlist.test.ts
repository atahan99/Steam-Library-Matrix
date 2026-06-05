import Database from "better-sqlite3"
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3"
import { eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { schema, type AppDatabase } from "@/lib/db/schema"
import {
  profileWishlist,
  steamAppDetails,
  steamGames,
  steamProfiles,
} from "@/lib/db/schema"

const WISHLIST_TABLES_SQL = `
  create table steam_profiles (
    steamid text primary key,
    persona_name text,
    avatar_url text,
    profile_url text,
    visibility_state integer,
    steam_level integer,
    account_created_at integer,
    country_code text,
    wishlist_last_synced_at integer,
    wishlist_sync_error text,
    last_synced_at integer,
    profile_token_hash text,
    profile_token_version integer not null default 0,
    profile_claimed_at integer,
    profile_token_rotated_at integer,
    openid_verified_at integer,
    created_at integer,
    updated_at integer
  );

  create table steam_games (
    appid integer primary key,
    name text not null,
    icon_url text,
    logo_url text,
    store_url text,
    created_at integer,
    updated_at integer
  );

  create table steam_app_details (
    appid integer primary key references steam_games(appid) on delete cascade,
    type text,
    short_description text,
    header_image text,
    website text,
    developers text,
    publishers text,
    platforms text,
    categories text,
    genres text,
    release_date text,
    metacritic text,
    recommendations text,
    steam_deck_compatibility text,
    last_checked_at integer,
    created_at integer,
    updated_at integer
  );

  create table profile_wishlist (
    steamid text not null references steam_profiles(steamid) on delete cascade,
    appid integer not null references steam_games(appid) on delete cascade,
    added_at integer,
    last_synced_at integer,
    primary key (steamid, appid)
  );
`

let sqlite: Database.Database
let db: BetterSQLite3Database<AppDatabase>

vi.mock("@/lib/db/client", () => ({
  getDb: () => db,
}))

import { syncProfileWishlist } from "@/lib/db/profile-wishlist"

const STEAMID = "76561198000000001"
const UNRELEASED_APPID = 2999990

beforeEach(() => {
  sqlite = new Database(":memory:")
  sqlite.pragma("foreign_keys = ON")
  sqlite.exec(WISHLIST_TABLES_SQL)
  db = drizzle(sqlite, { schema })
  db.insert(steamProfiles).values({ steamid: STEAMID }).run()
})

afterEach(() => {
  sqlite.close()
  vi.restoreAllMocks()
})

describe("syncProfileWishlist", () => {
  it("persists steam_games before steam_app_details for wishlist-only appids", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const items = [
      {
        appid: UNRELEASED_APPID,
        name: "Half-Life 3",
        addedAt: null,
      },
    ]
    const upsertMeta = [
      {
        appid: UNRELEASED_APPID,
        name: "Half-Life 3",
        logoUrl: "https://cdn.example/hl3.jpg",
      },
    ]
    const appDetailsToPersist = [
      {
        appid: UNRELEASED_APPID,
        name: "Half-Life 3",
        type: "game",
        shortDescription: "The next chapter.",
        steamDeckCompatibility: "verified" as const,
      },
    ]

    await syncProfileWishlist(STEAMID, items, upsertMeta, {
      appDetailsToPersist,
      deckOnlyToPersist: [],
    })

    expect(warnSpy).not.toHaveBeenCalled()

    const gameRows = await db
      .select()
      .from(steamGames)
      .where(eq(steamGames.appid, UNRELEASED_APPID))
    expect(gameRows).toHaveLength(1)
    expect(gameRows[0]?.name).toBe("Half-Life 3")

    const detailRows = await db
      .select()
      .from(steamAppDetails)
      .where(eq(steamAppDetails.appid, UNRELEASED_APPID))
    expect(detailRows).toHaveLength(1)
    expect(detailRows[0]?.steamDeckCompatibility).toBe("verified")
    expect(detailRows[0]?.shortDescription).toBe("The next chapter.")

    const wishlistRows = await db
      .select()
      .from(profileWishlist)
      .where(eq(profileWishlist.steamid, STEAMID))
    expect(wishlistRows).toHaveLength(1)
    expect(wishlistRows[0]?.appid).toBe(UNRELEASED_APPID)
  })

  it("upgrades placeholder steam_games names on re-sync", async () => {
    db.insert(steamGames)
      .values({
        appid: UNRELEASED_APPID,
        name: `App ${UNRELEASED_APPID}`,
        storeUrl: `https://store.steampowered.com/app/${UNRELEASED_APPID}`,
      })
      .run()

    await syncProfileWishlist(
      STEAMID,
      [{ appid: UNRELEASED_APPID, name: "Half-Life 3", addedAt: null }],
      [{ appid: UNRELEASED_APPID, name: "Half-Life 3" }],
      { appDetailsToPersist: [], deckOnlyToPersist: [] }
    )

    const gameRows = await db
      .select({ name: steamGames.name })
      .from(steamGames)
      .where(eq(steamGames.appid, UNRELEASED_APPID))
    expect(gameRows[0]?.name).toBe("Half-Life 3")
  })
})
