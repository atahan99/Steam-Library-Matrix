import type { Metadata } from "next"
import { headers } from "next/headers"
import { Outfit, Fira_Code } from "next/font/google"
import { NonceProvider } from "@/components/security/nonce-provider"
import { AppToaster } from "@/components/theme/app-toaster"
import { ThemeProvider } from "@/components/theme/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { APP_NAME } from "@/lib/brand"
import { CSP_NONCE_HEADER } from "@/lib/security/csp"
import { themeInitScript } from "@/lib/theme/theme-init-script"
import { DEFAULT_THEME_ID } from "@/lib/theme/themes"
import "./globals.css"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
})

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: APP_NAME,
  description:
    "Import your public Steam library, enrich games with compatibility and completion data, and explore everything in one dashboard.",
  openGraph: {
    title: APP_NAME,
    description:
      "Import your public Steam library, enrich games with compatibility and completion data, and explore everything in one dashboard.",
    type: "website",
    siteName: APP_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description:
      "Import your public Steam library, enrich games with compatibility and completion data, and explore everything in one dashboard.",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const nonceHeader = (await headers()).get(CSP_NONCE_HEADER)
  const nonce = nonceHeader?.trim() ? nonceHeader : undefined

  return (
    <html
      lang="en"
      className={`dark ${outfit.variable} ${firaCode.variable}`}
      data-theme={DEFAULT_THEME_ID}
      suppressHydrationWarning
    >
      <head>
        <script
          {...(nonce ? { nonce } : {})}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <NonceProvider nonce={nonce}>
          <ThemeProvider>
            <TooltipProvider>{children}</TooltipProvider>
            <AppToaster />
          </ThemeProvider>
        </NonceProvider>
      </body>
    </html>
  )
}
