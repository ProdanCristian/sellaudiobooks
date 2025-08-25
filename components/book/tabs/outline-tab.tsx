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

      // Then create chapters from the outline
      if (outlineData.chapters && Array.isArray(outlineData.chapters)) {
        const chapterPromises = []
        
        for (let i = 0; i < outlineData.chapters.length; i++) {
          const outlineChapter = outlineData.chapters[i]
          
          // Generate initial chapter content based on outline
          const initialContent = generateInitialChapterContent(outlineChapter)
          
          // Create chapter with explicit order to avoid conflicts
          chapterPromises.push(
            fetch(`/api/books/${book.id}/chapters`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: outlineChapter.title,
                content: initialContent,
                order: i + 1
              }),
            }).then(async (response) => {
              if (!response.ok) {
                const errorData = await response.text().catch(() => 'Unknown error')
                console.error(`Failed to create chapter ${i + 1}:`, outlineChapter.title, errorData)
                return null
              } else {
                const chapterData = await response.json()
                console.log(`Successfully created chapter ${i + 1}:`, chapterData.title)
                return chapterData
              }
            }).catch((error) => {
              console.error(`Error creating chapter ${i + 1}:`, outlineChapter.title, error)
              return null
            })
          )
        }
        
        // Wait for all chapters to be created
        const results = await Promise.all(chapterPromises)
        const successfulChapters = results.filter(Boolean)
        console.log(`Created ${successfulChapters.length} out of ${outlineData.chapters.length} chapters`)
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
    <div className="w-full max-w-4xl mx-auto px-4 space-y-6">
      {book.outline ? (
        <div className="animate-in fade-in duration-200">
          {/* Minimal Header */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <List className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Book Outline</h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {book.outline.chapters.length} chapters
                </Badge>
                {book.outline.suggestions?.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {book.outline.suggestions.length} tips
                  </Badge>
                )}
              </div>
            </div>
            <Button
              onClick={() => setShowRegenerateDialog(true)}
              variant="outline"
              size="sm"
              className="text-xs"
              disabled={isRegenerating}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isRegenerating ? 'animate-spin' : ''}`} />
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