import {
  APP_LOGO_RECTS,
  APP_LOGO_VIEWBOX,
} from "@/components/icons/app-logo-matrix"
import { cn } from "@/lib/utils"

export const AppLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox={APP_LOGO_VIEWBOX}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("size-8 shrink-0", className)}
    aria-hidden
  >
    {APP_LOGO_RECTS.map((rect, index) => (
      <rect
        key={index}
        x={rect.x}
        y={rect.y}
        width={7}
        height={7}
        rx={1.5}
        fill="currentColor"
        opacity={rect.opacity}
      />
    ))}
  </svg>
)
