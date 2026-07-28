import { useCallback, useRef, useState } from 'react'
import { generateText, stepCountIs } from 'ai'
import type { ModelMessage } from 'ai'
import type { DocBridge } from './doc-bridge'
import { buildAiTools, TOOL_LABELS } from './tools'
import type { AiTools } from './tools'
import { createAiModel, resolveAiConfig, PROVIDER_KEY_VARS } from './provider'
import type { AiConfig } from './provider'
import { SYSTEM_PROMPT } from './system-prompt'
import { buildWorkspaceContext } from './workspace'

export interface AiChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  actions: string[]
  at: number
}

const MAX_STEPS = 12

const noKeyHint = (config: AiConfig): string =>
  config.provider === 'mock'
    ? ''
    : `No ${config.provider} API key found. Set ${PROVIDER_KEY_VARS[config.provider]} in .dev.vars at the project root, then restart the dev server (values are read at startup).`

const message = (
  role: AiChatMessage['role'],
  text: string,
  actions: string[] = []
): AiChatMessage => ({
  id: crypto.randomUUID(),
  role,
  text,
  actions,
  at: Date.now()
})

const actionLabels = (toolNames: string[]): string[] => {
  const labels: string[] = []
  for (const name of toolNames) {
    const label = TOOL_LABELS[name as keyof AiTools] ?? name
    if (labels[labels.length - 1] !== label) labels.push(label)
  }
  return labels
}

export function useAiChat(bridge: DocBridge) {
  const [messages, setMessages] = useState<AiChatMessage[]>([])
  const [busy, setBusy] = useState(false)
  const historyRef = useRef<ModelMessage[]>([])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (trimmed.length === 0) return
      setMessages((prev) => [...prev, message('user', trimmed)])

      const config = resolveAiConfig()
      if (!config.ready) {
        setMessages((prev) => [...prev, message('assistant', noKeyHint(config))])
        return
      }

      historyRef.current.push({ role: 'user', content: trimmed })
      setBusy(true)
      try {
        const context = buildWorkspaceContext(bridge.listDocuments(), bridge.focus())
        const result = await generateText({
          model: createAiModel(config),
          system: `${SYSTEM_PROMPT}\n\n${context}`,
          messages: historyRef.current,
          tools: buildAiTools(bridge),
          stopWhen: stepCountIs(MAX_STEPS)
        })
        historyRef.current.push(...result.response.messages)
        const toolNames = result.steps.flatMap((step) => step.toolCalls.map((c) => c.toolName))
        const reply = result.text.trim() || 'Done.'
        setMessages((prev) => [...prev, message('assistant', reply, actionLabels(toolNames))])
      } catch (error) {
        console.error('[pdfx] AI request failed', error)
        const detail = error instanceof Error ? error.message : String(error)
        historyRef.current.push({
          role: 'assistant',
          content: `[The request failed mid-run: ${detail}. Some document changes may already have been applied — check current state with tools before redoing work.]`
        })
        setMessages((prev) => [...prev, message('assistant', `Something went wrong: ${detail}`)])
      } finally {
        setBusy(false)
      }
    },
    [bridge]
  )

  return { messages, busy, send }
}

export type AiChat = ReturnType<typeof useAiChat>
