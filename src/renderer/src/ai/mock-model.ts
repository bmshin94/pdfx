import { MockLanguageModelV4 } from 'ai/test'
import type { LanguageModel } from 'ai'
import { toGreeklish } from './greeklish'
import type { DocSummary, SegmentInfo } from './doc-bridge'

const STEP_DELAY_MS = 650

const stepDelay = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, STEP_DELAY_MS))

const USAGE = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 }
}

const toolCall = (toolName: string, input: unknown) => ({
  type: 'tool-call' as const,
  toolCallId: `mock-${toolName}-${Date.now()}`,
  toolName,
  input: JSON.stringify(input)
})

const finalText = (text: string) => ({
  content: [{ type: 'text' as const, text }],
  finishReason: { unified: 'stop' as const, raw: undefined },
  usage: USAGE,
  warnings: []
})

const nextCall = (call: ReturnType<typeof toolCall>) => ({
  content: [call],
  finishReason: { unified: 'tool-calls' as const, raw: undefined },
  usage: USAGE,
  warnings: []
})

function lastUserText(prompt: unknown): string {
  let text = ''
  for (const message of prompt as { role: string; content: unknown }[]) {
    if (message.role !== 'user' || !Array.isArray(message.content)) continue
    const parts = message.content.filter((p) => p?.type === 'text').map((p) => p.text)
    if (parts.length > 0) text = parts.join('\n')
  }
  return text
}

function textAfter(message: string, keyword: string): string | null {
  const at = message.toLowerCase().indexOf(keyword)
  if (at === -1) return null
  const rest = message.slice(at + keyword.length).trim()
  return rest.length > 0 ? rest : null
}

function collectToolResults(prompt: unknown): Map<string, unknown> {
  const results = new Map<string, unknown>()
  for (const message of prompt as { role: string; content: unknown }[]) {
    if (message.role !== 'tool' || !Array.isArray(message.content)) continue
    for (const part of message.content) {
      if (part?.type === 'tool-result' && part.output?.type === 'json') {
        results.set(part.toolName as string, part.output.value)
      }
    }
  }
  return results
}

export function createMockModel(): LanguageModel {
  return new MockLanguageModelV4({
    provider: 'pdfx-mock',
    modelId: 'pdfx-mock',
    doGenerate: async ({ prompt }) => {
      await stepDelay()
      const results = collectToolResults(prompt)
      if (!results.has('list_documents')) return nextCall(toolCall('list_documents', {}))

      const docs = results.get('list_documents') as DocSummary[]
      const firstPage = docs[0]?.pages[0]
      if (!firstPage) return finalText('Open a PDF first — the collection is empty.')
      if (!results.has('read_page')) {
        return nextCall(toolCall('read_page', { pageId: firstPage.pageId }))
      }

      const segments = results.get('read_page') as SegmentInfo[]
      if (segments.length === 0) {
        return finalText('That page has no extractable text (it may be a scan).')
      }

      const wants = lastUserText(prompt)
      const markKind = wants.toLowerCase().includes('redact')
        ? 'redact'
        : wants.toLowerCase().includes('highlight')
          ? 'highlight'
          : null
      if (markKind) {
        const toolName = `${markKind}_text`
        const needle = textAfter(wants, markKind) ?? segments[0].text
        if (!results.has(toolName)) {
          return nextCall(toolCall(toolName, { pageId: firstPage.pageId, text: needle }))
        }
        const { matches } = results.get(toolName) as { matches: number }
        return finalText(
          matches > 0
            ? `Done — ${markKind}ed ${matches} occurrence(s) of "${needle}". (Mock provider.)`
            : `I could not find "${needle}" on the page. (Mock provider.)`
        )
      }

      if (!results.has('replace_text')) {
        let replacements = segments.map((s) => ({
          segment: s.segment,
          text: toGreeklish(s.text)
        }))
        if (lastUserText(prompt).includes('cram')) {
          const joined = replacements.map((r) => r.text).join(' ')
          replacements = replacements.map((r, i) => ({
            segment: r.segment,
            text: i === 0 ? joined : (r.text.split(' ').pop() ?? r.text)
          }))
        }
        return nextCall(toolCall('replace_text', { pageId: firstPage.pageId, replacements }))
      }

      const outcome = results.get('replace_text') as { replaced: number }
      return finalText(
        `Done — replaced ${outcome.replaced} segments on the first page with Greek text. ` +
          '(Mock provider: transliterated, not translated.)'
      )
    }
  }) as unknown as LanguageModel
}
