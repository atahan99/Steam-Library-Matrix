import {
  getDefaultSortDirection,
  type SortDirection,
} from "@/lib/utils/table-sort"

export type AchievementsSortKey =
  | "name"
  | "playtime"
  | "completion"
  | "unlocked"
  | "total"

/** Default sort is completion % — omit dir → desc so progress shows first. */
export const resolveAchievementsSortDir = (
  sort: AchievementsSortKey,
  dirParam: string | null
): SortDirection =>
  dirParam === "asc" || dirParam === "desc"
    ? dirParam
    : getDefaultSortDirection(sort)
