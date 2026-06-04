"use client"

import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

type ModernDownloadButtonProps = ComponentProps<"button"> & {
  label?: string
}

export const ModernDownloadButton = ({
  className,
  label = "Export",
  disabled,
  type = "button",
  ...props
}: ModernDownloadButtonProps) => {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "group/modern-download relative inline-flex h-8 shrink-0 items-center gap-2 overflow-hidden rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground shadow-xs transition-all duration-300",
        "hover:border-primary/40 hover:bg-muted/50 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        "dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        className
      )}
      {...props}
    >
      <span
        className="relative flex size-4 shrink-0 items-center justify-center"
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4 transition-transform duration-300 group-hover/modern-download:translate-y-0.5 group-disabled/modern-download:translate-y-0"
        >
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" className="opacity-70" />
        </svg>
      </span>
      <span className="truncate">{label}</span>
    </button>
  )
}
