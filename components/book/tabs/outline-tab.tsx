"use client"

import { OutlineChat } from '@/components/book/outline-chat'
import { EditableOutline } from '@/components/book/editable-outline'
import { RegenerateOutlineDialog } from '@/components/book/regenerate-outline-dialog'
import { Badge } from '@/components/ui/badge'
import { List, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

interface OutlineChapter {
  id: string
  title: string
  description: string
  keyPoints: string[]
  order: number
}

interface Outline {
  id: string
  suggestions: string[]
  chapters: OutlineChapter[]
  createdAt: string
  updatedAt: string
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
  outline?: Outline
  _count: {
    chapters: number
  }
}

interface OutlineTabProps {
  book: Book
  mutate: any
  onOutlineUpdated: () => void
}

export default function OutlineTab({ book, mutate, onOutlineUpdated }: OutlineTabProps) {
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)


  const handleRegenerateOutline = async (prompt: string) => {
    setIsRegenerating(true)
    setShowRegenerateDialog(false)

    try {
      // First delete existing data
      await Promise.all([
        fetch(`/api/books/${book.id}/outline`, {
          method: 'DELETE',
        }),
        fetch(`/api/books/${book.id}/chapters`, {
          method: 'DELETE',
        })
      ])

      // Then generate new outline using simple API call
      const response = await fetch('/api/generation/outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: book.title,
          genre: book.genre || '',
          targetAudience: book.targetAudience || '',
          customization: prompt
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate outline')
      }

      const data = await response.json()

      if (data.outline) {
        await saveOutlineAndCreateChapters(data.outline)
        onOutlineUpdated()
      } else {
        throw new Error('No outline was generated')
      }
    } catch (error) {
      console.error('Error regenerating outline:', error)
    } finally {
      setIsRegenerating(false)
    }
  }

  const saveOutlineAndCreateChapters = async (outlineData: any) => {
    try {
      console.log('Starting to save outline and create chapters for:', book.title)
      console.log('Outline data:', outlineData)

      // First save the outline
      const outlineResponse = await fetch(`/api/books/${book.id}/outline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(outlineData),
      })

      if (!outlineResponse.ok) {
        const errorData = await outlineResponse.text()
        console.error('Failed to save outline:', errorData)
        throw new Error('Failed to save outline')
      }

      console.log('Outline saved successfully')

      // Then sync chapters with the outline (no content injection)
      if (outlineData.chapters && Array.isArray(outlineData.chapters)) {
        try {
          // Fetch current chapters
          const freshRes = await fetch(`/api/books/${book.id}`)
          const freshBook = freshRes.ok ? await freshRes.json() : { chapters: [] }
          const currentChapters = (freshBook.chapters || []).slice().sort((a: any, b: any) => a.order - b.order)
          const desiredChapters = outlineData.chapters

          const currentCount = currentChapters.length
          const desiredCount = desiredChapters.length
          const pairs = Math.min(currentCount, desiredCount)

          // 1) Batch reorder/retitle existing by index
          if (pairs > 0) {
            const updates = [] as Array<{ id: string, order: number, title: string }>
            for (let i = 0; i < pairs; i++) {
              const desired = desiredChapters[i]
              const actual = currentChapters[i]
              updates.push({ id: actual.id, order: i + 1, title: desired.title })
            }
            const batchRes = await fetch(`/api/books/${book.id}/chapters`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ updates })
            })
            if (!batchRes.ok) {
              console.error('Failed to batch update chapters on regeneration:', await batchRes.text())
            }
          }

          // 2) Create missing chapters with empty content
          if (desiredCount > currentCount) {
            const createPromises: Promise<any>[] = []
            for (let i = currentCount; i < desiredCount; i++) {
              const desired = desiredChapters[i]
              createPromises.push(
                fetch(`/api/books/${book.id}/chapters`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: desired.title,
                    content: '',
                    order: i + 1
                  })
                }).then(async (r) => {
                  if (!r.ok) {
                    console.error(`Failed to create chapter ${i + 1}:`, await r.text())
                  }
                }).catch(err => console.error('Create error:', err))
              )
            }
            await Promise.all(createPromises)
          }

          // 3) Delete extra chapters if any
          if (currentCount > desiredCount) {
            const deletePromises: Promise<any>[] = []
            for (let i = desiredCount; i < currentCount; i++) {
              const ch = currentChapters[i]
              deletePromises.push(
                fetch(`/api/books/${book.id}/chapters/${ch.id}`, { method: 'DELETE' })
              )
            }
            await Promise.all(deletePromises)
          }
        } catch (err) {
          console.error('Error syncing chapters on regeneration:', err)
        }
      }
    } catch (error) {
      console.error('Error saving outline and creating chapters:', error)
    }
  }

  // Helper function to generate initial chapter content based on outline
  const generateInitialChapterContent = (outlineChapter: any): string => {
    const keyPointsList = outlineChapter.keyPoints
      ?.map((point: string) => `<li>${point}</li>`)
      .join('') || ''

    return `<p><strong>Chapter Overview:</strong> ${outlineChapter.description || 'This chapter needs content.'}</p>

<h2>Key Topics to Cover:</h2>
<ul>
${keyPointsList}
</ul>

<p><em>This chapter is ready for writing. Click here to start adding your content...</em></p>`
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
      {book.outline ? (
        <div className="animate-in fade-in duration-200">
          {/* Minimal Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 py-5 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-3 items-center">
              <div className="flex items-center gap-3 sm:gap-2">
                <List className="h-6 w-6 sm:h-5 sm:w-5 text-primary" />
                <h3 className="text-xl sm:text-lg font-semibold">Book Outline</h3>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-3 sm:gap-2 flex-wrap">
                <Badge variant="secondary" className="text-sm sm:text-xs px-3 py-1 sm:px-2 sm:py-0.5">
                  {book.outline.chapters.length} chapters
                </Badge>
                {book.outline.suggestions?.length > 0 && (
                  <Badge variant="secondary" className="text-sm sm:text-xs px-3 py-1 sm:px-2 sm:py-0.5">
                    {book.outline.suggestions.length} tips
                  </Badge>
                )}
              </div>
            </div>
            <Button
              onClick={() => setShowRegenerateDialog(true)}
              variant="outline"
              size="sm"
              className="text-sm sm:text-xs h-10 sm:h-8 px-4 sm:px-3 w-full sm:w-auto touch-manipulation"
              disabled={isRegenerating}
            >
              <RefreshCw className={`h-4 w-4 sm:h-3 sm:w-3 mr-2 sm:mr-1 ${isRegenerating ? 'animate-spin' : ''}`} />
              {isRegenerating ? 'Creating...' : 'New Outline'}
            </Button>
          </div>

          {/* Outline Content */}
          <EditableOutline
            outline={book.outline}
            book={book}
            mutate={mutate}
            onOutlineUpdated={onOutlineUpdated}
          />
        </div>
      ) : (
        <div className="animate-in fade-in duration-200">
          <OutlineChat
            book={book}
            onOutlineCreated={onOutlineUpdated}
          />
        </div>
      )}

      <RegenerateOutlineDialog
        open={showRegenerateDialog}
        onOpenChange={setShowRegenerateDialog}
        bookTitle={book.title}
        onRegenerate={handleRegenerateOutline}
        isRegenerating={isRegenerating}
      />
    </div>
  )
}