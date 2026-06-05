"use client"

// Adapted from Sera UI NexusOrb — https://seraui.com/docs/orbits

import Link from "next/link"
import { useState } from "react"
import { LibraryOrbitIcon } from "@/components/visual/library-orbit-icon"
import {
  libraryOrbitCenter,
  libraryOrbitNodes,
} from "@/content/library-orbit"
import { cn } from "@/lib/utils"

type IconWrapperProps = {
  children: React.ReactNode
  className?: string
  isHighlighted?: boolean
  isHovered?: boolean
  animationDelay?: number
}

const IconWrapper = ({
  children,
  className = "",
  isHighlighted = false,
  isHovered = false,
  animationDelay = 0,
}: IconWrapperProps) => (
  <div
    className={cn(
      "flex items-center justify-center rounded-2xl backdrop-blur-xl transition-all duration-300",
      isHighlighted
        ? "animate-orbit-breathing-glow border border-primary/50 bg-background/60 shadow-lg shadow-primary/20 motion-reduce:animate-none"
        : cn(
            "border border-border/60 bg-background/40 dark:bg-white/5",
            !isHovered && "animate-orbit-float motion-reduce:animate-none"
          ),
      isHovered
        ? "scale-110 border-primary/60 bg-background/60 shadow-lg shadow-primary/30"
        : "hover:border-primary/30 hover:bg-background/60 dark:hover:bg-white/10",
      className
    )}
    style={{ animationDelay: `${animationDelay}s` }}
  >
    {children}
  </div>
)

const IconGrid = () => {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const outerIcons = libraryOrbitNodes.map((node) => ({
    id: node.id,
    label: node.label,
    url: node.url,
    component: <LibraryOrbitIcon icon={node.icon} className="size-12" />,
  }))

  const radius = 160
  const centralIconRadius = 48
  const outerIconRadius = 40
  const svgSize = 380
  const svgCenter = svgSize / 2
  const nodeCount = outerIcons.length
  const angleStep = 360 / nodeCount
  const getAngleInDegrees = (index: number) => -150 + index * angleStep

  return (
    <div className="relative h-[380px] w-[380px] scale-75 md:scale-100">
      <svg
        width={svgSize}
        height={svgSize}
        className="absolute top-0 left-0"
        aria-hidden
      >
        <g>
          {outerIcons.map((icon, i) => {
            const angleInDegrees = getAngleInDegrees(i)
            const angleInRadians = angleInDegrees * (Math.PI / 180)

            const startX =
              svgCenter + centralIconRadius * Math.cos(angleInRadians)
            const startY =
              svgCenter + centralIconRadius * Math.sin(angleInRadians)
            const endX =
              svgCenter + (radius - outerIconRadius) * Math.cos(angleInRadians)
            const endY =
              svgCenter + (radius - outerIconRadius) * Math.sin(angleInRadians)

            return (
              <line
                key={`line-${icon.id}`}
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                strokeWidth="2"
                className={cn(
                  "stroke-muted-foreground/40 transition-all duration-300",
                  hoveredId === icon.id && "stroke-primary opacity-100"
                )}
                style={{
                  opacity: hoveredId === icon.id ? 1 : 0.3,
                }}
              />
            )
          })}
        </g>
      </svg>

      <div className="absolute top-1/2 left-1/2">
        <div className="absolute z-10 -translate-x-1/2 -translate-y-1/2">
          <Link
            href={libraryOrbitCenter.url}
            aria-label={libraryOrbitCenter.label}
            className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onMouseEnter={() => setHoveredId("center")}
            onMouseLeave={() => setHoveredId(null)}
            onFocus={() => setHoveredId("center")}
            onBlur={() => setHoveredId(null)}
          >
            <IconWrapper
              className="h-24 w-24"
              isHighlighted
              isHovered={hoveredId === "center"}
              animationDelay={0}
            >
              <LibraryOrbitIcon
                icon={libraryOrbitCenter.icon}
                className="size-14"
              />
            </IconWrapper>
          </Link>
        </div>

        {outerIcons.map((icon, i) => {
          const angleInDegrees = getAngleInDegrees(i)
          const angleInRadians = angleInDegrees * (Math.PI / 180)
          const x = radius * Math.cos(angleInRadians)
          const y = radius * Math.sin(angleInRadians)

          return (
            <div
              key={icon.id}
              className="absolute z-10"
              style={{ transform: `translate(${x}px, ${y}px)` }}
              onMouseEnter={() => setHoveredId(icon.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="-translate-x-1/2 -translate-y-1/2">
                <a
                  href={icon.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${icon.label} (opens in new tab)`}
                  className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onFocus={() => setHoveredId(icon.id)}
                  onBlur={() => setHoveredId(null)}
                >
                  <IconWrapper
                    className="h-20 w-20"
                    isHovered={hoveredId === icon.id}
                    animationDelay={i * 0.2}
                  >
                    {icon.component}
                  </IconWrapper>
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type LibraryOrbitProps = {
  variant?: "landing" | "about"
  className?: string
}

export const LibraryOrbit = ({
  variant = "landing",
  className,
}: LibraryOrbitProps) => {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        variant === "about" && "scale-[0.55] md:scale-75",
        className
      )}
      role="img"
      aria-label="Steam Library Matrix at the center, connected to Steam Store, ProtonDB, HowLongToBeat, anti-cheat sources, SteamDB, Levvvel, and Steam Deck"
    >
      <IconGrid />
    </div>
  )
}
