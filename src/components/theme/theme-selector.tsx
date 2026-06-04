"use client"

import { Palette } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { useAppTheme } from "@/components/theme/theme-provider"
import { THEMES, type ThemeId } from "@/lib/theme/themes"
import { cn } from "@/lib/utils"

const ThemeSwatch = ({
  primary,
  accent,
  className,
}: {
  primary: string
  accent: string
  className?: string
}) => (
  <span
    className={cn(
      "inline-flex size-3.5 shrink-0 overflow-hidden rounded-sm ring-1 ring-border",
      className
    )}
    aria-hidden
  >
    <span className="h-full w-1/2" style={{ background: primary }} />
    <span className="h-full w-1/2" style={{ background: accent }} />
  </span>
)

export const ThemeSelector = () => {
  const { themeId, theme, setThemeId } = useAppTheme()
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

  const handleValueChange = (value: unknown) => {
    if (typeof value !== "string") return
    setThemeId(value as ThemeId)
  }

  if (collapsed) {
    return (
      <SidebarMenuItem>
        <Select value={themeId} onValueChange={handleValueChange}>
          <SelectTrigger
            size="sm"
            aria-label="Theme"
            className="h-8 w-full border-sidebar-border bg-sidebar-accent/30 px-2"
          >
            <Palette className="size-4 shrink-0" />
          </SelectTrigger>
          <SelectContent align="start" side="right">
            {THEMES.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <span className="flex items-center gap-2">
                  <ThemeSwatch primary={t.primary} accent={t.accent} />
                  <span>{t.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem className="flex flex-col gap-1.5 px-0 py-1">
      <span className="px-2 text-xs text-muted-foreground">Theme</span>
      <Select value={themeId} onValueChange={handleValueChange}>
        <SelectTrigger
          size="sm"
          aria-label="Select theme"
          className="h-8 w-full border-sidebar-border bg-sidebar-accent/30"
        >
          <SelectValue>
            <span className="flex items-center gap-2">
              <ThemeSwatch primary={theme.primary} accent={theme.accent} />
              <span>{theme.label}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start" className="max-h-[min(20rem,70dvh)]">
          {THEMES.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              <span className="flex items-center gap-2">
                <ThemeSwatch primary={t.primary} accent={t.accent} />
                <span>{t.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SidebarMenuItem>
  )
}
