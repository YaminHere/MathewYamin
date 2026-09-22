import { ScrollProgress } from '@/components/ui/scroll-progress'
import Link from 'next/link'
import { ArrowLeftIcon } from 'lucide-react'
import { getBlogs } from '../utils'
import { PostHeader } from './post-header'
import { CopyButton } from './copy-button'

export default async function LayoutBlogPost({
    children,
}: {
    children: React.ReactNode
}) {
    const blogs = await getBlogs()

    return (
        <>
            <div className="pointer-events-none fixed left-0 top-0 z-10 h-12 w-full bg-gray-100 to-transparent backdrop-blur-xl [-webkit-mask-image:linear-gradient(to_bottom,black,transparent)] dark:bg-zinc-950" />
            <ScrollProgress
                className="fixed top-0 z-20 h-0.5 bg-gray-300 dark:bg-zinc-600"
                springOptions={{
                    bounce: 0,
                }}
            />

            <div className="absolute left-4 top-24">
                <Link
                    href="/blog"
                    className="font-base flex items-center gap-1 text-center text-sm text-zinc-500 transition-colors dark:text-zinc-400"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    <span>Back to Blog</span>
                </Link>
            </div>

            <div className="absolute right-4 top-24">
                <CopyButton />
            </div>
            <main className="mx-auto mt-24 max-w-3xl px-6 pb-20">
                <PostHeader blogs={blogs} />
                <article className="prose prose-gray prose-h4:prose-base dark:prose-invert prose-h1:text-xl prose-h1:font-medium prose-h2:mt-12 prose-h2:scroll-m-20 prose-h2:text-lg prose-h2:font-medium prose-h3:text-base prose-h3:font-medium prose-h4:font-medium prose-h5:text-base prose-h5:font-medium prose-h6:text-base prose-h6:font-medium prose-strong:font-medium">
                    {children}
                </article>
            </main>
        </>
    )
}
