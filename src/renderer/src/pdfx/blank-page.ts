import { PDFDocument } from 'pdf-lib'

export async function blankPageBytes(width: number, height: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.addPage([width, height])
  return doc.save()
}
