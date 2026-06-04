import { closeDb } from "@/lib/db/client"
import { runMigrations } from "@/lib/db/migrate"

const main = async () => {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required")
    process.exit(1)
  }
  await runMigrations()
  await closeDb()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
