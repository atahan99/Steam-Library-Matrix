import topAppids from "../../../data/seed/top-appids.json"
import { CoverImg } from "@/components/landing/cover-img"

const COLUMNS = 4
const PER_COLUMN = 7

// Evenly spaced picks across the bundled top sellers, so columns mix eras and genres.
const picks = (() => {
  const all = topAppids.appids
  const count = COLUMNS * PER_COLUMN
  return Array.from({ length: count }, (_, i) => all[Math.floor((i * all.length) / count)]!)
})()

/** Slowly scrolling portrait covers at the far left and right of the landing page (decorative). */
export const CoverColumns = () => (
  <div className="cover-columns pointer-events-none absolute inset-0" aria-hidden>
    {Array.from({ length: COLUMNS }, (_, column) => {
      const covers = picks.slice(column * PER_COLUMN, (column + 1) * PER_COLUMN)
      return (
        <div key={column} className="cover-columns__col" data-col={column}>
          {/* Two identical copies so translating by -50% loops seamlessly. */}
          <div className="cover-columns__track">
            {[...covers, ...covers].map((appid, i) => (
              <CoverImg key={`${appid}-${i}`} appid={appid} />
            ))}
          </div>
        </div>
      )
    })}
  </div>
)
