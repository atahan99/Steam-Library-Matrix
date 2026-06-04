import { spawn, type ChildProcess } from "node:child_process"

const children: ChildProcess[] = []

const spawnChild = (command: string, args: string[]) => {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  })
  children.push(child)
  child.on("exit", (code, signal) => {
    if (signal) return
    if (code !== 0 && code !== null) {
      console.error(`[dev:all] ${command} ${args.join(" ")} exited with ${code}`)
      handleShutdown(code ?? 1)
    }
  })
  return child
}

const handleShutdown = (exitCode = 0) => {
  for (const child of children) {
    if (!child.killed) child.kill("SIGINT")
  }
  process.exit(exitCode)
}

process.on("SIGINT", () => handleShutdown(0))
process.on("SIGTERM", () => handleShutdown(0))

console.log("[dev:all] starting next dev + dev:jobs")
spawnChild("pnpm", ["dev"])
spawnChild("pnpm", ["dev:jobs"])
