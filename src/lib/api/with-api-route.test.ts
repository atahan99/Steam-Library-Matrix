import { describe, expect, it } from "vitest"
import { NextResponse } from "next/server"
import { runApiRoute } from "@/lib/api/with-api-route"

const ok = async () => NextResponse.json({ ok: true })

const post = (headers: Record<string, string>): Request =>
  new Request("http://192.168.1.10:3001/api/test", { method: "POST", headers })

describe("runApiRoute origin check", () => {
  it("rejects cross-origin writes", async () => {
    const res = await runApiRoute(
      post({ origin: "https://evil.example", host: "192.168.1.10:3001" }),
      {},
      ok
    )
    expect(res.status).toBe(403)
  })

  it("rejects an opaque null origin", async () => {
    const res = await runApiRoute(post({ origin: "null" }), {}, ok)
    expect(res.status).toBe(403)
  })

  it("allows same-origin writes and requests without Origin", async () => {
    const same = await runApiRoute(
      post({ origin: "http://192.168.1.10:3001", host: "192.168.1.10:3001" }),
      {},
      ok
    )
    expect(same.status).toBe(200)
    expect((await runApiRoute(post({}), {}, ok)).status).toBe(200)
  })

  it("does not check GET requests", async () => {
    const req = new Request("http://localhost:3001/api/test", {
      headers: { origin: "https://evil.example" },
    })
    expect((await runApiRoute(req, {}, ok)).status).toBe(200)
  })
})
