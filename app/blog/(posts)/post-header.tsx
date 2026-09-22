'use client'

import { usePathname } from 'next/navigation'
import { BlogData } from '../utils'

export function PostHeader({
    blogs,
}: {
    blogs: BlogData[]
}) {
    const pathname = usePathname()
    const blog = blogs.find((p) => p.link === pathname)

    if (!blog) return null

    const { name, video } = blog
    const isVideo =
        video.endsWith('.mp4') ||
        video.endsWith('.webm') ||
        video.endsWith('.ogg')
    const isGoogleDrive =
        video.includes('drive.google.com') && video.includes('/preview')

    return (
        <>

            <div className="mb-12 flex flex-col-reverse items-start gap-6 md:flex-row md:items-center md:justify-between">

                <div className="relative w-full max-w-20 shrink-0 overflow-hidden rounded-xl">
                    {isGoogleDrive ? (
                        <iframe
                            src={video}
                            className="aspect-video w-full"
                            allow="autoplay"
                        />
                    ) : isVideo ? (
                        <video
                            src={video}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full"
                        />
                    ) : (
                        <img
                            src={video}
                            alt={name}
                            className="w-full object-cover"
                        />
                    )}
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-3xl">
                    {name}
                </h1>

            </div>
        </>
    )
}
