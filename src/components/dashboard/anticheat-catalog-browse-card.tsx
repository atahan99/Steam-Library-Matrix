"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AnticheatCatalogTable } from "@/components/tables/anticheat-catalog-table"

export const AnticheatCatalogBrowseCard = () => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="text-base">Browse anti-cheat catalogs</CardTitle>
        <p className="text-sm text-muted-foreground">
          Search AWACY, Levvvel kernel, and Denuvo Anti-Tamper lists synced into
          the database. Use catalog sync above when tables are empty.
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        <AnticheatCatalogTable />
      </CardContent>
    </Card>
  )
}
