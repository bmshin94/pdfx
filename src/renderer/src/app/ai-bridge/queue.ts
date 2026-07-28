const SETTLE_FALLBACK_MS = 50

const settle = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(() => {
      requestAnimationFrame(() => resolve())
      setTimeout(resolve, SETTLE_FALLBACK_MS)
    }, 0)
  })

export interface MutationQueue {
  mutate<T>(task: () => Promise<T>): Promise<T>
}

export function createMutationQueue(): MutationQueue {
  let tail: Promise<unknown> = Promise.resolve()
  return {
    mutate<T>(task: () => Promise<T>): Promise<T> {
      const run = tail.then(async () => {
        const result = await task()
        await settle()
        return result
      })
      tail = run.then(
        () => undefined,
        () => undefined
      )
      return run
    }
  }
}
