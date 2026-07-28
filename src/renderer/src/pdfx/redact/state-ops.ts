import type { Matrix } from './geometry'
import { operandNumbers } from './operands'
import type { Operand } from './operands'
import type { TextState } from './text-state'

const toMatrix = (n: number[]): Matrix => [n[0], n[1], n[2], n[3], n[4], n[5]]

export function applyStateOp(state: TextState, op: string, operands: Operand[]): boolean {
  const n = operandNumbers(operands)
  const validNums = (count: number): boolean => operands.length === count && !n.some(Number.isNaN)
  switch (op) {
    case 'q':
      state.save()
      return true
    case 'Q':
      state.restore()
      return true
    case 'cm':
      if (validNums(6)) state.concat(toMatrix(n))
      return true
    case 'BT':
      state.beginText()
      return true
    case 'Td':
    case 'TD':
      if (validNums(2)) {
        if (op === 'TD') state.leading = -n[1]
        state.moveText(n[0], n[1])
      }
      return true
    case 'Tm':
      if (validNums(6)) state.setTextMatrix(toMatrix(n))
      return true
    case 'T*':
      state.nextLine()
      return true
    case 'TL':
      if (operands.length === 1) state.leading = n[0] || 0
      return true
    case 'Tc':
      if (operands.length === 1) state.charSpace = n[0] || 0
      return true
    case 'Tw':
      if (operands.length === 1) state.wordSpace = n[0] || 0
      return true
    case 'Tz':
      if (operands.length === 1) state.hscale = (n[0] || 100) / 100
      return true
    case 'Ts':
      if (operands.length === 1) state.rise = n[0] || 0
      return true
    case 'rg':
      state.fillColor = validNums(3) ? [n[0], n[1], n[2]] : null
      return true
    case 'g':
      state.fillColor = validNums(1) ? [n[0], n[0], n[0]] : null
      return true
    case 'k':
      state.fillColor = validNums(4) ? cmykToRgb(n) : null
      return true
    case 'sc':
    case 'scn':
      state.fillColor = numericFill(operands, n)
      return true
    case 'cs':
      state.fillColor = [0, 0, 0]
      return true
    default:
      return false
  }
}

const cmykToRgb = (n: number[]): [number, number, number] => [
  (1 - n[0]) * (1 - n[3]),
  (1 - n[1]) * (1 - n[3]),
  (1 - n[2]) * (1 - n[3])
]

function numericFill(operands: Operand[], n: number[]): [number, number, number] | null {
  if (n.some(Number.isNaN)) return null
  if (operands.length === 1) return [n[0], n[0], n[0]]
  if (operands.length === 3) return [n[0], n[1], n[2]]
  if (operands.length === 4) return cmykToRgb(n)
  return null
}
