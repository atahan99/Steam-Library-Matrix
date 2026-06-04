import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export const tableFilterLabelClassName =
  "block text-center text-xs font-medium leading-none text-muted-foreground"

export const tableFilterFieldClassName = "flex min-w-[9rem] flex-col gap-1"

type TableFilterFieldProps = {
  label: string
  htmlFor?: string
  className?: string
  children: ReactNode
}

export const TableFilterField = ({
  label,
  htmlFor,
  className,
  children,
}: TableFilterFieldProps) => {
  return (
    <div className={cn(tableFilterFieldClassName, className)}>
      <label htmlFor={htmlFor} className={tableFilterLabelClassName}>
        {label}
      </label>
      <div className="w-full min-w-0">{children}</div>
    </div>
  )
}

type TableFilterSpacerProps = {
  className?: string
  children: ReactNode
}

/** Aligns unlabeled controls (search, export) with labeled filter dropdowns. */
export const TableFilterSpacer = ({
  className,
  children,
}: TableFilterSpacerProps) => {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span
        className="block text-xs leading-none invisible select-none"
        aria-hidden="true"
      >
        &nbsp;
      </span>
      <div className="flex min-h-8 items-center">{children}</div>
    </div>
  )
}
