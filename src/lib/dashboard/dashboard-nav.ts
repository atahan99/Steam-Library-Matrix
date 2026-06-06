import {
  LayoutDashboard,
  Library,
  Users,
  Clock,
  Shield,
  Glasses,
  Layers,
  Database,
  BookOpen,
  type LucideIcon,
} from "lucide-react"
import type { BrandSlug } from "@/components/icons/brand-icon"

export type DashboardNavItem = {
  title: string
  segment: string
  icon?: LucideIcon
  brand?: BrandSlug
  /** Append ?q= when linking from a game detail popover */
  supportsGameSearch?: boolean
}

export const dashboardSectionNavItems: DashboardNavItem[] = [
  { title: "Overview", segment: "", icon: LayoutDashboard },
  {
    title: "Library",
    segment: "library",
    icon: Library,
    supportsGameSearch: true,
  },
  { title: "Compare", segment: "compare", icon: Users },
  {
    title: "HowLongToBeat",
    segment: "howlongtobeat",
    icon: Clock,
    supportsGameSearch: true,
  },
  {
    title: "Anti-Cheat",
    segment: "anticheat",
    icon: Shield,
    supportsGameSearch: true,
  },
  {
    title: "ProtonDB",
    segment: "protondb",
    brand: "protondb",
    supportsGameSearch: true,
  },
  {
    title: "Mac Support",
    segment: "mac",
    brand: "apple",
    supportsGameSearch: true,
  },
  {
    title: "VR",
    segment: "vr",
    icon: Glasses,
    supportsGameSearch: true,
  },
  { title: "Backlog", segment: "random", icon: Layers },
]

export const dashboardFooterNavItems: DashboardNavItem[] = [
  { title: "Data Status", segment: "data-status", icon: Database },
  { title: "About", segment: "about", icon: BookOpen },
]

export const dashboardTableNavItems: DashboardNavItem[] =
  dashboardSectionNavItems.filter((item) => item.supportsGameSearch)

export type DashboardGameNavContext = {
  name: string
  appid: number
}

export const buildDashboardNavHref = (
  steamid: string,
  item: DashboardNavItem,
  game?: DashboardGameNavContext
): string => {
  const base = `/dashboard/${steamid}`
  const path = item.segment === "" ? base : `${base}/${item.segment}`

  if (!item.supportsGameSearch || !game?.name?.trim() || !game.appid) {
    return path
  }

  const params = new URLSearchParams({
    q: game.name.trim(),
    game: String(game.appid),
  })
  return `${path}?${params.toString()}`
}
