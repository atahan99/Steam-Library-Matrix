import { describe, expect, it } from "vitest"
import {
  UTILITIES_FILTER_GENRE,
  collectLibraryGenreFilterOptions,
  gameMatchesGenreFilter,
  getLibraryFilterGenres,
  parseGenreLabels,
  sortGenreFilterOptions,
} from "@/lib/utils/genre-label"

describe("parseGenreLabels", () => {
  it("extracts Steam genre descriptions", () => {
    expect(
      parseGenreLabels([
        { id: "1", description: "Action" },
        { id: "2", description: "RPG" },
      ])
    ).toEqual(["Action", "RPG"])
  })
})

describe("getLibraryFilterGenres", () => {
  it("keeps only standard game genres", () => {
    expect(
      getLibraryFilterGenres({
        type: "game",
        genres: [{ description: "Action" }, { description: "Indie" }],
      })
    ).toEqual(["Action", "Indie"])
  })

  it("collapses software genres into Utilities", () => {
    expect(
      getLibraryFilterGenres({
        type: "game",
        genres: [
          { description: "Utilities" },
          { description: "Photo Editing" },
        ],
      })
    ).toEqual([UTILITIES_FILTER_GENRE])
  })

  it("marks non-game app types as Utilities", () => {
    expect(
      getLibraryFilterGenres({
        type: "application",
        genres: [{ description: "Strategy" }],
      })
    ).toEqual(["Strategy", UTILITIES_FILTER_GENRE])
  })
})

describe("collectLibraryGenreFilterOptions", () => {
  it("dedupes and sorts with Utilities last", () => {
    expect(
      collectLibraryGenreFilterOptions([
        { type: "game", genres: [{ description: "RPG" }] },
        {
          type: "game",
          genres: [{ description: "Utilities" }],
        },
        { type: "game", genres: [{ description: "Action" }] },
      ])
    ).toEqual(["Action", "RPG", UTILITIES_FILTER_GENRE])
  })

  it("sorts Utilities last explicitly", () => {
    expect(
      sortGenreFilterOptions(["Utilities", "Strategy", "Action"])
    ).toEqual(["Action", "Strategy", "Utilities"])
  })
})

describe("gameMatchesGenreFilter", () => {
  const source = {
    type: "game",
    genres: [{ description: "Action" }, { description: "Indie" }],
  }

  it("matches when no genres selected", () => {
    expect(gameMatchesGenreFilter(source, [])).toBe(true)
  })

  it("matches any selected genre", () => {
    expect(gameMatchesGenreFilter(source, ["RPG"])).toBe(false)
    expect(gameMatchesGenreFilter(source, ["Indie"])).toBe(true)
  })

  it("matches Utilities bucket", () => {
    expect(
      gameMatchesGenreFilter(
        { type: "game", genres: [{ description: "Photo Editing" }] },
        [UTILITIES_FILTER_GENRE]
      )
    ).toBe(true)
  })
})
