import type { DocBridge } from '../doc-bridge'

export interface AiActivityTracker {
  run<T>(pageId: string, task: () => Promise<T>, mutates?: boolean): Promise<T>
  touch(pageId: string): void
}

export const withActivity = (bridge: DocBridge, tracker: AiActivityTracker): DocBridge => ({
  ...bridge,
  readPage: (pageId) => tracker.run(pageId, () => bridge.readPage(pageId)),
  listFormFields: (pageId) => tracker.run(pageId, () => bridge.listFormFields(pageId)),
  replaceText: (pageId, replacements) =>
    tracker.run(pageId, () => bridge.replaceText(pageId, replacements), true),
  addText: (pageId, text, x, y, fontSize) =>
    tracker.run(pageId, () => bridge.addText(pageId, text, x, y, fontSize), true),
  markText: (pageId, kind, text) =>
    tracker.run(pageId, () => bridge.markText(pageId, kind, text), true),
  clearMarks: (pageId, kind) => tracker.run(pageId, () => bridge.clearMarks(pageId, kind), true),
  sign: (pageId, x, y, width) => tracker.run(pageId, () => bridge.sign(pageId, x, y, width), true),
  fillFormField: (pageId, fieldName, value) =>
    tracker.run(pageId, () => bridge.fillFormField(pageId, fieldName, value), true),
  movePage: (pageId, targetDocId, position) =>
    tracker.run(pageId, () => bridge.movePage(pageId, targetDocId, position), true),
  deletePage: (pageId) => tracker.run(pageId, () => bridge.deletePage(pageId), true),
  insertPage: async (docId, position) => {
    const pageId = await bridge.insertPage(docId, position)
    if (pageId) tracker.touch(pageId)
    return pageId
  }
})
