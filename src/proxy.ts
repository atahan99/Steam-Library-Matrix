import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  buildContentSecurityPolicy,
  createCspNonce,
  CSP_NONCE_HEADER,
} from "@/lib/security/csp"

const applySecurityHeaders = (
  response: NextResponse,
  csp: string,
  nonce: string
): NextResponse => {
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"
  )
  response.headers.set("Content-Security-Policy", csp)
  response.headers.set(CSP_NONCE_HEADER, nonce)

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    )
  }

  return response
}

export function proxy(request: NextRequest) {
  const nonce = createCspNonce()
  const isDev = process.env.NODE_ENV === "development"
  const csp = buildContentSecurityPolicy(nonce, { isDev })

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(CSP_NONCE_HEADER, nonce)
  requestHeaders.set("Content-Security-Policy", csp)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  return applySecurityHeaders(response, csp, nonce)
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    },
  ],
}
