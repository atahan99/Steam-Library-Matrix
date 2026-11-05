import topAppids from "../../../data/seed/top-appids.json"
import { CoverImg } from "@/components/landing/cover-img"

const COLUMNS = 4
// Spares per column so covers that 404 (tools, soundtracks) still leave the column full.
const PER_COLUMN = 7

// Evenly spaced picks across the bundled top sellers, so columns mix eras and genres.
const picks = (() => {
  const all = topAppids.appids
  const count = COLUMNS * PER_COLUMN
  return Array.from({ length: count }, (_, i) => all[Math.floor((i * all.length) / count)]!)
})()

/** Portrait game covers at the far left and right of the landing page (decorative). */
export const CoverColumns = () => (
  <div className="cover-columns pointer-events-none absolute inset-0" aria-hidden>
    {Array.from({ length: COLUMNS }, (_, column) => (
      <div key={column} className="cover-columns__col" data-col={column}>
        {picks.slice(column * PER_COLUMN, (column + 1) * PER_COLUMN).map((appid) => (
          <CoverImg key={appid} appid={appid} />
        ))}
      </div>
    ))}
  </div>
)
