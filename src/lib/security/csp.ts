/**
 * Nonce-based CSP per https://nextjs.org/docs/app/guides/content-security-policy
 * Production avoids unsafe-inline on scripts; dev allows unsafe-eval for Next HMR.
 */
export const CSP_NONCE_HEADER = "x-nonce"

export const createCspNonce = (): string =>
  Buffer.from(crypto.randomUUID()).toString("base64")

/**
 * Sonner injects its CSS via a nonce-less <style> at import (empty tag, then the CSS text).
 * Allow exactly those two hashes; csp.test.ts recomputes them from the installed sonner.
 */
export const SONNER_STYLE_HASHES = [
  "sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=",
  "sha256-CIxDM5jnsGiKqXs2v7NKCY5MzdR9gu6TtiMJrDw29AY=",
]

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

  // Production: nonce on <style> tags; allow style="" from React (orbit, charts, neon card).
  const styleSrc = isDev
    ? "'self' 'unsafe-inline'"
    : [`'self'`, `'nonce-${nonce}'`, ...SONNER_STYLE_HASHES.map((h) => `'${h}'`)].join(" ")
  const styleSrcAttr = isDev ? null : "'unsafe-inline'"

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    ...(styleSrcAttr ? [`style-src-attr ${styleSrcAttr}`] : []),
    "img-src 'self' https: data: blob:",
    "font-src 'self' https: data:",
    "connect-src 'self' https:",
  ]

  return directives.join("; ")
}
