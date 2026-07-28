import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { AiChatMessage } from '../../ai/useAiChat'
import { AiRevealText } from './AiRevealText'

interface AiMessagesProps {
  messages: AiChatMessage[]
  busy: boolean
}

const BUBBLE_MOTION = {
  initial: { opacity: 0, y: 14, scale: 0.88 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: { type: 'spring', stiffness: 480, damping: 34 }
} as const

export function AiMessages({ messages, busy }: AiMessagesProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, busy])

  return (
    <div ref={scrollRef} className="ai-chat-messages">
      <div className="ai-chat-messages-inner">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div key={m.id} className={`ai-msg ${m.role}`} {...BUBBLE_MOTION}>
              {m.role === 'assistant' ? <AiRevealText text={m.text} at={m.at} /> : m.text}
            </motion.div>
          ))}
          {busy && (
            <motion.div key="thinking" className="ai-msg assistant thinking" {...BUBBLE_MOTION}>
              <span className="ai-dot" />
              <span className="ai-dot" />
              <span className="ai-dot" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
