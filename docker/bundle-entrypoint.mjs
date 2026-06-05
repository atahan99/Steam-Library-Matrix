import { mkdirSync } from "node:fs"
import { build } from "esbuild"

const outdir = "dist/docker"
mkdirSync(outdir, { recursive: true })

const shared = {
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["better-sqlite3"],
  alias: {
    "@": "./src",
  },
}

const entries = [
  { in: "scripts/db-migrate.ts", out: `${outdir}/db-migrate.cjs` },
  {
    in: "scripts/bootstrap-anticheat-catalogs.ts",
    out: `${outdir}/bootstrap-anticheat-catalogs.cjs`,
  },
  {
    in: "scripts/hydrate-seed-data.ts",
    out: `${outdir}/hydrate-seed-data.cjs`,
  },
]

for (const entry of entries) {
  await build({
    ...shared,
    entryPoints: [entry.in],
    outfile: entry.out,
  })
  console.log(`[docker:bundle-entrypoint] wrote ${entry.out}`)
}
