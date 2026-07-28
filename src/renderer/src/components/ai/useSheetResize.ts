import { useRef, useState } from 'react'

const DEFAULT_HEIGHT = 220
const MAX_HEIGHT = 440
const SNAP_CLOSED_BELOW = 48
const COMPACT_BELOW = 56
const TAP_SLOP_PX = 4

interface DragState {
  pointerId: number
  startY: number
  startHeight: number
  moved: boolean
}

const clamp = (value: number): number => Math.min(MAX_HEIGHT, Math.max(0, value))

export function useSheetResize() {
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const [resizing, setResizing] = useState(false)
  const lastOpenRef = useRef(DEFAULT_HEIGHT)
  const dragRef = useRef<DragState | null>(null)

  const measure = (handle: HTMLElement): number => {
    const messages = handle.closest('.ai-chat')?.querySelector('.ai-chat-messages')
    return messages instanceof HTMLElement ? messages.clientHeight : height
  }

  const desiredAt = (drag: DragState, clientY: number): number =>
    clamp(drag.startHeight + (drag.startY - clientY))

  const handleProps = {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>): void => {
      dragRef.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        startHeight: measure(event.currentTarget),
        moved: false
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      setResizing(true)
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>): void => {
      const drag = dragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return
      if (Math.abs(event.clientY - drag.startY) > TAP_SLOP_PX) drag.moved = true
      if (drag.moved) setHeight(desiredAt(drag, event.clientY))
    },
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>): void => {
      const drag = dragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return
      dragRef.current = null
      setResizing(false)
      if (!drag.moved) {
        if (drag.startHeight === 0) {
          setHeight(lastOpenRef.current)
        } else {
          lastOpenRef.current = Math.max(drag.startHeight, SNAP_CLOSED_BELOW)
          setHeight(0)
        }
        return
      }
      const released = desiredAt(drag, event.clientY)
      if (released < SNAP_CLOSED_BELOW) setHeight(0)
      else lastOpenRef.current = released
    },
    onPointerCancel: (event: React.PointerEvent<HTMLDivElement>): void => {
      if (dragRef.current?.pointerId !== event.pointerId) return
      dragRef.current = null
      setResizing(false)
    }
  }

  return { height, collapsed: height < COMPACT_BELOW, resizing, handleProps }
}
