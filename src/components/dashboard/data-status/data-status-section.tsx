type DataStatusSectionProps = {
  title: string
  description?: string
  children: React.ReactNode
  fullWidth?: boolean
}

export const DataStatusSection = ({
  title,
  description,
  children,
  fullWidth = false,
}: DataStatusSectionProps) => {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div
        className={
          fullWidth
            ? "flex flex-col gap-4"
            : "grid gap-4 md:grid-cols-2"
        }
      >
        {children}
      </div>
    </section>
  )
}
