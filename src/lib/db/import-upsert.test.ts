import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { beforeAll, describe, expect, it, vi } from "vitest"
import { schema } from "@/lib/db/schema"

const sqlite = new Database(":memory:")
const db = drizzle(sqlite, { schema })

vi.mock("@/lib/db/client", () => ({
  getRawSqlite: () => sqlite,
  getDb: () => db,
}))

const { runMigrations, MIGRATION_FILES_ORDERED } = await import(
  "@/lib/db/migrate"
)
const { upsertGames } = await import("@/lib/db/games")
const { upsertProfileGames } = await import("@/lib/db/profile-games")

const steamid = "76561198000000001"

describe("library import upserts", () => {
  beforeAll(async () => {
    vi.spyOn(console, "log").mockImplementation(() => {})
    await runMigrations()
    sqlite.prepare("insert into steam_profiles (steamid) values (?)").run(steamid)
  })

  it("records every migration", () => {
    const rows = sqlite.prepare("select filename from schema_migrations").all()
    expect(rows).toHaveLength(MIGRATION_FILES_ORDERED.length)
  })

  it("overwrites playtime and name on re-import, keeping icon when omitted", async () => {
    const first = {
      appid: 10,
      name: "Old Name",
      playtimeForever: 5,
      playtime2Weeks: 1,
      imgIconUrl: "iconhash",
    }
    await upsertGames([first])
    await upsertProfileGames(steamid, [first])

    const second = {
      appid: 10,
      name: "New Name",
      playtimeForever: 120,
      playtime2Weeks: 30,
    }
    await upsertGames([second])
    await upsertProfileGames(steamid, [second])

    expect(
      sqlite.prepare("select name, icon_url from steam_games where appid = 10").get()
    ).toEqual({
      name: "New Name",
      icon_url:
        "https://media.steampowered.com/steamcommunity/public/images/apps/10/iconhash.jpg",
    })
    expect(
      sqlite
        .prepare(
          "select playtime_forever_minutes, playtime_2weeks_minutes from profile_games where steamid = ? and appid = 10"
        )
        .get(steamid)
    ).toEqual({ playtime_forever_minutes: 120, playtime_2weeks_minutes: 30 })
  })
})
