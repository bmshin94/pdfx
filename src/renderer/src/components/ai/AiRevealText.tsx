import { useState } from 'react'

const REVEAL_BUDGET_MS = 1600
const MAX_STEP_MS = 70
const FRESH_MS = 2400

const isGap = (part: string): boolean => part.trim().length === 0

export function AiRevealText({ text, at }: { text: string; at: number }): React.JSX.Element {
  const [animate] = useState(() => Date.now() - at < FRESH_MS)

  if (!animate) return <>{text}</>

  const parts = text.split(/(\s+)/)
  const wordCount = parts.filter((p) => !isGap(p)).length
  const step = Math.min(MAX_STEP_MS, REVEAL_BUDGET_MS / Math.max(wordCount, 1))
  let shown = 0
  return (
    <>
      {parts.map((part, i) =>
        isGap(part) ? (
          part
        ) : (
          <span
            key={i}
            className="ai-word"
            style={{ animationDelay: `${Math.round(shown++ * step)}ms` }}
          >
            {part}
          </span>
        )
      )}
    </>
  )
}
