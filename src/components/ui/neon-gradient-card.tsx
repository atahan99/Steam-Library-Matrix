"use client"

import {
  CSSProperties,
  ReactElement,
  ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

import { cn } from "@/lib/utils"

interface NeonColorsProps {
  firstColor: string
  secondColor: string
}

interface NeonGradientCardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: ReactElement
  className?: string
  children?: ReactNode
  borderSize?: number
  borderRadius?: number
  neonColors?: NeonColorsProps
}

export const NeonGradientCard: React.FC<NeonGradientCardProps> = ({
  className,
  children,
  borderSize = 2,
  borderRadius = 20,
  neonColors = {
    firstColor: "#ff00aa",
    secondColor: "#00FFF1",
  },
  ...props
}) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const element = contentRef.current
    if (!element) return

    const updateDimensions = () => {
      setDimensions({
        width: element.offsetWidth,
        height: element.offsetHeight,
      })
    }

    updateDimensions()

    const observer = new ResizeObserver(updateDimensions)
    observer.observe(element)

    return () => observer.disconnect()
  }, [children])

  const glowWidth = dimensions.width + borderSize * 2
  const glowHeight = dimensions.height + borderSize * 2
  const glowBlur = Math.max(Math.round(dimensions.width / 3), 32)

  const neonStyle = {
    "--border-size": `${borderSize}px`,
    "--border-radius": `${borderRadius}px`,
    "--neon-first-color": neonColors.firstColor,
    "--neon-second-color": neonColors.secondColor,
    "--card-content-radius": `${borderRadius - borderSize}px`,
    "--pseudo-element-width": `${glowWidth}px`,
    "--pseudo-element-height": `${glowHeight}px`,
    "--after-blur": `${glowBlur}px`,
  } as CSSProperties

  return (
    <div
      className={cn("relative w-full overflow-visible", className)}
      {...props}
    >
      <div
        ref={contentRef}
        style={neonStyle}
        className={cn(
          "relative flex w-full flex-col gap-4 overflow-visible rounded-(--card-content-radius) bg-card py-4 text-card-foreground",
          "before:pointer-events-none before:absolute before:-top-(--border-size) before:-left-(--border-size) before:-z-10 before:block",
          "before:h-(--pseudo-element-height) before:w-(--pseudo-element-width) before:rounded-(--border-radius) before:content-['']",
          "before:bg-[linear-gradient(0deg,var(--neon-first-color),var(--neon-second-color))] before:bg-size-[100%_200%]",
          "before:animate-background-position-spin motion-reduce:before:animate-none",
          "after:pointer-events-none after:absolute after:-top-(--border-size) after:-left-(--border-size) after:-z-10 after:block",
          "after:h-(--pseudo-element-height) after:w-(--pseudo-element-width) after:rounded-(--border-radius) after:blur-(--after-blur) after:content-['']",
          "after:bg-[linear-gradient(0deg,var(--neon-first-color),var(--neon-second-color))] after:bg-size-[100%_200%] after:opacity-90",
          "after:animate-background-position-spin motion-reduce:after:animate-none motion-reduce:after:opacity-50",
          "wrap-break-word"
        )}
      >
        {children}
      </div>
    </div>
  )
}
