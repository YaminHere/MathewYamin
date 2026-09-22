import fs from 'fs'
import path from 'path'

export type BlogData = {
    id: string
    name: string
    description: string
    video: string
    link: string // Computed from folder name
}

export async function getBlogs(): Promise<BlogData[]> {
    const blogsDir = path.join(process.cwd(), 'app/blog/(posts)')

    // Create directory if it doesn't exist to prevent errors
    if (!fs.existsSync(blogsDir)) {
        return []
    }

    const entries = await fs.promises.readdir(blogsDir, { withFileTypes: true })

    const blogs = await Promise.all(
        entries
            .filter((entry) => entry.isDirectory())
            .map(async (entry) => {
                const blogDir = path.join(blogsDir, entry.name)
                const jsonPath = path.join(blogDir, 'blog.json')
                const mdxPath = path.join(blogDir, 'page.mdx')

                try {
                    // Read JSON for base metadata
                    let data: any = { id: entry.name, name: entry.name, description: '', video: '' }
                    try {
                        const jsonContent = await fs.promises.readFile(jsonPath, 'utf-8')
                        data = JSON.parse(jsonContent)
                    } catch (e) {
                        // Fallback if json missing
                    }

                    // Try to read MDX for title and description override
                    let mdxName = null
                    let mdxDescription = null
                    let mdxVideo = null

                    try {
                        const mdxContent = await fs.promises.readFile(mdxPath, 'utf-8')

                        // Extract Title (# Title)
                        const titleMatch = mdxContent.match(/^#\s+(.+)$/m)
                        if (titleMatch) {
                            mdxName = titleMatch[1].trim()
                        }

                        // Extract Description:
                        // 1. Explicit export: export const description = "..."
                        const exportMatch = mdxContent.match(/export\s+const\s+description\s*=\s*(['"`])(.*?)\1/)
                        if (exportMatch) {
                            mdxDescription = exportMatch[2]
                        } else {
                            // 2. Fallback: First valid paragraph
                            // Remove title
                            const contentWithoutTitle = mdxContent.replace(/^#\s+.+$/m, '')

                            // Improved logic to skip multi-line components
                            let inComponent = false
                            const lines = contentWithoutTitle.split('\n')

                            for (const line of lines) {
                                let trimmed = line.trim()
                                if (!trimmed) continue
                                if (trimmed.startsWith('import')) continue
                                if (trimmed.startsWith('export')) continue
                                if (trimmed.startsWith('#')) continue
                                if (trimmed.startsWith('```')) continue

                                // Check if we are inside a component
                                if (trimmed.startsWith('<') && !trimmed.includes('/>')) {
                                    inComponent = true
                                    continue
                                }
                                if (inComponent) {
                                    if (trimmed.includes('/>')) {
                                        inComponent = false
                                    }
                                    continue
                                }
                                // Single line component <... />
                                if (trimmed.startsWith('<') && trimmed.includes('/>')) continue

                                if (trimmed.startsWith('<')) continue // Safety net for open tag

                                mdxDescription = trimmed
                                break
                            }
                        }

                        // Extract Cover Image/Video
                        // Matches <Cover ... src="..." ... />
                        const coverMatch = mdxContent.match(/<Cover[^>]*\s+src=(["'])(.*?)\1/)
                        if (coverMatch) {
                            mdxVideo = coverMatch[2]
                        }

                    } catch (e) {
                        // Ignore if MDX missing or read fails
                    }

                    return {
                        ...data,
                        name: mdxName || data.name,
                        description: mdxDescription || data.description,
                        video: mdxVideo || data.video,
                        link: `/blog/${entry.name}`,
                    } as BlogData
                } catch (error) {
                    console.warn(`Failed to read blog data for ${entry.name}`, error)
                    return null
                }
            })
    )

    return blogs.filter((p): p is BlogData => p !== null)
}
