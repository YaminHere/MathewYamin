'use client'

import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false)
  const [visible, setVisible] = useState(false)

  const x = useMotionValue(-100)
  const y = useMotionValue(-100)

  const cursorX = useSpring(x, {
    stiffness: 1000,
    damping: 55,
    mass: 0.2,
  })

  const cursorY = useSpring(y, {
    stiffness: 1000,
    damping: 55,
    mass: 0.2,
  })

  useEffect(() => {
    const pointerQuery = window.matchMedia(
      '(hover: hover) and (pointer: fine)'
    )
    const motionQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    )

    const updateEnabled = () => {
      setEnabled(pointerQuery.matches && !motionQuery.matches)
    }

    updateEnabled()

    pointerQuery.addEventListener('change', updateEnabled)
    motionQuery.addEventListener('change', updateEnabled)

    return () => {
      pointerQuery.removeEventListener('change', updateEnabled)
      motionQuery.removeEventListener('change', updateEnabled)
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      document.documentElement.classList.remove('custom-cursor-enabled')
      setVisible(false)
      return
    }

    document.documentElement.classList.add('custom-cursor-enabled')

    const handleMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      x.set(event.clientX)
      y.set(event.clientY)
      setVisible(true)
    }

    const handleLeave = () => setVisible(false)

    window.addEventListener('pointermove', handleMove)
    document.documentElement.addEventListener('mouseleave', handleLeave)

    return () => {
      window.removeEventListener('pointermove', handleMove)
      document.documentElement.removeEventListener('mouseleave', handleLeave)
      document.documentElement.classList.remove('custom-cursor-enabled')
    }
  }, [enabled, x, y])

  if (!enabled) return null

  return (
    <motion.img
  src="/Cursor.svg"
  alt=""
  aria-hidden="true"
  draggable={false}
  style={{
    position: 'fixed',
    left: 0,
    top: 0,
    x: cursorX,
    y: cursorY,
    opacity: visible ? 1 : 0,
    pointerEvents: 'none',
    zIndex: 99999,
    width: 18,
    height: 19,
  }}
/>
  )
}