/** 3×3 matrix marks shared by AppLogo and favicon assets. */
export const APP_LOGO_RECTS = [
  { x: 4, y: 4, opacity: 0.35 },
  { x: 12.5, y: 4, opacity: 0.55 },
  { x: 21, y: 4, opacity: 0.35 },
  { x: 4, y: 12.5, opacity: 0.55 },
  { x: 12.5, y: 12.5, opacity: 1 },
  { x: 21, y: 12.5, opacity: 0.55 },
  { x: 4, y: 21, opacity: 0.35 },
  { x: 12.5, y: 21, opacity: 0.55 },
  { x: 21, y: 21, opacity: 0.35 },
] as const

/** Dark-theme `--primary` (oklch 0.72 0.31 341) for static favicon assets. */
export const APP_LOGO_BRAND_FILL = "#e879f9"

/** Keep `src/app/icon.svg` and `src/app/apple-icon.svg` in sync when editing rects. */
export const APP_LOGO_VIEWBOX = "0 0 32 32"
