import { cn } from "@/lib/utils"

/** Library-spines mark; keep in sync with `src/app/icon.svg` (which adds the dark tile). */
export const AppLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("size-8 shrink-0", className)}
    aria-hidden
  >
    <rect x="6.5" y="9" width="4" height="15" rx="1.2" fill="#7dd3fc" />
    <rect x="12" y="6" width="4" height="18" rx="1.2" fill="#a5b4fc" />
    <rect x="17.5" y="11" width="4" height="13" rx="1.2" fill="#c4b5fd" />
    <rect
      x="21"
      y="8.5"
      width="4"
      height="15.5"
      rx="1.2"
      fill="#e879f9"
      transform="rotate(14 21 24)"
    />
    <rect x="5.5" y="25" width="21" height="1.6" rx="0.8" fill="#4c4569" />
  </svg>
)
