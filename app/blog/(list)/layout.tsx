import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Blog - Yamin Mathew',
    description: 'Calculated thoughts and some other stuff.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children
}
