import { describe, expect, it } from "vitest"
import { shouldApplySeedDenuvoRow } from "@/lib/seed/upsert-rules"

describe("shouldApplySeedDenuvoRow", () => {
  it("applies when no existing row", () => {
    expect(
      shouldApplySeedDenuvoRow(null, {
        hasDenuvoAntiTamper: true,
        confidence: "high",
        source: "seed",
        checkedAt: "2026-06-05T00:00:00.000Z",
      })
    ).toBe(true)
  })

  it("skips when live data is newer", () => {
    expect(
      shouldApplySeedDenuvoRow(
        {
          denuvoAntiTamper: true,
          denuvoConfidence: "high",
          denuvoSource: "store_page",
          denuvoCheckedAt: new Date("2026-06-10T00:00:00.000Z"),
        },
        {
          hasDenuvoAntiTamper: true,
          confidence: "high",
          source: "seed",
          checkedAt: "2026-06-05T00:00:00.000Z",
        }
      )
    ).toBe(false)
  })

  it("skips when live high confidence beats seed medium at same time", () => {
    expect(
      shouldApplySeedDenuvoRow(
        {
          denuvoAntiTamper: true,
          denuvoConfidence: "high",
          denuvoSource: "store_page",
          denuvoCheckedAt: new Date("2026-06-05T00:00:00.000Z"),
        },
        {
          hasDenuvoAntiTamper: true,
          confidence: "medium",
          source: "seed",
          checkedAt: "2026-06-05T00:00:00.000Z",
        }
      )
    ).toBe(false)
  })
})
