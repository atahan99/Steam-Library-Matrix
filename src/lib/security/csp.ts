/**
 * Nonce-based CSP per https://nextjs.org/docs/app/guides/content-security-policy
 * Production avoids unsafe-inline on scripts; dev allows unsafe-eval for Next HMR.
 */
export const CSP_NONCE_HEADER = "x-nonce"

export const createCspNonce = (): string =>
  Buffer.from(crypto.randomUUID()).toString("base64")

export const buildContentSecurityPolicy = (
  nonce: string,
  options?: { isDev?: boolean }
): string => {
  const isDev = options?.isDev ?? process.env.NODE_ENV === "development"

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(isDev ? ["'unsafe-eval'"] : []),
  ].join(" ")

  const styleSrc = isDev
    ? "'self' 'unsafe-inline'"
    : `'self' 'nonce-${nonce}'`

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' https: data: blob:",
    "font-src 'self' https: data:",
    "connect-src 'self' https:",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ]

  return directives.join("; ")
}
