import { checkSteamDenuvo } from "@/lib/steam/denuvo/check-steam-denuvo"

const APPIDS = [
  { appid: 990080, name: "Hogwarts Legacy" },
  { appid: 570, name: "Dota 2" },
  { appid: 1245620, name: "Elden Ring" },
  { appid: 1174180, name: "Red Dead Redemption 2" },
]

const run = async () => {
  console.log("\n=== checkSteamDenuvo live results ===\n")

  for (const { appid, name } of APPIDS) {
    const status = await checkSteamDenuvo(appid, {
      curatorAppids: new Set([990080]),
      curatorComplete: true,
    })

    console.log(`--- ${name} (${appid}) ---`)
    console.log(JSON.stringify(status, null, 2))
    console.log("")
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
