import { copyFileSync, mkdirSync, readdirSync, rmSync, existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const FILES = [
  'jbig2.wasm',
  'jbig2_nowasm_fallback.js',
  'openjpeg.wasm',
  'openjpeg_nowasm_fallback.js',
  'qcms_bg.wasm'
]

const FONT_FILES = [
  'DejaVuSans.ttf',
  'DejaVuSans-Bold.ttf',
  'DejaVuSans-Oblique.ttf',
  'DejaVuSansCondensed.ttf',
  'DejaVuSansCondensed-Bold.ttf',
  'DejaVuSerif.ttf',
  'DejaVuSerif-Bold.ttf',
  'DejaVuSansMono.ttf'
]

const root = fileURLToPath(new URL('../', import.meta.url))
const src = join(root, 'node_modules', 'pdfjs-dist', 'wasm')
const fontDir = join(root, 'node_modules', 'dejavu-fonts-ttf', 'ttf')
const dest = join(root, 'resources', 'pdf')

if (!existsSync(src)) {
  console.warn('[copy-pdf-assets] pdfjs-dist not installed yet; skipping.')
  process.exit(0)
}

rmSync(dest, { recursive: true, force: true })
mkdirSync(dest, { recursive: true })

let bytes = 0
for (const f of FILES) {
  copyFileSync(join(src, f), join(dest, f))
  bytes += statSync(join(dest, f)).size
}
let fonts = 0
for (const f of FONT_FILES) {
  const fontSrc = join(fontDir, f)
  if (!existsSync(fontSrc)) {
    console.warn(`[copy-pdf-assets] ${f} not found (dejavu-fonts-ttf not installed yet).`)
    continue
  }
  copyFileSync(fontSrc, join(dest, f))
  bytes += statSync(join(dest, f)).size
  fonts++
}

const standardSrc = join(root, 'node_modules', 'pdfjs-dist', 'standard_fonts')
const standardDest = join(dest, 'standard_fonts')
mkdirSync(standardDest, { recursive: true })
for (const f of readdirSync(standardSrc)) {
  copyFileSync(join(standardSrc, f), join(standardDest, f))
  bytes += statSync(join(standardDest, f)).size
}

const mb = (bytes / 1024 / 1024).toFixed(1)
console.log(
  `[copy-pdf-assets] Staged ${FILES.length} pdf.js decoder files + ${fonts} fonts → resources/pdf (${mb} MB).`
)
