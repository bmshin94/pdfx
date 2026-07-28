import type { AiFocus } from './focus'
import type { MarkKind } from '../edit/types'

export interface PageSummary {
  pageId: string
  number: number
  width: number
  height: number
}

export interface DocSummary {
  docId: string
  name: string
  pages: PageSummary[]
}

export interface SegmentInfo {
  segment: number
  text: string
  budget: number
}

export interface Replacement {
  segment: number
  text: string
}

export interface ReplaceOutcome {
  replaced: number
  unknownSegments: number[]
}

export interface FormFieldSummary {
  name: string
  kind: 'text' | 'checkbox'
  value: string | boolean | null
}

export interface DocBridge {
  focus(): AiFocus | null
  listDocuments(): DocSummary[]
  readPage(pageId: string): Promise<SegmentInfo[]>
  replaceText(pageId: string, replacements: Replacement[]): Promise<ReplaceOutcome>
  addText(pageId: string, text: string, x: number, y: number, fontSize?: number): Promise<boolean>
  markText(pageId: string, kind: MarkKind, text: string): Promise<number>
  clearMarks(pageId: string, kind: MarkKind): Promise<number>
  sign(pageId: string, x: number, y: number, width?: number): Promise<boolean>
  movePage(pageId: string, targetDocId: string, position: number): Promise<boolean>
  insertPage(docId: string, position: number): Promise<string | null>
  deletePage(pageId: string): Promise<boolean>
  renameDocument(docId: string, name: string): boolean
  listFormFields(pageId: string): Promise<FormFieldSummary[]>
  fillFormField(pageId: string, fieldName: string, value: string | boolean): Promise<boolean>
}
