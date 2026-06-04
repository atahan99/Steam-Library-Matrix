import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

/**
 * False during SSR and the first client render (hydration), then true.
 * Use to render Base UI controls only after hydration so auto-generated ids match.
 */
export const useIsClient = (): boolean =>
  useSyncExternalStore(subscribe, () => true, () => false)
