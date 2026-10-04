'use client'

import { useState } from 'react'

type EditableDescriptionProps = {
    projectId: string
    initialDescription?: string
    isAdmin: boolean
}

export function EditableDescription({
    projectId,
    initialDescription,
    isAdmin,
}: EditableDescriptionProps) {
    const [description, setDescription] = useState(
        initialDescription ?? ''
    )

    const [draft, setDraft] = useState(
        initialDescription ?? ''
    )

    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const hasDescription = description.trim().length > 0

    if (!isAdmin && !hasDescription) {
        return null
    }

    async function saveDescription() {
        setSaving(true)
        setError(null)

        try {
            const response = await fetch(
                `/api/work/${encodeURIComponent(projectId)}/description`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        description: draft,
                    }),
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        'Failed to save description'
                )
            }

            setDescription(data.description ?? '')
            setDraft(data.description ?? '')
            setEditing(false)
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : 'Failed to save description'
            )
        } finally {
            setSaving(false)
        }
    }

    function cancelEditing() {
        setDraft(description)
        setError(null)
        setEditing(false)
    }

    if (editing) {
        return (
            <div className="mt-8 max-w-2xl">
                <textarea
                    autoFocus
                    value={draft}
                    onChange={(event) =>
                        setDraft(event.target.value)
                    }
                    placeholder="Add a project description..."
                    rows={5}
                    className="w-full resize-none rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-base leading-relaxed outline-none transition-colors focus:border-black/30 dark:border-white/10 dark:bg-zinc-900/70 dark:focus:border-white/30"
                />

                {error && (
                    <p className="mt-2 text-xs text-red-500">
                        {error}
                    </p>
                )}

                <div className="mt-3 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={saveDescription}
                        disabled={saving}
                        className="rounded-full bg-black px-3 py-1.5 text-[9px] uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-70 disabled:opacity-40 dark:bg-white dark:text-black"
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>

                    <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={saving}
                        className="rounded-full border border-black/10 px-3 py-1.5 text-[9px] uppercase tracking-[0.12em] text-black/50 transition-colors hover:border-black/20 hover:text-black disabled:opacity-40 dark:border-white/10 dark:text-white/50 dark:hover:border-white/20 dark:hover:text-white"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="mt-8 flex max-w-3xl items-start gap-3">
            <div className="min-w-0 flex-1">
                {hasDescription ? (
                    <p className="text-lg leading-relaxed text-black/50 dark:text-white/50">
                        {description}
                    </p>
                ) : (
                    <p className="text-sm italic text-black/25 dark:text-white/25">
                        Add a project description
                    </p>
                )}
            </div>

            {isAdmin && (
                <button
                    type="button"
                    onClick={() => {
                        setDraft(description)
                        setEditing(true)
                    }}
                    className="shrink-0 rounded-full border border-black/10 px-2.5 py-1 text-[8px] uppercase tracking-[0.12em] text-black/40 transition-colors hover:border-black/20 hover:bg-black hover:text-white dark:border-white/10 dark:text-white/40 dark:hover:bg-white dark:hover:text-black"
                >
                    Edit
                </button>
            )}
        </div>
    )
}