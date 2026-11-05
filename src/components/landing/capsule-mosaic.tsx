import topAppids from "../../../data/seed/top-appids.json"
import { CapsuleImg } from "@/components/landing/capsule-img"

const COLUMNS = 8
const ROWS = 7

// Evenly spaced picks across the bundled top sellers, so the wall mixes eras and genres.
const pickAppids = (all: number[], count: number) =>
  Array.from({ length: count }, (_, i) => all[Math.floor((i * all.length) / count)]!)

/** Dimmed wall of real Steam capsule art behind the landing hero (decorative). */
export const CapsuleMosaic = () => (
  <div className="capsule-mosaic pointer-events-none absolute inset-0" aria-hidden>
    <div className="capsule-mosaic__grid">
      {pickAppids(topAppids.appids, COLUMNS * ROWS).map((appid) => (
        <CapsuleImg key={appid} appid={appid} />
      ))}
    </div>
  </div>
)
