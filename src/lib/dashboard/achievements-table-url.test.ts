import { describe, expect, it } from "vitest"
import { resolveAchievementsSortDir } from "@/lib/dashboard/achievements-table-url"

describe("resolveAchievementsSortDir", () => {
  it("defaults completion sort to desc so progress is visible first", () => {
    expect(resolveAchievementsSortDir("completion", null)).toBe("desc")
    expect(resolveAchievementsSortDir("unlocked", null)).toBe("desc")
    expect(resolveAchievementsSortDir("name", null)).toBe("asc")
  })

  it("honors an explicit dir query param", () => {
    expect(resolveAchievementsSortDir("completion", "asc")).toBe("asc")
    expect(resolveAchievementsSortDir("name", "desc")).toBe("desc")
  })
})
