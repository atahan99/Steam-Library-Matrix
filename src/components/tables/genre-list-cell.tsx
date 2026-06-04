import { parseGenreLabels } from "@/lib/utils/genre-label"

type GenreListCellProps = {
  genres?: unknown[]
}

export const GenreListCell = ({ genres }: GenreListCellProps) => {
  const labels = parseGenreLabels(genres)

  if (!labels.length) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <ul className="flex list-none flex-col gap-0.5">
      {labels.map((label) => (
        <li key={label} className="text-sm leading-snug">
          {label}
        </li>
      ))}
    </ul>
  )
}
