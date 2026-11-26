'use client'
import { TextEffect } from '@/components/ui/text-effect'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

export function Header() {
  const pathname = usePathname()

  if (pathname.startsWith('/blog') || pathname.startsWith('/projects')) return null

  return (
    <header className="mb-8 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 md:grid-cols-[auto_1fr_auto] md:gap-x-5">
  <Image
    src="/images/profile.jpg"
    alt="Yamin Mathew"
    width={64}
    height={64}
    priority
    className="row-span-2 h-24 w-24 shrink-0 rounded-xl object-cover md:row-span-1 md:h-14 md:w-14"
  />

  <div className="self-end md:self-center">
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
    href="https://drive.google.com/uc?export=download&id=1usFgw6hScTIo09_DnRUBGzyBX1JkA9tk"
    target="_blank"
    rel="noopener noreferrer"
    initial={{ opacity: 0 }}
    animate={{ opacity: .5 }}
    transition={{ duration: 0.8, ease: 'easeIn' }}
    whileHover={{ opacity: 1 }}
    className="col-start-2 row-start-2 mt-1 w-fit rounded-xl border border-zinc-200/40 px-3 py-1.5 text-sm text-zinc-700 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] dark:border-zinc-200/20 dark:text-zinc-300 dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] md:col-start-3 md:row-start-1 md:mt-0"
  >
    Download CV
  </motion.a>
</header>
  )
}
