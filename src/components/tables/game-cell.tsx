import Image from "next/image"
import Link from "next/link"
import { Gamepad2 } from "lucide-react"
import { getSteamStoreUrl } from "@/lib/utils/steam-url"
import { cn } from "@/lib/utils"

type GameCellProps = {
  appid: number
  name: string
  iconUrl?: string
  storeUrl?: string
  className?: string
  onOpenDetail?: (appid: number) => void
}

export const GameCell = ({
  appid,
  name,
  iconUrl,
  storeUrl,
  className,
  onOpenDetail,
}: GameCellProps) => {
  const href = storeUrl ?? getSteamStoreUrl(appid)

  const handleOpenDetail = () => {
    onOpenDetail?.(appid)
  }

  const handleOpenDetailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return
    e.preventDefault()
    handleOpenDetail()
  }

  const iconContent = iconUrl ? (
    <Image
      src={iconUrl}
      alt=""
      width={32}
      height={32}
      className="size-8 object-cover"
      unoptimized
    />
  ) : (
    <Gamepad2 className="size-4 text-muted-foreground" aria-hidden />
  )

  const iconSlot = onOpenDetail ? (
    <button
      type="button"
      onClick={handleOpenDetail}
      onKeyDown={handleOpenDetailKeyDown}
      className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded bg-muted outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`View details for ${name}`}
    >
      {iconContent}
    </button>
  ) : (
    <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
      {iconContent}
    </div>
  )

  return (
    <div className={cn("flex min-w-0 items-start gap-3", className)}>
      {iconSlot}
      <div className="min-w-0 flex-1">
        {onOpenDetail ? (
          <button
            type="button"
            onClick={handleOpenDetail}
            onKeyDown={handleOpenDetailKeyDown}
            className="link-game w-fit max-w-full text-left text-primary whitespace-normal break-words"
            aria-label={`View details for ${name}`}
          >
            {name}
          </button>
        ) : (
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="link-game w-fit max-w-full text-primary whitespace-normal break-words"
          >
            {name}
          </Link>
        )}
      </div>
    </div>
  )
}

export const GameIconCell = ({
  appid,
  iconUrl,
}: {
  appid: number
  iconUrl?: string
}) => (
  <div className="flex size-8 items-center justify-center overflow-hidden rounded bg-muted">
    {iconUrl ? (
      <Image
        src={iconUrl}
        alt=""
        width={32}
        height={32}
        className="size-8 object-cover"
        unoptimized
      />
    ) : (
      <Gamepad2 className="size-4 text-muted-foreground" aria-hidden />
    )}
  </div>
)
