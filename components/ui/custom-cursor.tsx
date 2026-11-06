
'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue } from 'motion/react'
import { usePathname } from 'next/navigation'
import { CURSOR_LABELS, CURSOR_TARGETS } from '@/lib/cursor-config'

export function CustomCursor() {
  const pathname = usePathname()

  const [enabled, setEnabled] = useState(false)
  const [visible, setVisible] = useState(false)
  const [cursorLabel, setCursorLabel] = useState('')
  const [onboardingHint, setOnboardingHint] = useState('')

  const hintTextRef = useRef<SVGTextElement>(null)
  const onboardingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canvasHovered = useRef(false)
  const onboardingShown = useRef(false)
  const onboardingCompleted = useRef(false)
  const [hintTextWidth, setHintTextWidth] = useState(0)

  const x = useMotionValue(-100)
  const y = useMotionValue(-100)

  // Reset onboarding whenever the route changes.
  useEffect(() => {
    canvasHovered.current = false
    onboardingShown.current = false
    onboardingCompleted.current = false

    if (onboardingTimer.current) {
      clearTimeout(onboardingTimer.current)
      onboardingTimer.current = null
    }

    setOnboardingHint('')
  }, [pathname])

  // Canvas onboarding event listeners.
  useEffect(() => {
    const startTimer = () => {
      if (
        onboardingCompleted.current ||
        onboardingShown.current ||
        onboardingTimer.current
      ) {
        return
      }

      onboardingTimer.current = setTimeout(() => {
        onboardingShown.current = true
        onboardingTimer.current = null
        setOnboardingHint('DRAG TO EXPLORE')
      }, 800)
    }

    const handlePointerOver = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return

      const target =
        event.target instanceof Element
          ? event.target.closest('[data-cursor-target="canvas"]')
          : null

      if (!target || canvasHovered.current) return

      canvasHovered.current = true
      startTimer()
    }

    const handlePointerOut = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return

      const target =
        event.target instanceof Element
          ? event.target.closest('[data-cursor-target="canvas"]')
          : null

      const relatedTarget =
        event.relatedTarget instanceof Element
          ? event.relatedTarget.closest('[data-cursor-target="canvas"]')
          : null

      if (!target || relatedTarget) return

      canvasHovered.current = false

      if (onboardingTimer.current) {
        clearTimeout(onboardingTimer.current)
        onboardingTimer.current = null
      }

      setOnboardingHint('')
    }

    const handlePan = () => {
      if (
        onboardingShown.current &&
        !onboardingCompleted.current
      ) {
        setOnboardingHint('SCROLL TO ZOOM')
      }
    }

    const handleZoom = () => {
      onboardingCompleted.current = true

      if (onboardingTimer.current) {
        clearTimeout(onboardingTimer.current)
        onboardingTimer.current = null
      }

      setOnboardingHint('')
    }

    document.addEventListener('pointerover', handlePointerOver)
    document.addEventListener('pointerout', handlePointerOut)

    window.addEventListener('canvas-onboarding-pan', handlePan)
    window.addEventListener('canvas-onboarding-zoom', handleZoom)

    return () => {
      document.removeEventListener('pointerover', handlePointerOver)
      document.removeEventListener('pointerout', handlePointerOut)

      window.removeEventListener('canvas-onboarding-pan', handlePan)
      window.removeEventListener('canvas-onboarding-zoom', handleZoom)

      if (onboardingTimer.current) {
        clearTimeout(onboardingTimer.current)
        onboardingTimer.current = null
      }
    }
  }, [])

  // Detect whether the custom cursor should be enabled.
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

  // Track mouse movement and determine cursor labels.
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

      const contextTarget =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(
              '[data-cursor-state], [data-cursor-target], a, button, [role="button"], input, textarea, select'
            )
          : null

      let label = ''

      if (contextTarget) {
        const targetKey = contextTarget.dataset.cursorTarget as
          | keyof typeof CURSOR_TARGETS
          | undefined

        const cursorState = contextTarget.dataset.cursorState

        if (targetKey && targetKey in CURSOR_TARGETS) {
          const config = CURSOR_TARGETS[targetKey]

          const stateLabel = cursorState
            ? config.states?.[cursorState]
            : undefined

          label = CURSOR_LABELS[stateLabel ?? config.label]
        }
      }

      setCursorLabel(label)
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

  const hintRadius = 48
  const hintArcLength = hintTextWidth + 16

  const hintHalfAngle =
    (hintArcLength / (2 * hintRadius)) * (180 / Math.PI)

  const getHintPoint = (angle: number) => {
    const radians = (angle * Math.PI) / 180

    return {
      x: 90 + hintRadius * Math.cos(radians),
      y: 90 + hintRadius * Math.sin(radians),
    }
  }

  const hintStart = getHintPoint(90 + hintHalfAngle)
  const hintEnd = getHintPoint(90 - hintHalfAngle)

  const largeArc = hintArcLength > Math.PI * hintRadius ? 1 : 0

  const hintPath =
    `M ${hintStart.x} ${hintStart.y} ` +
    `A ${hintRadius} ${hintRadius} 0 ${largeArc} 0 ${hintEnd.x} ${hintEnd.y}`

  // Measure hint text when it becomes visible.
  useEffect(() => {
    if (!visible || !onboardingHint) return

    const frame = requestAnimationFrame(() => {
      const text = hintTextRef.current

      if (text) {
        setHintTextWidth(text.getComputedTextLength())
      }
    })

    return () => cancelAnimationFrame(frame)
  }, [onboardingHint, visible])

  if (!enabled) return null

  return (
    <>
      <motion.img
        src="/Cursor.svg"
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          x,
          y,
          opacity: visible ? 1 : 0,
          pointerEvents: 'none',
          zIndex: 99999,
          width: 18,
          height: 19,
        }}
      />

      <motion.div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          x,
          y,
          marginLeft: 24,
          marginTop: 8,
          opacity: visible && cursorLabel ? 1 : 0,
          pointerEvents: 'none',
          zIndex: 99999,
          padding: '5px 9px',
          borderRadius: 4,
          background: '#18181b',
          color: '#ffffff',
          fontSize: 11,
          fontWeight: 500,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          letterSpacing: '0.01em',
        }}
      >
        {cursorLabel}
      </motion.div>

      <AnimatePresence>
        {pathname === '/work' &&
          visible &&
          canvasHovered.current &&
          onboardingHint && (
            <motion.div
              key="onboarding-hint"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                left: 0,
                top: 0,
                x,
                y,
                marginLeft: 22,
                marginTop: -16,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 3,
                pointerEvents: 'none',
                zIndex: 99998,
              }}
            >
              {(onboardingHint === 'DRAG TO EXPLORE'
                ? ['DRAG TO', 'EXPLORE']
                : ['SCROLL', 'TO ZOOM']
              ).map((line) => (
                <span
                  key={line}
                  style={{
                    padding: '4px 9px',
                    borderRadius: 16,
                    background:
                      line === 'DRAG TO' || line === 'SCROLL'
                        ? '#6255F5'
                        : '#059E5E',
                    color: '#ffffff',
                    fontSize: 10,
                    fontWeight: 600,
                    lineHeight: 1,
                    letterSpacing: '0.06em',
                    whiteSpace: 'nowrap',
                    marginLeft:
                      line === 'EXPLORE' || line === 'TO ZOOM' ? 8 : 0,
                  }}
                >
                  {line}
                </span>
              ))}
            </motion.div>
          )}
      </AnimatePresence>
    </>
  )
}
