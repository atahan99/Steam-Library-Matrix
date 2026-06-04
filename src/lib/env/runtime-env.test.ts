import { describe, expect, it, beforeEach } from "vitest"
import {
  markInNextRequestScopeForTests,
  nextFetchInit,
  resetServerEnvScopeForTests,
} from "@/lib/env/runtime-env"

describe("nextFetchInit", () => {
  beforeEach(() => {
    resetServerEnvScopeForTests()
    delete process.env.SLM_CLI
  })

  it("omits Next cache options in CLI context", () => {
    process.env.SLM_CLI = "1"
    expect(nextFetchInit(0)).toEqual({})
  })

  it("omits Next cache options when request scope is known false", () => {
    resetServerEnvScopeForTests()
    process.env.SLM_CLI = "1"
    expect(nextFetchInit(3600)).toEqual({})
  })

  it("uses revalidate when request scope is known true", () => {
    markInNextRequestScopeForTests(true)
    expect(nextFetchInit(120)).toEqual({ next: { revalidate: 120 } })
  })
})
