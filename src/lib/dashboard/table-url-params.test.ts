import { describe, expect, it } from "vitest"
import {
  mergeSearchParams,
  parseCommaList,
  parseLibraryPlayFilter,
  parsePage,
  parsePinnedGameAppid,
  serializeCommaList,
  serializePinnedGameAppid,
} from "@/lib/dashboard/table-url-params"

describe("table-url-params", () => {
  it("parses and serializes comma lists", () => {
    expect(parseCommaList("a,b, c")).toEqual(["a", "b", "c"])
    expect(serializeCommaList(["x", "y"])).toBe("x,y")
  })

  it("parses page with fallback", () => {
    expect(parsePage("3")).toBe(3)
    expect(parsePage(null)).toBe(1)
    expect(parsePage("bad")).toBe(1)
  })

  it("parses library play filter", () => {
    expect(parseLibraryPlayFilter("played")).toBe("played")
    expect(parseLibraryPlayFilter(null)).toBe("all")
  })

  it("parses and serializes pinned game appid", () => {
    expect(
      parsePinnedGameAppid(new URLSearchParams("game=1055540&q=A+Short+Hike"))
    ).toBe(1055540)
    expect(parsePinnedGameAppid(new URLSearchParams("game=0"))).toBeUndefined()
    expect(parsePinnedGameAppid(new URLSearchParams("game=bad"))).toBeUndefined()
    expect(parsePinnedGameAppid(new URLSearchParams())).toBeUndefined()
    expect(serializePinnedGameAppid(1055540)).toBe("1055540")
    expect(serializePinnedGameAppid(undefined)).toBeUndefined()
  })

  it("merges search params", () => {
    const merged = mergeSearchParams(new URLSearchParams("q=foo"), {
      q: "bar",
      page: "2",
      empty: undefined,
    })
    expect(merged.get("q")).toBe("bar")
    expect(merged.get("page")).toBe("2")
  })
})
