"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

export const TABLE_PAGE_SIZE_OPTIONS = [10, 20, 30] as const
export type TablePageSize = (typeof TABLE_PAGE_SIZE_OPTIONS)[number]

type TablePaginationFooterProps = {
  idPrefix: string
  filteredCount: number
  page: number
  pageSize: TablePageSize
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: TablePageSize) => void
}

export const TablePaginationFooter = ({
  idPrefix,
  filteredCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: TablePaginationFooterProps) => {
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize))
  const safePage = Math.min(page, totalPages)
  const rangeStart =
    filteredCount === 0 ? 0 : (safePage - 1) * pageSize + 1
  const rangeEnd =
    filteredCount === 0 ? 0 : Math.min(safePage * pageSize, filteredCount)

  const handlePageSizeChange = (value: string | null) => {
    const next = Number(value) as TablePageSize
    if (!TABLE_PAGE_SIZE_OPTIONS.includes(next)) return
    onPageSizeChange(next)
    onPageChange(1)
  }

  const selectId = `${idPrefix}-page-size`

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">
        {filteredCount === 0
          ? "0 of 0 row(s)"
          : `${rangeStart}–${rangeEnd} of ${filteredCount} row(s)`}
      </span>
      <div className="flex flex-wrap items-center gap-4 sm:justify-end">
        <div className="flex items-center gap-2">
          <Label
            htmlFor={selectId}
            className="text-sm font-normal text-muted-foreground"
          >
            Rows per page
          </Label>
          <Select
            value={String(pageSize)}
            onValueChange={(next) => handlePageSizeChange(next as string | null)}
          >
            <SelectTrigger id={selectId} className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABLE_PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground">
          Page {safePage} of {totalPages}
        </span>
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (safePage > 1) onPageChange(safePage - 1)
                }}
                className={
                  safePage <= 1 ? "pointer-events-none opacity-50" : undefined
                }
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (safePage < totalPages) onPageChange(safePage + 1)
                }}
                className={
                  safePage >= totalPages
                    ? "pointer-events-none opacity-50"
                    : undefined
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}

export const getSafeTablePage = (
  page: number,
  filteredCount: number,
  pageSize: number
): number => {
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize))
  return Math.min(page, totalPages)
}
