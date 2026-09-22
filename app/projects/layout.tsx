import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Projects - Yamin Mathew',
  description: 'All projects and works by Yamin Mathew.',
}

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
