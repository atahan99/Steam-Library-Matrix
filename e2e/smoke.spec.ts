import { expect, test } from "@playwright/test"

const DEMO = "/dashboard/76561190000000001"

const PAGES = [
  { path: "/", heading: /Your library, decoded/i },
  { path: "/about", heading: /Your Steam library in one place/i },
  { path: DEMO, heading: /Overview/i },
  { path: `${DEMO}/library`, heading: /Library/i },
  { path: `${DEMO}/random`, heading: /Backlog/i },
  { path: `${DEMO}/genres`, heading: /Genres/i },
  { path: `${DEMO}/howlongtobeat`, heading: /HowLongToBeat/i },
  { path: "/this-page-does-not-exist", heading: /Page not found/i, status: 404 },
]

// Images from Steam's CDN can fail in CI; those aren't app bugs.
const isIgnorable = (text: string) => text.startsWith("Failed to load resource")

for (const { path, heading, status = 200 } of PAGES) {
  test(`${path} renders without console errors`, async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`))
    page.on("console", (message) => {
      if (message.type() === "error" && !isIgnorable(message.text())) {
        errors.push(`console: ${message.text()}`)
      }
    })

    const response = await page.goto(path, { waitUntil: "networkidle" })
    expect(response?.status()).toBe(status)
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible()
    // CSP violations and React hydration errors (#418 etc.) land here.
    expect(errors).toEqual([])
  })
}
