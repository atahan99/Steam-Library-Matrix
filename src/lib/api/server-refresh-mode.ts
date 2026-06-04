import { isApiGuardRequired } from "@/lib/api/guard"

/** Dashboard UI should call server actions instead of fetch when API guard is on. */
export const shouldUseServerRefreshActions = (): boolean => isApiGuardRequired()
