"use client"

import { useState, useEffect } from 'react'
import { KeyedMutator } from 'swr'
import { Button } from '@/components/ui/button'
import { Volume2, RefreshCw, BookOpen, X } from 'lucide-react'
import VoiceSelectionModal from '@/components/voice/voice-selection-modal'
import AudioPlayer from '@/components/voice/audio-player'
import { FishAudioVoice } from '@/lib/fish-audio'

interface Chapter {
  id: string
  title: string
  content: string
  order: number
  wordCount: number
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

interface VoiceTabProps {
  book: Book
  selectedVoice: FishAudioVoice | null
  setSelectedVoice: (voice: FishAudioVoice | null) => void
  mutate: KeyedMutator<Book>
  onAudioGenerated: (audioUrl: string, metadata: Record<string, unknown>) => void
}

export default function VoiceTab({
  book,
  selectedVoice,
  setSelectedVoice,
  mutate,
  onAudioGenerated
}: VoiceTabProps) {
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)


  // On mount and whenever server data changes, derive local generating state
  // so the UI reflects processing status even after refresh.
  useEffect(() => {
    // Do not override user-initiated state. This prevents flicker right after click.
    if (isGeneratingAudio) {
      return
    }

    const inProgress = (book?.audioGenerations || [])
      .filter(ag => ag.status === 'PENDING' || ag.status === 'PROCESSING')
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]

    if (inProgress) {
      setIsGeneratingAudio(true)
      if (inProgress.contentType === 'FULL_BOOK') {
        setGeneratingFor('full-audiobook')
      } else if (inProgress.contentType === 'CHAPTER') {
        const chapter = book?.chapters.find(ch => ch.id === inProgress.chapterId)
        setGeneratingFor(chapter ? chapter.title : null)
      }
    } else {
      // No job in progress according to server
      setIsGeneratingAudio(false)
      setGeneratingFor(null)
    }
  }, [book?.audioGenerations, book?.chapters, isGeneratingAudio])

  // Reset local generating state ONLY when we have actual audio or confirmed failure
  useEffect(() => {
    if (!book?.audioGenerations || !isGeneratingAudio || !generatingFor) {
      return
    }

    // Only reset when we find a completed job WITH audio URL or a failed job
    if (generatingFor === 'full-audiobook') {
      const fullBookJob = book.audioGenerations.find(ag => ag.contentType === 'FULL_BOOK')
      if (fullBookJob && ((fullBookJob.status === 'COMPLETED' && fullBookJob.audioUrl) || fullBookJob.status === 'FAILED')) {
        setIsGeneratingAudio(false)
        setGeneratingFor(null)
      }
    } else {
      // For chapter generations, find the specific chapter job
      const chapterJob = book.audioGenerations.find(ag =>
        ag.contentType === 'CHAPTER' &&
        book.chapters.some(ch => ch.title === generatingFor && ch.id === ag.chapterId)
      )
      if (chapterJob && ((chapterJob.status === 'COMPLETED' && chapterJob.audioUrl) || chapterJob.status === 'FAILED')) {
        setIsGeneratingAudio(false)
        setGeneratingFor(null)
      }
    }
  }, [book?.audioGenerations, book?.chapters, isGeneratingAudio, generatingFor])

  // Audio generation functions
  const handleGenerateFullAudiobook = async () => {
    if (!selectedVoice) {
      alert('Please select a voice first')
      return
    }

    // Combine all content
    let fullContent = ''

    // Helper function to convert HTML to clean text with proper spacing
    const htmlToText = (html: string): string => {
      return html
        .replace(/<\/p>/gi, '\n\n') // Replace closing p tags with double newlines
        .replace(/<p[^>]*>/gi, '') // Remove opening p tags
        .replace(/<br\s*\/?>/gi, '\n') // Replace br tags with single newlines
        .replace(/<\/div>/gi, '\n') // Replace closing div tags with newlines
        .replace(/<div[^>]*>/gi, '') // Remove opening div tags
        .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
        .replace(/\n{3,}/g, '\n\n') // Replace multiple consecutive newlines with double newlines
        .trim()
    }

    // Add chapters with content
    const chaptersWithContent = book?.chapters.filter(chapter => {
      const textContent = htmlToText(chapter.content)
      const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length
      return wordCount > 0 && chapter.wordCount > 0
    }) || []

    chaptersWithContent.forEach((chapter, index) => {
      const chapterTextContent = htmlToText(chapter.content)
      fullContent += `${chapter.title}.\n\n${chapterTextContent}`

      // Add spacing between chapters (but not after the last one)
      if (index < chaptersWithContent.length - 1) {
        fullContent += '\n\n'
      }
    })

    try {
      const response = await fetch('/api/generation/audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceId: selectedVoice._id,
          voiceName: selectedVoice.title,
          text: fullContent,
          chapterTitle: 'Complete Audiobook',
          bookTitle: book?.title,
          bookId: book?.id,
          chapterId: null,
          contentType: 'FULL_BOOK'
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Trigger a revalidation to get the updated audio generation
        mutate()
        // Don't reset state immediately - let the job status determine the UI state
      } else {
        throw new Error(data.error || 'Failed to generate audiobook')
      }
    } catch (error) {
      console.error('Error generating full audiobook:', error)
      alert(`Failed to generate audiobook: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // Only reset state on actual API/network error (not job processing errors)
      setIsGeneratingAudio(false)
      setGeneratingFor(null)
    }
  }

  const handleGenerateAudio = async (content: string, type: 'chapter', chapterTitle?: string, chapterId?: string) => {
    if (!selectedVoice) {
      alert('Please select a voice first')
      return
    }

    // Helper function to convert HTML to clean text with proper spacing
    const htmlToText = (html: string): string => {
      return html
        .replace(/<\/p>/gi, '\n\n') // Replace closing p tags with double newlines
        .replace(/<p[^>]*>/gi, '') // Remove opening p tags
        .replace(/<br\s*\/?>/gi, '\n') // Replace br tags with single newlines
        .replace(/<\/div>/gi, '\n') // Replace closing div tags with newlines
        .replace(/<div[^>]*>/gi, '') // Remove opening div tags
        .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
        .replace(/\n{3,}/g, '\n\n') // Replace multiple consecutive newlines with double newlines
        .trim()
    }

    const textContent = htmlToText(content)

    // Combine chapter title with content for audio generation
    const textWithTitle = chapterTitle
      ? `${chapterTitle}.\n\n${textContent}`
      : textContent

    try {
      const response = await fetch('/api/generation/audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceId: selectedVoice._id,
          voiceName: selectedVoice.title,
          text: textWithTitle,
          chapterTitle: chapterTitle || 'Chapter',
          bookTitle: book?.title,
          bookId: book?.id,
          chapterId: chapterId || null,
          contentType: 'CHAPTER'
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Trigger a revalidation to get the updated audio generation
        mutate()
        // Don't reset state immediately - let the job status determine the UI state
      } else {
        throw new Error(data.error || 'Failed to generate audio')
      }
    } catch (error) {
      console.error('Error generating audio:', error)
      alert(`Failed to generate audio: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // Only reset state on actual API/network error (not job processing errors)
      setIsGeneratingAudio(false)
      setGeneratingFor(null)
    }
  }
  const [showVoiceModal, setShowVoiceModal] = useState(false)




  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Voice Generation</h2>
          <p className="text-sm text-muted-foreground">
            Select a voice and generate audio for your content
          </p>
        </div>
      </div>

      {/* Voice Selection */}
      <div className="space-y-4">
        {selectedVoice ? (
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Volume2 className="h-5 w-5 text-primary" />
              <span className="font-medium">{selectedVoice.title}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVoiceModal(true)}
            >
              Change
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setShowVoiceModal(true)}
            variant="outline"
            className="w-full"
          >
            <Volume2 className="h-4 w-4 mr-2" />
            Select Voice
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Generate Audio Content</h3>

        {/* Full Audiobook Option */}
        {(() => {
          // Helper function to convert HTML to clean text with proper spacing
          const htmlToText = (html: string): string => {
            return html
              .replace(/<\/p>/gi, '\n\n') // Replace closing p tags with double newlines
              .replace(/<p[^>]*>/gi, '') // Remove opening p tags
              .replace(/<br\s*\/?>/gi, '\n') // Replace br tags with single newlines
              .replace(/<\/div>/gi, '\n') // Replace closing div tags with newlines
              .replace(/<div[^>]*>/gi, '') // Remove opening div tags
              .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
              .replace(/\n{3,}/g, '\n\n') // Replace multiple consecutive newlines with double newlines
              .trim()
          }

          const chaptersWithContent = book.chapters.filter(chapter => {
            const textContent = htmlToText(chapter.content)
            const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length
            return wordCount > 0 && chapter.wordCount > 0
          })

          return chaptersWithContent.length > 1
        })() && (
            <div className="border-2 border-primary/20 rounded-lg p-4 bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <Volume2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary">Complete Audiobook</h4>
                    <p className="text-sm text-muted-foreground">
                      Generate full audiobook with all content
                    </p>
                  </div>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setIsGeneratingAudio(true)
                    setGeneratingFor('full-audiobook')
                    // Use setTimeout to ensure state update happens first
                    setTimeout(() => {
                      handleGenerateFullAudiobook()
                    }, 0)
                  }}
                  disabled={!selectedVoice || (isGeneratingAudio && generatingFor === 'full-audiobook')}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isGeneratingAudio && generatingFor === 'full-audiobook' ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4 mr-2" />
                        Generate Full Book
                      </>
                    )}
                </Button>
              </div>
              {/* Audio Player for Full Audiobook */}
              {(() => {
                const fullAudio = book.audioGenerations?.find(
                  audio => audio.contentType === 'FULL_BOOK'
                )
                return fullAudio ? (
                  <div className="mt-3">
                    <AudioPlayer
                      audioUrl={fullAudio.audioUrl || ''}
                      title="Complete Audiobook"
                      voiceName={fullAudio.voiceName}
                    />
                  </div>
                ) : null
              })()}
            </div>
          )}

        {/* Chapters Options */}
        {(() => {
          // Helper function to convert HTML to clean text with proper spacing
          const htmlToText = (html: string): string => {
            return html
              .replace(/<\/p>/gi, '\n\n') // Replace closing p tags with double newlines
              .replace(/<p[^>]*>/gi, '') // Remove opening p tags
              .replace(/<br\s*\/?>/gi, '\n') // Replace br tags with single newlines
              .replace(/<\/div>/gi, '\n') // Replace closing div tags with newlines
              .replace(/<div[^>]*>/gi, '') // Remove opening div tags
              .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
              .replace(/\n{3,}/g, '\n\n') // Replace multiple consecutive newlines with double newlines
              .trim()
          }

          return book.chapters.filter(chapter => {
            const textContent = htmlToText(chapter.content)
            const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length
            return wordCount > 0 && chapter.wordCount > 0
          })
        })().map((chapter) => (
          <div key={chapter.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h4 className="font-medium">{chapter.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {chapter.wordCount} words
                  </p>
                </div>
              </div>
              <Button
                variant={selectedVoice ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsGeneratingAudio(true)
                  setGeneratingFor(chapter.title)
                  // Use setTimeout to ensure state update happens first
                  setTimeout(() => {
                    handleGenerateAudio(chapter.content, 'chapter', chapter.title, chapter.id)
                  }, 0)
                }}
                disabled={!selectedVoice || (isGeneratingAudio && generatingFor === chapter.title)}
              >
                {isGeneratingAudio && generatingFor === chapter.title ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4 mr-2" />
                      Generate Audio
                    </>
                  )}
              </Button>
            </div>
            {/* Audio Player for Chapter */}
            {(() => {
              const chapterAudio = book.audioGenerations?.find(
                audio => audio.contentType === 'CHAPTER' && audio.chapterId === chapter.id
              )

              if (!chapterAudio) return null

              if (chapterAudio.status === 'COMPLETED' && chapterAudio.audioUrl) {
                return (
                  <div className="mt-3">
                    <AudioPlayer
                      audioUrl={chapterAudio.audioUrl}
                      title={chapter.title}
                      voiceName={chapterAudio.voiceName}
                    />
                  </div>
                )
              }

              if (chapterAudio.status === 'FAILED') {
                return (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                      <X className="h-4 w-4" />
                      <span>Audio generation failed</span>
                    </div>
                    {chapterAudio.errorMessage && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                        {chapterAudio.errorMessage}
                      </p>
                    )}
                  </div>
                )
              }

              return null
            })()}
          </div>
        ))}

        {(() => {
          // Helper function to convert HTML to clean text with proper spacing
          const htmlToText = (html: string): string => {
            return html
              .replace(/<\/p>/gi, '\n\n') // Replace closing p tags with double newlines
              .replace(/<p[^>]*>/gi, '') // Remove opening p tags
              .replace(/<br\s*\/?>/gi, '\n') // Replace br tags with single newlines
              .replace(/<\/div>/gi, '\n') // Replace closing div tags with newlines
              .replace(/<div[^>]*>/gi, '') // Remove opening div tags
              .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
              .replace(/\n{3,}/g, '\n\n') // Replace multiple consecutive newlines with double newlines
              .trim()
          }

          const hasChapterContent = book.chapters.some(chapter => {
            const textContent = htmlToText(chapter.content)
            const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length
            return wordCount > 0 && chapter.wordCount > 0
          })

          return !hasChapterContent
        })() && (
            <div className="text-center py-8 text-muted-foreground">
              <Volume2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Add content to your book to generate audio</p>
            </div>
          )}
      </div>

      {/* Voice Selection Modal */}
      <VoiceSelectionModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        selectedVoice={selectedVoice}
        onSelectVoice={setSelectedVoice}
      />
    </div>
  )
}