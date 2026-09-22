import type { MDXComponents } from 'mdx/types'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    Cover: ({
      src,
      alt,
      caption,
    }: {
      src: string
      alt: string
      caption: string
    }) => {
      const isVideo = src.endsWith('.mp4') || src.endsWith('.webm') || src.endsWith('.ogg')
      const isGoogleDrive = src.includes('drive.google.com') && src.includes('/preview')

      return (
        <figure className="max-w-30 project-cover">
          {isGoogleDrive ? (
            <iframe
              src={src}
              className="aspect-video w-full rounded-xl"
              allow="autoplay"
            />
          ) : isVideo ? (
            <video
              src={src}
              autoPlay
              loop
              muted
              playsInline
              className="rounded-xl w-full"
            />
          ) : (
            <img src={src} alt={alt} className="rounded-xl w-full" />
          )}
          {caption && <figcaption className="text-center mt-2 text-sm text-zinc-500">{caption}</figcaption>}
        </figure>
      )
    },
  }
}
