export type ExportCellValue = string | number | boolean | null | undefined

export type ExportRow = ExportCellValue[]

const escapeCell = (value: ExportCellValue): string => {
  const text = value == null ? "" : String(value)
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export const buildCsvContent = (
  headers: string[],
  rows: ExportRow[]
): string => {
  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ]
  return lines.join("\n")
}

export const buildJsonContent = (
  headers: string[],
  rows: ExportRow[]
): string => {
  const data = rows.map((row) =>
    Object.fromEntries(
      headers.map((header, index) => [header, row[index] ?? null])
    )
  )
  return JSON.stringify(data, null, 2)
}

const downloadBlob = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export const downloadCsv = (
  filename: string,
  headers: string[],
  rows: ExportRow[]
) => {
  const content = buildCsvContent(headers, rows)
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
  downloadBlob(filename, blob)
}

export const downloadJson = (
  filename: string,
  headers: string[],
  rows: ExportRow[]
) => {
  const content = buildJsonContent(headers, rows)
  const blob = new Blob([content], { type: "application/json;charset=utf-8" })
  downloadBlob(filename, blob)
}
