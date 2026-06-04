export type ConcurrentBatchResult = {
  checked: number
  updated: number
  failed: number
  processed: number
  skipped?: number
  skippedLowConfidence?: number
}

export type ConcurrentBatchItemResult = {
  checked?: number
  updated?: number
  failed?: number
  skipped?: number
  skippedLowConfidence?: number
}

export const runConcurrentBatch = async <T>(input: {
  items: T[]
  cursor: number
  batchSize: number
  deadlineMs: number
  concurrency: number
  staggerMs?: number
  runOne: (item: T, indexInBatch: number) => Promise<ConcurrentBatchItemResult>
}): Promise<ConcurrentBatchResult> => {
  const end = Math.min(input.cursor + input.batchSize, input.items.length)
  const batch = input.items.slice(input.cursor, end)
  const concurrency = Math.max(1, Math.min(input.concurrency, batch.length || 1))

  let checked = 0
  let updated = 0
  let failed = 0
  let processed = 0
  let skipped = 0
  let skippedLowConfidence = 0
  let nextIndex = 0

  const takeNext = (): { item: T; index: number } | null => {
    if (nextIndex >= batch.length) return null
    const index = nextIndex
    nextIndex += 1
    const item = batch[index]
    if (item == null) return takeNext()
    return { item, index }
  }

  const merge = (result: ConcurrentBatchItemResult) => {
    checked += result.checked ?? 0
    updated += result.updated ?? 0
    failed += result.failed ?? 0
    skipped += result.skipped ?? 0
    skippedLowConfidence += result.skippedLowConfidence ?? 0
    processed += 1
  }

  const worker = async () => {
    while (Date.now() < input.deadlineMs) {
      const next = takeNext()
      if (!next) break

      if (input.staggerMs && input.staggerMs > 0 && next.index > 0) {
        await new Promise((resolve) => setTimeout(resolve, input.staggerMs))
        if (Date.now() >= input.deadlineMs) break
      }

      merge(await input.runOne(next.item, next.index))
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  return {
    checked,
    updated,
    failed,
    processed,
    skipped: skipped > 0 ? skipped : undefined,
    skippedLowConfidence:
      skippedLowConfidence > 0 ? skippedLowConfidence : undefined,
  }
}
