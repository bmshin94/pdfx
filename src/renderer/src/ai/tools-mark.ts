import { tool } from 'ai'
import { z } from 'zod'
import type { DocBridge } from './doc-bridge'

const pageText = {
  pageId: z.string().describe('Page id from list_documents'),
  text: z
    .string()
    .min(1)
    .describe(
      'The text exactly as it appears on the page (use read_page to check the wording). ' +
        'Matching ignores case, accents, and whitespace differences, and may span lines.'
    )
}

export const buildMarkTools = (bridge: DocBridge) => ({
  highlight_text: tool({
    description:
      'Highlight every occurrence of a text snippet on a page with a yellow marker, exactly ' +
      'like the manual highlighter. Returns the number of occurrences found — 0 means the ' +
      'text was not found as written; read_page and retry with the exact wording. Never ' +
      'imitate a highlight with add_text.',
    inputSchema: z.object(pageText),
    execute: async ({ pageId, text }) => ({
      matches: await bridge.markText(pageId, 'highlight', text)
    })
  }),

  redact_text: tool({
    description:
      'Redact every occurrence of a text snippet on a page: a solid black box covers it ' +
      'immediately, and on export the underlying characters are permanently removed from the ' +
      'PDF. Returns the number of occurrences found (0 = not found as written). Only redact ' +
      'what the user explicitly asked to redact. Never imitate a redaction with add_text.',
    inputSchema: z.object(pageText),
    execute: async ({ pageId, text }) => ({
      matches: await bridge.markText(pageId, 'redact', text)
    })
  }),

  clear_marks: tool({
    description:
      'Remove all highlights or all redaction boxes previously placed on a page. Returns how ' +
      'many were removed.',
    inputSchema: z.object({
      pageId: z.string().describe('Page id from list_documents'),
      kind: z.enum(['highlight', 'redact'])
    }),
    execute: async ({ pageId, kind }) => ({ cleared: await bridge.clearMarks(pageId, kind) })
  })
})
