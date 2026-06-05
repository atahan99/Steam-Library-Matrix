#!/usr/bin/env tsx
import { closeDb } from "@/lib/db/client"
import { waitForSteamStoreRequestSlot } from "@/lib/steam/steam-store-fetch"

const main = async () => {
  const id = process.argv[2] ?? "?"
  const n = Number.parseInt(process.argv[3] ?? "3", 10)
  const times: number[] = []

  for (let i = 0; i < n; i += 1) {
    const t0 = Date.now()
    await waitForSteamStoreRequestSlot()
    times.push(Date.now() - t0)
  }

  console.log(JSON.stringify({ worker: id, waits: times, at: Date.now() }))
  await closeDb()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
