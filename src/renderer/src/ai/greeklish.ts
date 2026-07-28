const LOWER: Record<string, string> = {
  a: 'α',
  b: 'β',
  c: 'κ',
  d: 'δ',
  e: 'ε',
  f: 'φ',
  g: 'γ',
  h: 'η',
  i: 'ι',
  j: 'ξ',
  k: 'κ',
  l: 'λ',
  m: 'μ',
  n: 'ν',
  o: 'ο',
  p: 'π',
  q: 'θ',
  r: 'ρ',
  s: 'σ',
  t: 'τ',
  u: 'υ',
  v: 'β',
  w: 'ω',
  x: 'χ',
  y: 'ψ',
  z: 'ζ'
}

export function toGreeklish(text: string): string {
  let out = ''
  for (const ch of text) {
    const lower = ch.toLowerCase()
    const mapped = LOWER[lower]
    if (!mapped) {
      out += ch
    } else {
      out += ch === lower ? mapped : mapped.toUpperCase()
    }
  }
  return out
}
