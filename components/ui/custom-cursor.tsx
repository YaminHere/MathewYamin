'use client'

import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false)
  const [visible, setVisible] = useState(false)

  const x = useMotionValue(-100)
  const y = useMotionValue(-100)

const magneticX = useMotionValue(0)
const magneticY = useMotionValue(0)

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

  const smoothMagneticX = useSpring(magneticX, {
  stiffness: 180,
  damping: 24,
  mass: 0.4,
})

const smoothMagneticY = useSpring(magneticY, {
  stiffness: 180,
  damping: 24,
  mass: 0.4,
})

const finalX = useTransform(
  () => cursorX.get() + smoothMagneticX.get()
)

const finalY = useTransform(
  () => cursorY.get() + smoothMagneticY.get()
)

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

        const pointerX = event.clientX
        const pointerY = event.clientY

        x.set(pointerX)
        y.set(pointerY)

        const targets = document.querySelectorAll<HTMLElement>(
            'a, button, [role="button"], input, textarea, select, [data-magnetic]'
            )

            let nearestDistance = 90
            let targetRect: DOMRect | undefined

            for (const element of targets) {
            const rect = element.getBoundingClientRect()

            if (!rect.width || !rect.height) continue

            const nearestX = Math.max(rect.left, Math.min(pointerX, rect.right))
            const nearestY = Math.max(rect.top, Math.min(pointerY, rect.bottom))

            const distance = Math.hypot(
                pointerX - nearestX,
                pointerY - nearestY
            )

            if (distance < nearestDistance) {
                nearestDistance = distance
                targetRect = rect
            }
            }

            if (targetRect) {
            const dx = targetRect.left + targetRect.width / 2 - pointerX
            const dy = targetRect.top + targetRect.height / 2 - pointerY
            const distance = Math.hypot(dx, dy)

            const strength = 1 - nearestDistance / 90
            const pull = Math.min(12, distance) * strength

            magneticX.set(distance ? (dx / distance) * pull : 0)
            magneticY.set(distance ? (dy / distance) * pull : 0)
            } else {
            magneticX.set(0)
            magneticY.set(0)
            }

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
    x: finalX,
    y: finalY,
    opacity: visible ? 1 : 0,
    pointerEvents: 'none',
    zIndex: 99999,
    width: 18,
    height: 19,
  }}
/>
  )
}