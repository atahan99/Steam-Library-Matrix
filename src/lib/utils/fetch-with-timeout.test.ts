import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fetchWithTimeout, getFetchTimeoutMs } from "@/lib/utils/fetch-with-timeout"

describe("fetchWithTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    delete process.env.SLM_FETCH_TIMEOUT_MS
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("aborts when the request exceeds the timeout", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(init.signal?.reason ?? new DOMException("Aborted", "AbortError"))
        })
      })
    })

    const promise = fetchWithTimeout("https://example.com/slow", undefined, 100)
    await vi.advanceTimersByTimeAsync(100)

    await expect(promise).rejects.toMatchObject({ name: "TimeoutError" })
  })

  it("respects a caller AbortSignal aborted before timeout", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(init.signal?.reason ?? new DOMException("Aborted", "AbortError"))
        })
      })
    })

    const controller = new AbortController()
    const promise = fetchWithTimeout(
      "https://example.com/cancelled",
      { signal: controller.signal },
      5000
    )
    controller.abort(new DOMException("Caller aborted", "AbortError"))

    await expect(promise).rejects.toMatchObject({ name: "AbortError" })
  })

  it("passes through headers and other init options", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok", { status: 200 })
    )

    await fetchWithTimeout("https://example.com/headers", {
      method: "POST",
      headers: { "X-Test": "1" },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/headers",
      expect.objectContaining({
        method: "POST",
        headers: { "X-Test": "1" },
        signal: expect.any(AbortSignal),
      })
    )
  })
})

describe("getFetchTimeoutMs", () => {
  afterEach(() => {
    delete process.env.SLM_FETCH_TIMEOUT_MS
  })

  it("defaults to 15000 when env is unset", () => {
    expect(getFetchTimeoutMs()).toBe(15_000)
  })

  it("reads SLM_FETCH_TIMEOUT_MS from process.env", () => {
    process.env.SLM_FETCH_TIMEOUT_MS = "25000"
    expect(getFetchTimeoutMs()).toBe(25_000)
  })
})
