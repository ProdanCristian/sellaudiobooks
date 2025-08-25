"use client"

import { useState } from 'react'
import Image from 'next/image'
import { KeyedMutator } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BookOpen, RefreshCw, X, Download } from 'lucide-react'

interface Chapter {
  id: string
  title: string
  content: string
  order: number
  wordCount: number
  createdAt: string
  updatedAt: string
}

interface Outline {
  id: string
  suggestions: string[]
  chapters: {
    id: string
    title: string
    description: string
    keyPoints: string[]
    order: number
  }[]
  createdAt: string
  updatedAt: string
}

interface AudioGeneration {
  id: string
  audioUrl: string | null
  voiceId: string
  voiceName: string
  contentType: 'CHAPTER' | 'FULL_BOOK'
  textLength: number
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  jobId?: string | null
  errorMessage?: string | null
  createdAt: string
  updatedAt: string
  chapterId?: string
}

interface Book {
  id: string
  title: string
  customInstructions?: string
  genre?: string
  targetAudience?: string
  coverImage?: string
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'PUBLISHED'
  createdAt: string
  updatedAt: string
  chapters: Chapter[]
  audioGenerations?: AudioGeneration[]
  outline?: Outline
  _count: {
    chapters: number
  }
}

interface BookInfoProps {
  book: Book
  bookId: string
  totalWords: number
  statusConfig: Record<string, { label: string; color: string }>
  mutate: KeyedMutator<Book>
}

export default function BookInfo({
  book,
  bookId,
  totalWords,
  statusConfig,
  mutate
}: BookInfoProps) {
  const [isRegeneratingCover, setIsRegeneratingCover] = useState(false)
  const [editingCover, setEditingCover] = useState(false)
  const [customCoverPrompt, setCustomCoverPrompt] = useState('')

  // Cover regeneration handlers
  const handleRegenerateCover = () => {
    setEditingCover(true)
    setCustomCoverPrompt('')
  }

  const handleCancelCoverEdit = () => {
    setEditingCover(false)
    setCustomCoverPrompt('')
  }

  const handleCoverGeneration = async (customPrompt?: string) => {
    if (!book) return

    setIsRegeneratingCover(true)
    setEditingCover(false)

    try {
      const response = await fetch('/api/generation/cover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: book.title,
          customPrompt: customPrompt?.trim(),
          bookId: bookId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate cover')
      }

      const data = await response.json()
      const newCoverUrl = data.imageUrl || data.fallbackUrl || '/cover.png'

      // Update the book with the new cover
      const updateResponse = await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverImage: newCoverUrl })
      })

      if (updateResponse.ok) {
        // Update SWR cache with new cover
        mutate({ ...book!, coverImage: newCoverUrl }, { revalidate: false })
      } else {
        console.error('Failed to update book with new cover:', await updateResponse.text())
        throw new Error('Failed to update book with new cover')
      }
    } catch (error) {
      console.error('Error generating cover:', error)
      alert('Failed to generate cover. Please try again.')
    } finally {
      setIsRegeneratingCover(false)
    }
  }

  const handleCustomCoverUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      setIsRegeneratingCover(true)

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('bookId', bookId)
        formData.append('bookTitle', book.title)

        const response = await fetch('/api/media/upload-cover', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error('Failed to upload cover')
        }

        const data = await response.json()
        const newCoverUrl = data.imageUrl

        // Update the book with the new cover
        const updateResponse = await fetch(`/api/books/${bookId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coverImage: newCoverUrl })
        })

        if (updateResponse.ok) {
          mutate({ ...book!, coverImage: newCoverUrl }, { revalidate: false })
        } else {
          console.error('Failed to update book with uploaded cover:', await updateResponse.text())
          throw new Error('Failed to update book with uploaded cover')
        }
      } catch (error) {
        console.error('Error uploading cover:', error)
        alert('Failed to upload cover. Please try again.')
      } finally {
        setIsRegeneratingCover(false)
      }
    }

    input.click()
  }

  const handleDownloadCover = async () => {
    if (!book.coverImage) {
      alert('No cover image available to download')
      return
    }

    try {
      // Generate filename
      const fileName = `${book.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_cover.jpg`
      
      // Use server-side proxy for all downloads to avoid CORS issues
      const downloadUrl = `/api/media/download-cover?url=${encodeURIComponent(book.coverImage)}&filename=${encodeURIComponent(fileName)}`
      
      // Create download link
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = fileName
      link.style.display = 'none'
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      
    } catch (error) {
      console.error('Error downloading cover:', error)
      
      // Fallback: try to open the image URL directly
      try {
        window.open(book.coverImage, '_blank', 'noopener,noreferrer')
        alert('Could not download automatically. The image has been opened in a new tab. Right-click and select "Save image as..." to download it.')
      } catch (openError) {
        alert('Failed to download cover. Please try copying the image URL manually.')
      }
    }
  }

  return (
    <div className="mb-6 space-y-4 text-center">
      {/* Book Cover */}
      <div className="flex justify-center">
        <div className="relative w-40 h-52 max-w-[160px] group">
          <div className="border relative overflow-hidden rounded-2xl shadow-lg">
            <div className="aspect-[3/4] w-full relative">
              {isRegeneratingCover ? (
                <div className="w-full h-full bg-gradient-to-br from-muted/50 to-muted animate-pulse">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                </div>
              ) : book.coverImage ? (
                <Image
                  src={book.coverImage}
                  alt={`Cover for ${book.title}`}
                  width={300}
                  height={500}
                  className="object-cover w-full h-full"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          {/* Cover action buttons */}
          <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 space-y-1">
            <Button
              size="sm"
              variant="secondary"
              className="w-full h-7 text-xs backdrop-blur-sm bg-white/90 hover:bg-white text-black border-0"
              onClick={handleRegenerateCover}
              disabled={isRegeneratingCover}
            >
              {isRegeneratingCover ? (
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Generate Cover
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="w-full h-7 text-xs backdrop-blur-sm bg-white/90 hover:bg-white text-black border-0"
              onClick={handleCustomCoverUpload}
              disabled={isRegeneratingCover}
            >
              <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              Upload Cover
            </Button>
            {book.coverImage && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full h-7 text-xs backdrop-blur-sm bg-white/90 hover:bg-white text-black border-0"
                onClick={handleDownloadCover}
                disabled={isRegeneratingCover}
              >
                <Download className="h-3 w-3 mr-1" />
                Download Cover
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Book Details */}
      <div className="space-y-2">
        <h1 className="text-xl font-bold">{book.title}</h1>
        <div className="flex items-center justify-center gap-2">
          <div className={`text-xs px-2 py-1 rounded-full font-medium ${statusConfig[book.status].color} pointer-events-none`}>
            {statusConfig[book.status].label}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
          <div className="flex items-center">
            <BookOpen className="h-3 w-3 mr-1" />
            {book.chapters.length} chapters • {totalWords.toLocaleString()} words
          </div>
        </div>
      </div>

      {/* Cover Editing Interface */}
      {editingCover && (
        <div className="mt-3 space-y-2">
          <Input
            value={customCoverPrompt}
            onChange={(e) => setCustomCoverPrompt(e.target.value)}
            className="h-8 text-center text-sm"
            placeholder="Add style details (optional)..."
            maxLength={150}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleCoverGeneration(customCoverPrompt)
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                handleCancelCoverEdit()
              }
            }}
            autoFocus
          />
          <div className="flex gap-1 justify-center">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={() => handleCoverGeneration(customCoverPrompt)}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Generate
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={handleCancelCoverEdit}
            >
              <X className="h-3 w-3 text-red-600" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}