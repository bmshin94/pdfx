import { tool } from 'ai'
import { z } from 'zod'
import type { DocBridge } from './doc-bridge'

export const buildReadTools = (bridge: DocBridge) => ({
  list_documents: tool({
    description:
      'List all open documents with their docId, name, and pages (pageId, 1-based number, ' +
      'width/height in PDF points). Call this first to resolve ids for other tools.',
    inputSchema: z.object({}),
    execute: async () => bridge.listDocuments()
  }),

  read_page: tool({
    description:
      'Read the text of a page as styled segments in reading order. Returns ' +
      '[{segment, text, budget}] where `segment` is the index to target with replace_text and ' +
      '`budget` is the character count that fits the space without visible shrinking — keep ' +
      'each replacement within it. A segment is one run of same-style text (a heading, a ' +
      'label, part of a sentence) — treat consecutive segments as continuing the same ' +
      'sentence when translating. Scanned pages are OCR’d automatically and return one ' +
      'segment per recognized line (the first read may take a few seconds); their segments ' +
      'work with replace_text like any other. Empty result means the page has no readable ' +
      'text at all.',
    inputSchema: z.object({
      pageId: z.string().describe('Page id from list_documents')
    }),
    execute: async ({ pageId }) => bridge.readPage(pageId)
  }),

  list_form_fields: tool({
    description:
      'List fillable form fields on a page: name, kind (text | checkbox), and current value.',
    inputSchema: z.object({
      pageId: z.string().describe('Page id from list_documents')
    }),
    execute: async ({ pageId }) => bridge.listFormFields(pageId)
  })
})
