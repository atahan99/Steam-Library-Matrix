import type { EnrichmentJobKind } from "@/lib/jobs/types"

const ENDPOINT_TO_KIND: Record<string, EnrichmentJobKind> = {
  "/api/enrich/protondb": "protondb",
  "/api/enrich/app-details": "app_details",
  "/api/enrich/achievements": "achievements",
  "/api/enrich/anticheat": "anticheat",
  "/api/enrich/howlongtobeat": "hltb",
  "/api/steam/wishlist-sync": "wishlist",
  "/api/anticheat/catalog-sync": "anticheat_catalog",
}

export const jobKindForEndpoint = (endpoint: string): EnrichmentJobKind | null => {
  const path = endpoint.split("?")[0]
  return ENDPOINT_TO_KIND[path] ?? null
}
