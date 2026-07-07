"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ModernDownloadButton } from "@/components/ui/modern-download-button"
import {
  downloadCsv,
  downloadJson,
  type ExportRow,
} from "@/lib/utils/export-table-csv"

type TableExportMenuProps = {
  filename: string
  headers: string[]
  rows: ExportRow[]
  disabled?: boolean
}

const splitFilename = (filename: string) => {
  const dotIndex = filename.lastIndexOf(".")
  if (dotIndex <= 0) {
    return { base: filename, extension: "" }
  }
  return {
    base: filename.slice(0, dotIndex),
    extension: filename.slice(dotIndex),
  }
}

export const TableExportMenu = ({
  filename,
  headers,
  rows,
  disabled = false,
}: TableExportMenuProps) => {
  const isEmpty = rows.length === 0
  const isDisabled = disabled || isEmpty
  const { base } = splitFilename(filename)

  const handleExportCsv = () => {
    downloadCsv(`${base}.csv`, headers, rows)
  }

  const handleExportJson = () => {
    downloadJson(`${base}.json`, headers, rows)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isDisabled}
        render={
          <ModernDownloadButton
            aria-label="Export filtered table"
            aria-haspopup="menu"
            disabled={isDisabled}
          />
        }
      />
      <DropdownMenuContent align="start" className="min-w-[10rem]">
        <DropdownMenuItem onClick={handleExportCsv}>
          Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJson}>
          Export JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
