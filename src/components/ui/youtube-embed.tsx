import { useState } from 'react'
import { cn } from '@/lib/utils'

interface YouTubeEmbedProps {
  url: string
  className?: string
  title?: string
}

// Extract video ID from various YouTube URL formats
const YOUTUBE_REGEX =
  /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/

function getYouTubeVideoId(url: string): string | null {
  const match = url.match(YOUTUBE_REGEX)
  return match && match[2].length === 11 ? match[2] : null
}

/**
 * Lazy-loading YouTube embed component.
 * Shows thumbnail with play button, loads iframe on click.
 */
export function YouTubeEmbed({ url, className, title }: YouTubeEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const videoId = getYouTubeVideoId(url)

  if (!videoId) {
    return null
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`

  return (
    <div
      className={cn(
        'relative aspect-video w-full overflow-hidden rounded-lg bg-muted',
        className,
      )}
    >
      {!isLoaded ? (
        <button
          type="button"
          aria-label="Play video"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${thumbnailUrl})` }}
          onClick={() => setIsLoaded(true)}
        >
          <div className="flex h-full items-center justify-center bg-black/30">
            <div className="rounded-full bg-red-600 p-3 transition-transform hover:scale-110">
              <svg
                aria-hidden="true"
                className="size-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Play</title>
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </button>
      ) : (
        <iframe
          src={embedUrl}
          title={title || 'YouTube video'}
          className="size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  )
}

/**
 * Check if a URL is a valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  return getYouTubeVideoId(url) !== null
}
