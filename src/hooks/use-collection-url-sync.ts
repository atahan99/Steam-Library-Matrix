"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  useDashboardCollection,
  type DashboardCollection,
} from "@/components/dashboard/dashboard-context"
import { mergeSearchParams } from "@/lib/dashboard/table-url-params"

const parseCollection = (value: string | null): DashboardCollection | null => {
  if (value === "library" || value === "wishlist") return value
  return null
}

export const useCollectionUrlSync = () => {
  const { collection, setCollection } = useDashboardCollection()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const hydrated = useRef(false)

  useEffect(() => {
    const fromUrl = parseCollection(searchParams.get("collection"))
    if (!hydrated.current) {
      hydrated.current = true
      if (fromUrl && fromUrl !== collection) {
        setCollection(fromUrl)
      }
      return
    }
    const merged = mergeSearchParams(searchParams, {
      collection: collection === "library" ? undefined : collection,
    })
    const query = merged.toString()
    const target = query ? `${pathname}?${query}` : pathname
    const current = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname
    if (target !== current) {
      router.replace(target, { scroll: false })
    }
  }, [collection, pathname, router, searchParams, setCollection])
}
