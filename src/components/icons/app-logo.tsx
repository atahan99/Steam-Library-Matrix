import { cn } from "@/lib/utils"

export const AppLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("size-8 shrink-0", className)}
    aria-hidden
  >
    <rect x="4" y="4" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.35" />
    <rect x="12.5" y="4" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.55" />
    <rect x="21" y="4" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.35" />
    <rect x="4" y="12.5" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.55" />
    <rect x="12.5" y="12.5" width="7" height="7" rx="1.5" fill="currentColor" />
    <rect x="21" y="12.5" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.55" />
    <rect x="4" y="21" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.35" />
    <rect x="12.5" y="21" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.55" />
    <rect x="21" y="21" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.35" />
  </svg>
)
