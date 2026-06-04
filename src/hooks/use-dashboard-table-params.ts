"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { mergeSearchParams } from "@/lib/dashboard/table-url-params"

export const useDashboardTableParams = <T extends Record<string, unknown>>(
  parse: (params: URLSearchParams) => T,
  serialize: (state: T) => Record<string, string | undefined>
) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const serializeRef = useRef(serialize)
  serializeRef.current = serialize

  const initial = useMemo(
    () => parse(searchParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init from URL once per mount
    []
  )

  const [state, setState] = useState<T>(initial)

  const setParams = useCallback((patch: Partial<T>) => {
    setState((prev) => ({ ...prev, ...patch } as T))
  }, [])

  useEffect(() => {
    const merged = mergeSearchParams(
      searchParams,
      serializeRef.current(state)
    )
    const query = merged.toString()
    const target = query ? `${pathname}?${query}` : pathname
    const current = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname
    if (target !== current) {
      router.replace(target, { scroll: false })
    }
  }, [state, pathname, router, searchParams])

  return [state, setParams] as const
}
