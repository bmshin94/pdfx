import type { ElementPoint } from '../elements/types'

export const SIGNATURE_DEFAULT_WIDTH = 0.22

const SAMPLES = 64
const LOOPS = 4.5
const HEIGHT_RATIO = 0.28
const SWASH_START = 0.82

export function signaturePoints(
  x: number,
  y: number,
  width: number,
  pageWidth: number,
  pageHeight: number
): ElementPoint[] {
  const height = (width * pageWidth * HEIGHT_RATIO) / pageHeight
  const points: ElementPoint[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES
    const taper = 1 - 0.55 * t
    let dy = -Math.abs(Math.sin(t * LOOPS * Math.PI)) * taper
    dy += 0.18 * Math.sin(t * 2 * LOOPS * Math.PI) * taper
    if (t > SWASH_START) {
      const s = (t - SWASH_START) / (1 - SWASH_START)
      dy = 0.25 * Math.sin(s * Math.PI)
    }
    points.push({ x: x + t * width, y: y + dy * height })
  }
  return points
}
