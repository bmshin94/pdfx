import type { DocSummary } from './doc-bridge'
import type { AiFocus } from './focus'

const docLine = (doc: DocSummary): string => {
  const pages = doc.pages.map((p) => `${p.number}: ${p.pageId}`).join(', ')
  return `- "${doc.name}" (docId ${doc.docId}) — ${doc.pages.length} page(s): ${pages}`
}

const focusPhrase = (focus: AiFocus): string => {
  const place = `"${focus.docName}" (docId ${focus.docId})`
  if (focus.kind === 'single') return `${place} is the only open document`
  const page = `page ${focus.pageNumber} of ${place} (pageId ${focus.pageId})`
  return focus.kind === 'viewing'
    ? `the user is viewing ${page} in full view`
    : `the user has selected ${page} on the canvas`
}

export function buildWorkspaceContext(docs: DocSummary[], focus: AiFocus | null): string {
  if (docs.length === 0) return 'Workspace: no documents are open.'
  const focusLine = focus
    ? `${focusPhrase(focus)} — unqualified references like "this document" or "this page" mean that one.`
    : 'nothing specific — if a request is ambiguous about which document, ask before editing.'
  return ['Workspace (fresh for this request):', ...docs.map(docLine), `Focus: ${focusLine}`].join(
    '\n'
  )
}
