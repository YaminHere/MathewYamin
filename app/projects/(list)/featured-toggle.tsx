'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleHomepageFeatured } from '../actions'

export function FeaturedToggle({
    projectId,
    featured,
}: {
    projectId: string
    featured: boolean
}) {
    const [isPending, startTransition] =
        useTransition()

    const router = useRouter()

    function handleToggle() {
        startTransition(async () => {
            await toggleHomepageFeatured(
                projectId,
                !featured
            )

            router.refresh()
        })
    }

    return (
        <button
            type="button"
            onClick={handleToggle}
            disabled={isPending}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
                featured
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
            }`}
        >
            {isPending
                ? 'Saving...'
                : featured
                  ? '✓ Featured'
                  : '+ Feature'}
        </button>
    )
}