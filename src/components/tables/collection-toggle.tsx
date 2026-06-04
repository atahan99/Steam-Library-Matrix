"use client"

import {
  useDashboard,
  useDashboardCollection,
  type DashboardCollection,
} from "@/components/dashboard/dashboard-context"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { filterWishlistBaseGames } from "@/lib/utils/wishlist-base-game"
import { cn } from "@/lib/utils"

type CollectionToggleProps = {
  className?: string
}

export const CollectionToggle = ({ className }: CollectionToggleProps) => {
  const { collection, setCollection } = useDashboardCollection()
  const isWishlist = collection === "wishlist"

  const handleCollectionChange = (next: DashboardCollection) => {
    setCollection(next)
  }

  const handleSwitchChange = (checked: boolean) => {
    handleCollectionChange(checked ? "wishlist" : "library")
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-1.5",
        className
      )}
      aria-label="Switch between library and wishlist"
    >
      <Label
        htmlFor="collection-toggle"
        className={cn(
          "cursor-pointer text-sm font-medium",
          !isWishlist ? "text-foreground" : "text-muted-foreground"
        )}
        onClick={() => handleCollectionChange("library")}
      >
        Library
      </Label>
      <Switch
        id="collection-toggle"
        checked={isWishlist}
        onCheckedChange={handleSwitchChange}
        aria-label={
          isWishlist ? "Showing wishlist, switch to library" : "Showing library, switch to wishlist"
        }
      />
      <Label
        htmlFor="collection-toggle"
        className={cn(
          "cursor-pointer text-sm font-medium",
          isWishlist ? "text-foreground" : "text-muted-foreground"
        )}
        onClick={() => handleCollectionChange("wishlist")}
      >
        Wishlist
      </Label>
    </div>
  )
}

export const WishlistEmptyHint = () => {
  const { profile, wishlistGames } = useDashboard()
  const { collection } = useDashboardCollection()
  const baseWishlistGames = filterWishlistBaseGames(wishlistGames)

  if (collection !== "wishlist" || baseWishlistGames.length > 0) {
    return null
  }

  return (
    <p className="text-sm text-muted-foreground" role="status">
      {profile.wishlistSyncError
        ? profile.wishlistSyncError
        : "Wishlist is empty or not synced yet. Make your Steam wishlist public, then refresh from Data Status."}
    </p>
  )
}
