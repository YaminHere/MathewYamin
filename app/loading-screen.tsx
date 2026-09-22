'use client'

import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useState, useRef } from 'react'
import { DotLottie } from '@lottiefiles/dotlottie-web'

export function LoadingScreen() {
    const [isLoading, setIsLoading] = useState(true)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        // Initialize Lottie animation
        if (canvasRef.current) {
            const dotLottie = new DotLottie({
                canvas: canvasRef.current,
                src: 'https://lottie.host/544653cf-0f08-4341-b4e9-9fa2ab905927/1MoeGGDIUD.lottie', // Replace with your Lottie animation URL
                loop: true,
                autoplay: true,
            })

            return () => {
                dotLottie.destroy()
            }
        }
    }, [])

    useEffect(() => {
        // Scroll to top on mount
        window.scrollTo(0, 0)

        // Hide loading screen after a short delay
        const timer = setTimeout(() => {
            setIsLoading(false)
            // Ensure we're at the top when loading ends
            window.scrollTo(0, 0)
        }, 2000)

        return () => clearTimeout(timer)
    }, [])

    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-zinc-950"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col items-center gap-4"
                    >
                        {/* Lottie animation canvas */}
                        <canvas
                            ref={canvasRef}
                            id="dotlottie-canvas"
                            style={{ width: '200px', height: '200px' }}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
