"use client"

import type { ReactNode } from "react"
import {
  CollectionToggle,
  WishlistEmptyHint,
} from "@/components/tables/collection-toggle"
import { TableFilterSpacer } from "@/components/tables/table-filter-field"
import { TableGameSearchInput } from "@/components/tables/table-game-search-input"
import { TableExportMenu } from "@/components/tables/table-export-button"
import type { ExportRow } from "@/lib/utils/export-table-csv"

type TableUrlSetter = (updates: Record<string, unknown>) => void

export const createTableSearchHandlers = (setUrl: TableUrlSetter) => ({
  onChange: (next: string) => setUrl({ q: next, game: undefined, page: 1 }),
  onClearPinned: () => setUrl({ q: "", game: undefined, page: 1 }),
})

type TableSearchExportBarProps = {
  search: string
  pinnedGameAppid?: number
  onChange: (next: string) => void
  onClearPinned: () => void
  placeholder?: string
  ariaLabel?: string
  exportFilename: string
  exportHeaders: string[]
  exportRows: ExportRow[]
}

export const TableSearchExportBar = ({
  search,
  pinnedGameAppid,
  onChange,
  onClearPinned,
  placeholder,
  ariaLabel,
  exportFilename,
  exportHeaders,
  exportRows,
}: TableSearchExportBarProps) => (
  <div className="flex flex-wrap items-start gap-3">
    <TableFilterSpacer className="w-full max-w-sm">
      <TableGameSearchInput
        value={search}
        pinnedGameAppid={pinnedGameAppid}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={onChange}
        onClearPinned={onClearPinned}
      />
    </TableFilterSpacer>
    <TableFilterSpacer>
      <TableExportMenu
        filename={exportFilename}
        headers={exportHeaders}
        rows={exportRows}
      />
    </TableFilterSpacer>
  </div>
)

type TableFilterToolbarProps = {
  searchRow: ReactNode
  filterRow?: ReactNode
  hideCollectionToggle?: boolean
}

export const TableFilterToolbar = ({
  searchRow,
  filterRow,
  hideCollectionToggle,
}: TableFilterToolbarProps) => (
  <>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {searchRow}
        {filterRow}
      </div>
      {hideCollectionToggle ? null : <CollectionToggle />}
    </div>
    {hideCollectionToggle ? null : <WishlistEmptyHint />}
  </>
)
