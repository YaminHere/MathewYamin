'use client'

import { useState } from 'react'

type FavoriteButtonProps = {
    projectId: string
    initialFeatured: boolean
    isAdmin: boolean
}

export function FavoriteButton({
    projectId,
    initialFeatured,
    isAdmin,
}: FavoriteButtonProps) {
    const [featured, setFeatured] =
        useState(initialFeatured)

    const [saving, setSaving] = useState(false)

    const [error, setError] = useState<string | null>(
        null
    )

    if (!isAdmin) {
        return null
    }

    async function toggleFeatured() {
        if (saving) return

        const nextFeatured = !featured

        setSaving(true)
        setError(null)

        try {
            const response = await fetch(
                `/api/work/${encodeURIComponent(projectId)}/featured`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        featured: nextFeatured,
                    }),
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        'Failed to update selection'
                )
            }

            setFeatured(data.featured)
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : 'Failed to update selection'
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col items-start gap-2">
            <button
                type="button"
                onClick={toggleFeatured}
                disabled={saving}
                className={`rounded-full border px-3 py-1.5 text-[9px] uppercase tracking-[0.12em] transition-all ${
                    featured
                        ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                        : 'border-black/10 text-black/40 hover:border-black/20 hover:bg-black hover:text-white dark:border-white/10 dark:text-white/40 dark:hover:bg-white dark:hover:text-black'
                } disabled:cursor-wait disabled:opacity-50`}
            >
                {saving
                    ? 'Saving...'
                    : featured
                      ? '♥ Selected'
                      : '♡ Add to selected'}
            </button>

            {error && (
                <p className="text-[10px] text-red-500">
                    {error}
                </p>
            )}
        </div>
    )
}