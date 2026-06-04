"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { DashboardNavIcon } from "@/components/dashboard/dashboard-nav-icon"
import {
  dashboardFooterNavItems,
  dashboardSectionNavItems,
  type DashboardNavItem,
} from "@/lib/dashboard/dashboard-nav"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { AppLogo } from "@/components/icons/app-logo"
import { ThemeSelector } from "@/components/theme/theme-selector"
import { clearActiveSteamid } from "@/lib/session/active-profile"
import { cn } from "@/lib/utils"

const renderNavItems = (
  items: DashboardNavItem[],
  base: string,
  pathname: string
) =>
  items.map((item) => {
    const href = item.segment === "" ? base : `${base}/${item.segment}`
    const isActive =
      item.segment === "" ? pathname === base : pathname.startsWith(href)

    return (
      <SidebarMenuItem key={item.segment || "overview"}>
        <SidebarMenuButton
          render={<Link href={href} />}
          isActive={isActive}
          tooltip={item.title}
          className={cn(
            isActive &&
              "sidebar-nav-active bg-sidebar-accent text-sidebar-accent-foreground"
          )}
        >
          <DashboardNavIcon item={item} />
          <span>{item.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  })

export const DashboardSidebar = ({ steamid }: { steamid: string }) => {
  const pathname = usePathname()
  const router = useRouter()
  const base = `/dashboard/${steamid}`

  const handleLogout = () => {
    clearActiveSteamid()
    router.push("/")
  }

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="h-(--header-height) items-center justify-center border-b border-sidebar-border p-4">
        <Link
          href={base}
          aria-label="Steam Library Matrix home"
          className="flex items-center justify-center rounded-md outline-hidden ring-sidebar-ring transition-opacity hover:opacity-80 focus-visible:ring-2"
        >
          <AppLogo className="text-primary" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="flex-1">
          <SidebarGroupLabel>Sections</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderNavItems(dashboardSectionNavItems, base, pathname)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarMenu className="p-2">
          <ThemeSelector />
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Switch profile">
              <LogOut />
              <span>Switch profile</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {renderNavItems(dashboardFooterNavItems, base, pathname)}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="min-h-12 border-t border-sidebar-border" />
    </Sidebar>
  )
}
