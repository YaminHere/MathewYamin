'use client'
import { TextEffect } from '@/components/ui/text-effect'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

export function Header() {
  const pathname = usePathname()

  if (pathname.startsWith('/blog') || pathname.startsWith('/projects')) return null

  return (
    <header className="mb-8 flex items-center justify-between">
      <div>
        <Link href="/" className="font-medium text-black dark:text-white">
          Yamin Mathew
        </Link>
        <TextEffect
          as="p"
          preset="fade"
          per="char"
          className="text-zinc-600 dark:text-zinc-500"
          delay={0.5}
        >
          Product & Growth Designer
        </TextEffect>
      </div>
      <motion.a
        href="https://drive.google.com/uc?export=download&id=19WqHnQ0AFrlN2nfGJwWO8XMJK3QoOWQg"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0 }}
        animate={{ opacity: .5 }}
        transition={{ duration: 0.8, ease: 'easeIn' }}
        whileHover={{ opacity: 1 }}

        className="relative overflow-hidden rounded-xl border border-zinc-200/40 px-3 py-1.5 text-sm text-zinc-700 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] dark:border-zinc-200/20 dark:text-zinc-300 dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
      >
        Download CV
      </motion.a>
    </header>
  )
}
