import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type PageIntroProps = {
  title: ReactNode
  description: string
  className?: string
}

export const PageIntro = ({ title, description, className }: PageIntroProps) => (
  <div className={cn("flex flex-col gap-4", className)}>
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  </div>
)
