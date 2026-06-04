import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { connection } from "next/server"

const envFileRoots = (): string[] => {
  const roots = [process.env.APP_ROOT, process.cwd()].filter(
    (root): root is string => Boolean(root?.trim())
  )
  return [...new Set(roots)]
}

const envFilePaths = (): string[] => {
  const names = [
    ".env.production.local",
    ".env.production",
    ".env.local",
    ".env",
  ] as const
  const paths: string[] = []
  for (const root of envFileRoots()) {
    for (const name of names) {
      paths.push(join(root, name))
    }
  }
  paths.push("/app/.env.production", "/app/.env")
  return [...new Set(paths)]
}

const readEnvVarFromFiles = (name: string): string | undefined => {
  const pattern = new RegExp(`^${name}=(.+)$`, "m")
  for (const path of envFilePaths()) {
    if (!existsSync(path)) continue
    const match = readFileSync(path, "utf8").match(pattern)
    if (match?.[1]) return match[1].trim()
  }
  return undefined
}

/** Read env at runtime (Next 16 standalone may inline bare process.env at build). */
export const getRuntimeEnv = (name: string): string | undefined => {
  const fromProcess = process.env[name]?.trim()
  if (fromProcess) return fromProcess
  const fromFiles = readEnvVarFromFiles(name)
  if (fromFiles) return fromFiles
  return undefined
}

let inNextRequestScope: boolean | undefined

export const isNextDynamicApiScopeError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false
  return error.message.includes("called outside a request scope")
}

const isOutsideRequestScopeError = isNextDynamicApiScopeError

/** Fetch init safe for workers, CLI, and Next `after()` callbacks. */
export const nextFetchInit = (revalidate = 0): RequestInit => {
  if (process.env.SLM_CLI === "1") return {}
  if (inNextRequestScope === false) return {}
  if (inNextRequestScope === true) return { next: { revalidate } }
  return {}
}

/** Ensures server env is read at request time (Docker / standalone). */
export const prepareServerEnv = async (): Promise<void> => {
  if (process.env.SLM_CLI === "1") {
    inNextRequestScope = false
    return
  }
  if (inNextRequestScope !== undefined) return

  try {
    await connection()
    inNextRequestScope = true
  } catch (error) {
    if (isOutsideRequestScopeError(error)) {
      inNextRequestScope = false
      return
    }
    throw error
  }
}

/** Reset cached request-scope detection (tests only). */
export const resetServerEnvScopeForTests = (): void => {
  inNextRequestScope = undefined
}

export const markInNextRequestScopeForTests = (value: boolean): void => {
  inNextRequestScope = value
}
