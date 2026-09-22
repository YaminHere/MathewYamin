'use client'

import { motion } from 'motion/react'
import { XIcon, ArrowUpRight } from 'lucide-react'
import {
    MorphingDialog,
    MorphingDialogTrigger,
    MorphingDialogContent,
    MorphingDialogClose,
    MorphingDialogContainer,
} from '@/components/ui/morphing-dialog'
import { ProjectData } from '../utils'

const VARIANTS_CONTAINER = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
        },
    },
}

const VARIANTS_SECTION = {
    hidden: { opacity: 0, y: 20, filter: 'blur(8px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
}

const TRANSITION_SECTION = {
    duration: 0.3,
}

type ProjectVideoProps = {
    src: string
}

function ProjectVideo({ src }: ProjectVideoProps) {
    const isVideo = src.endsWith('.mp4') || src.endsWith('.webm') || src.endsWith('.ogg')
    const isGoogleDrive = src.includes('drive.google.com') && src.includes('/preview')

    return (
        <MorphingDialog
            transition={{
                type: 'spring',
                bounce: 0,
                duration: 0.3,
            }}
        >
            <MorphingDialogTrigger>
                {isGoogleDrive ? (
                    <iframe
                        src={src}
                        className="aspect-video w-full cursor-zoom-in rounded-xl pointer-events-none"
                    />
                ) : isVideo ? (
                    <video
                        src={src}
                        autoPlay
                        loop
                        muted
                        className="aspect-video w-full cursor-zoom-in rounded-xl object-cover"
                    />
                ) : (
                    <img
                        src={src}
                        alt="Project preview"
                        className="aspect-video w-full cursor-zoom-in rounded-xl object-cover"
                    />
                )}
            </MorphingDialogTrigger>
            <MorphingDialogContainer>
                <MorphingDialogContent className="relative aspect-video rounded-2xl bg-zinc-50 p-1 ring-1 ring-zinc-200/50 ring-inset dark:bg-zinc-950 dark:ring-zinc-800/50">
                    {isGoogleDrive ? (
                        <iframe
                            src={src}
                            className="aspect-video h-[50vh] w-full rounded-xl md:h-[70vh]"
                            allow="autoplay"
                        />
                    ) : isVideo ? (
                        <video
                            src={src}
                            autoPlay
                            loop
                            muted
                            className="aspect-video h-[50vh] w-full rounded-xl object-cover md:h-[70vh]"
                        />
                    ) : (
                        <img
                            src={src}
                            alt="Project preview enlarged"
                            className="aspect-video h-[50vh] w-full rounded-xl object-cover md:h-[70vh]"
                        />
                    )}
                </MorphingDialogContent>
                <MorphingDialogClose
                    className="fixed top-6 right-6 h-fit w-fit rounded-full bg-white p-1"
                    variants={{
                        initial: { opacity: 0 },
                        animate: {
                            opacity: 1,
                            transition: { delay: 0.3, duration: 0.1 },
                        },
                        exit: { opacity: 0, transition: { duration: 0 } },
                    }}
                >
                    <XIcon className="h-5 w-5 text-zinc-500" />
                </MorphingDialogClose>
            </MorphingDialogContainer>
        </MorphingDialog>
    )
}

export function ProjectsList({ projects }: { projects: ProjectData[] }) {
    return (
        <motion.div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2"
            variants={VARIANTS_CONTAINER}
            initial="hidden"
            animate="visible"
        >
            {projects.map((project) => (
                <motion.div
                    key={project.id}
                    className="space-y-2"
                    variants={VARIANTS_SECTION}
                    transition={TRANSITION_SECTION}
                >
                    <div className="relative rounded-2xl bg-zinc-50/40 p-1 ring-1 ring-zinc-200/50 ring-inset dark:bg-zinc-950/40 dark:ring-zinc-800/50">
                        <ProjectVideo src={project.video} />
                    </div>
                    <div className="px-1">
                        <a
                            className="font-base group relative inline-flex items-center gap-1.5 font-[450] text-zinc-900 dark:text-zinc-50"
                            href={project.link}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {project.name}
                            <ArrowUpRight className="h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
                            <span className="absolute bottom-0.5 left-0 block h-[1px] w-full max-w-0 bg-zinc-900 transition-all duration-200 group-hover:max-w-full"></span>
                        </a>
                        <p className="text-base text-zinc-600 dark:text-zinc-400">
                            {project.description}
                        </p>
                    </div>
                </motion.div>
            ))}
        </motion.div>
    )
}
