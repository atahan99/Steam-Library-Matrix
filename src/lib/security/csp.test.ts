import { describe, expect, it } from "vitest"
import { buildContentSecurityPolicy } from "@/lib/security/csp"

describe("buildContentSecurityPolicy", () => {
  it("uses nonce and strict-dynamic in production without unsafe-inline on scripts", () => {
    const csp = buildContentSecurityPolicy("abc123", { isDev: false })
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'")
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/)
    expect(csp).not.toContain("unsafe-eval")
    expect(csp).toContain("style-src 'self' 'nonce-abc123'")
    expect(csp).toContain("style-src-attr 'unsafe-inline'")
  })

  it("allows unsafe-eval and unsafe-inline styles in development", () => {
    const csp = buildContentSecurityPolicy("devnonce", { isDev: true })
    expect(csp).toContain("'unsafe-eval'")
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
  })
})
