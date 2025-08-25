import React, { useState } from 'react'
import Image from 'next/image'


interface BookCoverProps {
  imageSrc: string
  alt?: string
  className?: string
  isLoading?: boolean
  onLoad?: () => void
  onClick?: () => void
}

const BookCover: React.FC<BookCoverProps> = ({
  imageSrc,
  alt = "Book cover",
  className = "",
  isLoading = false,
  onLoad,
  onClick
}) => {
  const [imageLoaded, setImageLoaded] = useState(false)

  const handleImageLoad = () => {
    setImageLoaded(true)
    if (onLoad) {
      onLoad()
    }
  }

  const showSkeleton = isLoading || !imageLoaded

  return (
    <div
      className={`relative group cursor-pointer transform ${className}`}
      onClick={onClick}
    >
      <div className="relative overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-lg border border-white/20">
        <div className="relative">
          <div className="relative overflow-hidden rounded-2xl">
            {/* Fixed container for consistent sizing with proper aspect ratio */}
            <div className="w-[300px] h-[400px] relative">
              {/* Skeleton Loading State */}
              {showSkeleton && (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 animate-pulse">
                  {/* Simple shimmer overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                </div>
              )}

              {/* Actual Image */}
              {!isLoading && (
                <Image
                  src={imageSrc}
                  alt={alt}
                  fill
                  className={`object-cover brightness-110 transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                  sizes="300px"
                  onLoad={handleImageLoad}
                  onError={() => {
                    setImageLoaded(true)
                    if (onLoad) onLoad()
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Glowing background effect */}
      <div className="absolute -inset-1 bg-gradient-to-br from-purple-500/20 via-transparent to-blue-500/20 rounded-3xl opacity-100 -z-10 blur-xl animate-pulse" />
    </div>
  )
}

export default BookCover