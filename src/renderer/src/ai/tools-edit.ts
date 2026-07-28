import { tool } from 'ai'
import { z } from 'zod'
import type { DocBridge } from './doc-bridge'

const normalized = (name: string): z.ZodNumber =>
  z.number().min(0).max(1).describe(`${name}, normalized 0..1 fraction of the page`)

export const buildEditTools = (bridge: DocBridge) => ({
  replace_text: tool({
    description:
      'Rewrite existing text segments inside the PDF itself (use this for translation): the ' +
      'original characters are removed from the page content and the new text is drawn at the ' +
      'same position, size, and style, so the layout is preserved. Use the `segment` indexes ' +
      'returned by read_page for the SAME page, one replacement per segment — never merge or ' +
      'reorder segments. Provide replacements for every segment you want changed in ONE call; ' +
      'untouched segments keep their original text. Never use add_text to translate.',
    inputSchema: z.object({
      pageId: z.string().describe('Page id from list_documents'),
      replacements: z
        .array(
          z.object({
            segment: z.number().int().min(0).describe('Segment index from read_page'),
            text: z.string().describe('New text for this segment')
          })
        )
        .min(1)
    }),
    execute: async ({ pageId, replacements }) => bridge.replaceText(pageId, replacements)
  }),

  add_text: tool({
    description: 'Add a new text note on a page at the given position.',
    inputSchema: z.object({
      pageId: z.string(),
      text: z.string().min(1),
      x: normalized('Left edge of the text'),
      y: normalized('Top edge of the text'),
      fontSize: z.number().min(4).max(96).optional().describe('Font size in points, default 14')
    }),
    execute: async ({ pageId, text, x, y, fontSize }) => ({
      added: bridge.addText(pageId, text, x, y, fontSize)
    })
  }),

  sign: tool({
    description:
      'Draw a handwritten-style signature stroke on a page. (x, y) is the left end of the ' +
      'signature baseline; width is its horizontal extent.',
    inputSchema: z.object({
      pageId: z.string(),
      x: normalized('Left end of the signature'),
      y: normalized('Vertical position of the signature baseline'),
      width: z.number().min(0.05).max(0.9).optional().describe('Width fraction, default 0.22')
    }),
    execute: async ({ pageId, x, y, width }) => ({ signed: bridge.sign(pageId, x, y, width) })
  }),

  fill_form_field: tool({
    description:
      'Fill a form field on a page. Use list_form_fields first; pass a string for text ' +
      'fields or a boolean for checkboxes.',
    inputSchema: z.object({
      pageId: z.string(),
      fieldName: z.string(),
      value: z.union([z.string(), z.boolean()])
    }),
    execute: async ({ pageId, fieldName, value }) => ({
      filled: await bridge.fillFormField(pageId, fieldName, value)
    })
  })
})
