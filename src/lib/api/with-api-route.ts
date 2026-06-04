import { NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/api/guard"
import { checkRateLimit, type RateLimitTier } from "@/lib/api/rate-limit"
import { toApiErrorResponse } from "@/lib/api/api-error"

export type ApiRouteOptions = {
  tier?: RateLimitTier
  /** When true, require Bearer token when API guard is enabled. */
  protected?: boolean
}

export const runApiRoute = async (
  request: Request,
  options: ApiRouteOptions,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> => {
  const tier = options.tier ?? "default"

  const rateLimited = checkRateLimit(request, tier)
  if (rateLimited) return rateLimited

  if (options.protected) {
    const authError = requireApiAuth(request)
    if (authError) return authError
  }

  try {
    return await handler()
  } catch (error) {
    return toApiErrorResponse(error)
  }
}
