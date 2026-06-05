import { NextResponse } from "next/server"
import { checkRateLimit, type RateLimitTier } from "@/lib/api/rate-limit"
import { toApiErrorResponse } from "@/lib/api/api-error"

export type ApiRouteOptions = {
  tier?: RateLimitTier
}

export const runApiRoute = async (
  request: Request,
  options: ApiRouteOptions,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> => {
  const tier = options.tier ?? "default"

  const rateLimited = checkRateLimit(request, tier)
  if (rateLimited) return rateLimited

  try {
    return await handler()
  } catch (error) {
    return toApiErrorResponse(error)
  }
}
