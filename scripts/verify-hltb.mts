import {
  searchHltbGames,
  fetchHltbDetail,
  hoursToMinutes,
  computeAllStylesMinutes,
} from "../src/lib/enrichment/hltb-client.ts"
import {
  evaluateHltbDetailAcceptance,
  pickBestHltbHit,
  resolveHltbSearchQueries,
} from "../src/lib/enrichment/hltb-match.ts"

const tests = [
  { appid: 400, name: "Portal" },
  { appid: 688420, name: "Bad North: Jotunn Edition" },
  { appid: 7670, name: "BioShock" },
  { appid: 8930, name: "Sid Meier's Civilization V" },
  { appid: 16810, name: "Sid Meier's Civilization IV: Colonization" },
]

const main = async () => {
  for (const t of tests) {
    let match
    for (const query of resolveHltbSearchQueries(t.name)) {
      const hits = await searchHltbGames(query)
      match = pickBestHltbHit(hits, t.appid, t.name)
      if (match.ok) break
    }

    if (!match?.ok) {
      console.log(t.name, "MATCH FAIL", match)
      continue
    }

    const detail = await fetchHltbDetail(match.hit.gameId)
    const acceptance = evaluateHltbDetailAcceptance(t.appid, t.name, match, detail)

    const main = hoursToMinutes(detail.mainStoryHours)
    const extra = hoursToMinutes(detail.mainExtraHours)
    const comp = hoursToMinutes(detail.completionistHours)
    const all = computeAllStylesMinutes(main, extra, comp)

    console.log(
      JSON.stringify({
        game: t.name,
        hltbId: match.hit.gameId,
        matchConfidence: match.confidence,
        steamMatch: match.matchedBySteamId,
        detailSteam: detail.profileSteam,
        acceptance,
        main,
        extra,
        comp,
        all,
        matchedName: detail.gameName,
      })
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
