import type { DocBridge } from './doc-bridge'
import { buildReadTools } from './tools-read'
import { buildEditTools } from './tools-edit'
import { buildMarkTools } from './tools-mark'
import { buildOrganizeTools } from './tools-organize'

export const buildAiTools = (bridge: DocBridge) => ({
  ...buildReadTools(bridge),
  ...buildEditTools(bridge),
  ...buildMarkTools(bridge),
  ...buildOrganizeTools(bridge)
})

export type AiTools = ReturnType<typeof buildAiTools>

export const TOOL_LABELS: Record<keyof AiTools, string> = {
  list_documents: 'Listed documents',
  read_page: 'Read page text',
  list_form_fields: 'Listed form fields',
  replace_text: 'Replaced text',
  add_text: 'Added text',
  highlight_text: 'Highlighted text',
  redact_text: 'Redacted text',
  clear_marks: 'Cleared marks',
  sign: 'Signed',
  fill_form_field: 'Filled form field',
  move_page: 'Moved page',
  insert_page: 'Inserted page',
  delete_page: 'Deleted page',
  rename_document: 'Renamed document'
}
