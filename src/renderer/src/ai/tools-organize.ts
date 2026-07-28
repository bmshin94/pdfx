import { tool } from 'ai'
import { z } from 'zod'
import type { DocBridge } from './doc-bridge'

export const buildOrganizeTools = (bridge: DocBridge) => ({
  move_page: tool({
    description:
      'Move a page into a document at a 1-based position. Works for reordering within a ' +
      'document or moving a page across documents.',
    inputSchema: z.object({
      pageId: z.string(),
      targetDocId: z.string(),
      position: z.number().int().min(1).describe('1-based position within the target document')
    }),
    execute: async ({ pageId, targetDocId, position }) => ({
      moved: await bridge.movePage(pageId, targetDocId, position)
    })
  }),

  insert_page: tool({
    description:
      'Insert a new blank page into a document at a 1-based position. The page matches the ' +
      "document's page size. Returns the new pageId — use add_text with it to put content on " +
      'the page.',
    inputSchema: z.object({
      docId: z.string(),
      position: z.number().int().min(1).describe('1-based position within the document')
    }),
    execute: async ({ docId, position }) => ({ pageId: await bridge.insertPage(docId, position) })
  }),

  delete_page: tool({
    description: 'Delete a page. This cannot be undone — only use when explicitly asked.',
    inputSchema: z.object({ pageId: z.string() }),
    execute: async ({ pageId }) => ({ deleted: await bridge.deletePage(pageId) })
  }),

  rename_document: tool({
    description: 'Rename a document.',
    inputSchema: z.object({ docId: z.string(), name: z.string().min(1) }),
    execute: async ({ docId, name }) => ({ renamed: bridge.renameDocument(docId, name) })
  })
})
