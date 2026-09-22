import { getBlogs } from '../utils'
import Link from 'next/link'
import { BlogsList } from './blogs-list'

export default async function BlogPage() {
    const blogs = await getBlogs()

    return (
        <main className="mx-auto max-w-3xl px-6 py-24">
            <div className="mb-12">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                        Blog
                    </h1>
                    <Link
                        href="/"
                        className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                        Back to home
                    </Link>
                </div>
                <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">
                    Calculated thoughts and some other stuff.
                </p>
            </div>
            <BlogsList blogs={blogs} />
        </main>
    )
}
