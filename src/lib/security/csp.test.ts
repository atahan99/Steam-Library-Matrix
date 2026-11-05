import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  buildContentSecurityPolicy,
  SONNER_STYLE_HASHES,
} from "@/lib/security/csp"

describe("buildContentSecurityPolicy", () => {
  it("uses nonce and strict-dynamic in production without unsafe-inline on scripts", () => {
    const csp = buildContentSecurityPolicy("abc123", { isDev: false })
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'")
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/)
    expect(csp).not.toContain("unsafe-eval")
    expect(csp).toContain("style-src 'self' 'nonce-abc123'")
    expect(csp).toContain("style-src-attr 'unsafe-inline'")
    // plain-HTTP LAN access must not have assets upgraded to https
    expect(csp).not.toContain("upgrade-insecure-requests")
  })

  it("allowlists the exact style hashes the installed sonner injects", () => {
    const sha = (text: string) =>
      `sha256-${createHash("sha256").update(text).digest("base64")}`
    const bundle = readFileSync(
      join(process.cwd(), "node_modules/sonner/dist/index.mjs"),
      "utf8"
    )
    const match = bundle.match(/__insertCSS\("((?:[^"\\]|\\.)*)"\)/)
    expect(match, "sonner no longer injects CSS via __insertCSS").toBeTruthy()
    const css = JSON.parse(`"${match![1]}"`) as string
    expect(SONNER_STYLE_HASHES).toEqual([sha(""), sha(css)])
  })

  it("allows unsafe-eval and unsafe-inline styles in development", () => {
    const csp = buildContentSecurityPolicy("devnonce", { isDev: true })
    expect(csp).toContain("'unsafe-eval'")
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
  })
})
