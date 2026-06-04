import { APP_NAME } from "@/lib/brand"
import { cn } from "@/lib/utils"

type AppFooterProps = {
  className?: string
}

export const AppFooter = ({ className }: AppFooterProps) => {
  const year = new Date().getFullYear()

  return (
    <footer
      role="contentinfo"
      className={cn(
        "flex flex-col items-center justify-center gap-1 border-t border-border px-4 py-4 text-center text-xs text-muted-foreground md:px-6",
        className
      )}
    >
      <span className="font-medium text-foreground/90">{APP_NAME}</span>
      <span>© {year}</span>
    </footer>
  )
}
