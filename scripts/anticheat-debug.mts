import { printAntiCheatDebug } from "../src/lib/anticheat/anticheatDebug.ts"

const args = process.argv.slice(2)
const refresh = args.includes("--refresh")
const positional = args.filter((a) => a !== "--refresh")

if (!positional.length) {
  console.error(
    'Usage: npx tsx scripts/anticheat-debug.mts [--refresh] "<game name>" [steamAppId]'
  )
  process.exit(1)
}

const gameName = positional[0]
const steamAppId = positional[1] ? Number(positional[1]) : undefined

await printAntiCheatDebug(
  gameName,
  Number.isFinite(steamAppId) ? steamAppId : undefined,
  refresh
)
