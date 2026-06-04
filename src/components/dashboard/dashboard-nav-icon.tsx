"use client"

import type { DashboardNavItem } from "@/lib/dashboard/dashboard-nav"
import { BrandIcon } from "@/components/icons/brand-icon"

export const DashboardNavIcon = ({ item }: { item: DashboardNavItem }) => {
  if (item.brand) {
    return <BrandIcon brand={item.brand} className="size-4" />
  }

  const Icon = item.icon
  if (!Icon) return null

  return <Icon className="size-4 shrink-0" aria-hidden />
}
