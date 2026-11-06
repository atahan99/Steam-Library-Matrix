"use client"

import { useState } from "react"
import topAppids from "../../../data/seed/top-appids.json"
import { dealCoverDeck, replaceFailedCover } from "@/lib/landing/cover-deck"
import { CoverImg } from "@/components/landing/cover-img"
import { useIsClient } from "@/hooks/use-is-client"

const COLUMNS = 4
// One copy of a column (8 covers ≈ 2100px) is taller than the screen, so the
// looping duplicate below never shows the same cover twice at once.
const PER_COLUMN = 8

/** Slowly scrolling, randomly picked portrait covers at the far left and right (decorative). */
export const CoverColumns = () => {
  // Random picks only exist in the browser, so the server render can't mismatch.
  const isClient = useIsClient()
  return isClient ? <ShuffledColumns /> : null
}

const ShuffledColumns = () => {
  const [deck, setDeck] = useState(() => dealCoverDeck(topAppids.appids, COLUMNS, PER_COLUMN))
  const onCoverError = (appid: number) => setDeck((d) => replaceFailedCover(d, appid))

  return (
    <div className="cover-columns pointer-events-none absolute inset-0" aria-hidden>
      {deck.columns.map((covers, column) => (
        <div key={column} className="cover-columns__col" data-col={column}>
          {/* Two identical copies so translating by -50% loops seamlessly. */}
          <div className="cover-columns__track">
            {[...covers, ...covers].map((appid, i) => (
              <CoverImg key={`${i < covers.length ? "a" : "b"}-${appid}`} appid={appid} onError={onCoverError} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
