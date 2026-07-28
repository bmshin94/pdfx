import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { AiChatMessage } from '../../ai/useAiChat'
import { CloseIcon, SendIcon } from '../icons'
import { AiMessages } from './AiMessages'
import { useSheetResize } from './useSheetResize'

interface AiChatPanelProps {
  messages: AiChatMessage[]
  busy: boolean
  onSend: (text: string) => void
  onClose: () => void
}

const PANEL_TRANSITION = { duration: 0.24, ease: [0.34, 1.3, 0.64, 1] } as const
const MAX_INPUT_ROWS = 6

export function AiChatPanel({
  messages,
  busy,
  onSend,
  onClose
}: AiChatPanelProps): React.JSX.Element {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sheet = useSheetResize()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
      onClose()
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [onClose])

  const resize = (): void => {
    const node = inputRef.current
    if (!node) return
    node.style.height = 'auto'
    const lineHeight = parseFloat(getComputedStyle(node).lineHeight)
    node.style.height = `${Math.min(node.scrollHeight, lineHeight * MAX_INPUT_ROWS)}px`
  }

  const idle = messages.length === 0 && !busy
  const mood = busy ? ' busy' : draft.trim().length > 0 ? ' typing' : ''

  const submit = (): void => {
    if (busy || draft.trim().length === 0) return
    onSend(draft)
    setDraft('')
    requestAnimationFrame(resize)
  }

  const insertNewline = (): void => {
    const node = inputRef.current
    if (!node) return
    const { selectionStart, selectionEnd } = node
    setDraft(draft.slice(0, selectionStart) + '\n' + draft.slice(selectionEnd))
    requestAnimationFrame(() => {
      node.selectionStart = node.selectionEnd = selectionStart + 1
      resize()
    })
  }

  return (
    <motion.div
      className="ai-chat-shell"
      role="dialog"
      aria-label="AI assistant"
      initial={{ opacity: 0, x: '-50%', y: 20, scale: 0.88 }}
      animate={{ opacity: 1, x: '-50%', y: 0, scale: 1 }}
      exit={{ opacity: 0, x: '-50%', y: 16, scale: 0.9 }}
      transition={PANEL_TRANSITION}
    >
      <div
        className={
          `ai-chat${mood}` +
          (sheet.collapsed ? ' collapsed' : '') +
          (sheet.resizing ? ' resizing' : '')
        }
        style={{ '--ai-sheet-h': `${sheet.height}px` } as React.CSSProperties}
      >
        {!idle && (
          <div
            className="ai-sheet-handle"
            title="Drag to resize · click to minimize"
            {...sheet.handleProps}
          >
            <div className="ai-sheet-grip" />
          </div>
        )}
        {!idle && (
          <button className="btn glass square ai-chat-close" title="Close (Esc)" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        )}
        {!idle && <AiMessages messages={messages} busy={busy} />}
        <div className="ai-chat-inputrow">
          <textarea
            ref={inputRef}
            className="ai-chat-input"
            rows={1}
            placeholder="What can I do for you?"
            spellCheck={false}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              resize()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (e.metaKey || e.ctrlKey) insertNewline()
                else submit()
              }
            }}
          />
          <button
            className="ai-chat-send"
            title="Send (Enter) — ⌘Enter for a new line"
            disabled={busy || draft.trim().length === 0}
            onClick={submit}
          >
            <SendIcon size={21} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
