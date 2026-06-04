import { describe, expect, it } from "vitest"
import {
  collectVrDeviceFilterOptions,
  gameMatchesVrDeviceFilter,
  getVrDeviceLabels,
  vrDeviceLabel,
} from "@/lib/utils/detect-vr-devices"

const beatSaberCategories = [
  { id: 52, description: "Tracked Controller Support" },
  { id: 54, description: "VR Only" },
  { id: 31, description: "VR Support" },
  { id: 40, description: "SteamVR Collectibles" },
]

describe("getVrDeviceLabels", () => {
  it("returns empty for missing categories", () => {
    expect(getVrDeviceLabels(undefined)).toEqual([])
  })

  it("normalizes VR Supported to VR Support", () => {
    expect(
      getVrDeviceLabels([{ description: "VR Supported" }])
    ).toEqual(["VR Support"])
  })

  it("maps known Steam VR category strings", () => {
    expect(getVrDeviceLabels(beatSaberCategories)).toEqual([
      "VR Support",
      "VR Only",
      "Tracked controllers",
      "SteamVR",
    ])
  })

  it("matches historical headset allowlist labels", () => {
    expect(
      getVrDeviceLabels([
        { description: "HTC Vive" },
        { description: "Oculus Rift" },
      ])
    ).toEqual(["HTC Vive", "Oculus Rift"])
  })
})

describe("collectVrDeviceFilterOptions", () => {
  it("returns sorted union across sources", () => {
    expect(
      collectVrDeviceFilterOptions([
        { categories: [{ description: "VR Only" }] },
        { categories: beatSaberCategories },
      ])
    ).toEqual([
      "VR Support",
      "VR Only",
      "Tracked controllers",
      "SteamVR",
    ])
  })
})

describe("gameMatchesVrDeviceFilter", () => {
  it("allows all games when nothing selected", () => {
    expect(gameMatchesVrDeviceFilter(beatSaberCategories, [])).toBe(true)
  })

  it("uses OR semantics across selected devices", () => {
    expect(
      gameMatchesVrDeviceFilter(beatSaberCategories, ["SteamVR", "HTC Vive"])
    ).toBe(true)
    expect(
      gameMatchesVrDeviceFilter(beatSaberCategories, ["HTC Vive"])
    ).toBe(false)
  })

  it("filters VR Only titles", () => {
    expect(
      gameMatchesVrDeviceFilter(beatSaberCategories, ["VR Only"])
    ).toBe(true)
    expect(
      gameMatchesVrDeviceFilter([{ description: "VR Support" }], ["VR Only"])
    ).toBe(false)
  })
})

describe("vrDeviceLabel", () => {
  it("returns em dash when empty", () => {
    expect(vrDeviceLabel(undefined)).toBe("—")
  })

  it("joins labels for table display", () => {
    expect(vrDeviceLabel(beatSaberCategories)).toBe(
      "VR Support, VR Only, Tracked controllers, SteamVR"
    )
  })
})
