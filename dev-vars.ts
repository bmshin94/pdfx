import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const FORWARDED_KEYS = [
  'PDFX_AI_PROVIDER',
  'PDFX_AI_MODEL',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GOOGLE_GENERATIVE_AI_API_KEY'
] as const

const SECRET_SUFFIX = '_API_KEY'

function cleanValue(raw: string): string {
  let value = raw.trim()
  const hash = value.search(/\s#/)
  if (hash >= 0) value = value.slice(0, hash).trim()
  if (value.length >= 2 && `"'`.includes(value[0]) && value.endsWith(value[0])) {
    value = value.slice(1, -1)
  }
  return value
}

function parse(content: string): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const line of content.split('\n')) {
    let trimmed = line.trim()
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue
    if (trimmed.startsWith('export ')) trimmed = trimmed.slice('export '.length).trim()
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    vars[trimmed.slice(0, eq).trim()] = cleanValue(trimmed.slice(eq + 1))
  }
  return vars
}

export function devVarsDefine(rootDir: string, command: 'serve' | 'build'): Record<string, string> {
  const file = resolve(rootDir, '.dev.vars')
  const vars = existsSync(file) ? parse(readFileSync(file, 'utf8')) : {}
  const define: Record<string, string> = {}
  const embed = process.env.PDFX_EMBED_AI_KEYS === '1'
  for (const key of FORWARDED_KEYS) {
    const secret = key.endsWith(SECRET_SUFFIX)
    const omit = command === 'build' && secret && !embed
    define[`import.meta.env.${key}`] = JSON.stringify(omit ? '' : (vars[key] ?? ''))
    if (secret && command === 'build' && (vars[key] ?? '').length > 0) {
      console.warn(
        embed
          ? `[dev-vars] PDFX_EMBED_AI_KEYS=1 — baking ${key} into this build; do NOT distribute it.`
          : `[dev-vars] ${key} is set in .dev.vars but is never baked into builds.`
      )
    }
  }
  return define
}
