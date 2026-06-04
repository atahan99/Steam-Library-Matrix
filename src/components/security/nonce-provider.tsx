"use client"

import { createContext, useContext } from "react"

const NonceContext = createContext<string | undefined>(undefined)

export const NonceProvider = ({
  nonce,
  children,
}: {
  nonce?: string
  children: React.ReactNode
}) => (
  <NonceContext.Provider value={nonce}>{children}</NonceContext.Provider>
)

export const useCspNonce = (): string | undefined => useContext(NonceContext)
