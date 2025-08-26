"use client"

import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { KeyedMutator } from 'swr'
import RichEditor from '@/components/book/rich-editor'
import WritingChat from '@/components/book/writing-chat'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: {
    isStreaming?: boolean
    wordCount?: number
    suggestions?: string[]
  }
}

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

interface ChapterChat {
  messages: Message[]
  loading: boolean
  streamingMessageId: string | null
  collapsed: boolean
}

interface ChaptersTabProps {
  book: Book
  bookId: string
  selectedChapter: Chapter | null
  editingChapter: Chapter | null
  setEditingChapter: (updater: ((prev: Chapter | null) => Chapter | null) | Chapter | null) => void
  setSelectedChapter: (chapter: Chapter | null) => void
  getChapterChat: (chapterId: string) => ChapterChat
  setChapterChats: (updater: (prev: Record<string, ChapterChat>) => Record<string, ChapterChat>) => void
  mutate: KeyedMutator<Book>
}

export default function ChaptersTab({
  book,
  bookId,
  selectedChapter,
  editingChapter,
  setEditingChapter,
  setSelectedChapter,
  getChapterChat,
  setChapterChats,
  mutate
}: ChaptersTabProps) {
  const [isSavingChapter, setIsSavingChapter] = useState(false)

  // Chapter helper functions
  const updateChapter = async (chapterId: string, updates: Partial<Chapter>) => {
    setIsSavingChapter(true)
    try {
      const response = await fetch(`/api/books/${bookId}/chapters/${chapterId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const updatedChapter = await response.json()
        // Update SWR cache with updated chapter
        mutate({
          ...book!,
          chapters: book!.chapters.map(ch => ch.id === chapterId ? updatedChapter : ch)
        }, { revalidate: false })

        if (selectedChapter?.id === chapterId) {
          setSelectedChapter(updatedChapter)
        }
        // Update editingChapter if it's the same chapter being updated
        if (editingChapter?.id === chapterId) {
          setEditingChapter(updatedChapter)
        }
        // Don't clear editingChapter - this causes the flash/refresh
      }
    } catch (error) {
      console.error('Failed to update chapter:', error)
    } finally {
      setIsSavingChapter(false)
    }
  }

  if (!selectedChapter) {
    return (
      <div className="text-center py-16">
        <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-xl font-semibold mb-2">Select a chapter to edit</h2>
        <p className="text-muted-foreground mb-6">
          Choose a chapter from the sidebar to get started writing.
        </p>
      </div>
    )
  }

  const chapterChat = getChapterChat(selectedChapter.id)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{selectedChapter.title}</h2>
          <p className="text-sm text-muted-foreground">
            {selectedChapter.wordCount.toLocaleString()} words {selectedChapter.updatedAt && selectedChapter.updatedAt !== '' ? `• Last updated ${new Date(selectedChapter.updatedAt).toLocaleDateString()}` : ''}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <RichEditor
          value={editingChapter?.content || ''}
          onChange={(html) => setEditingChapter((prev: Chapter | null) => prev ? { ...prev, content: html } : prev)}
          onSave={async () => {
            if (editingChapter) {
              await updateChapter(editingChapter.id, { content: editingChapter.content, title: editingChapter.title })
            }
          }}
          isSaving={isSavingChapter}
          autoSave={true}
          className="bg-transparent"
        />
      </div>
      {(() => {
        if (!book.outline) return null
        const outlineCh = book.outline.chapters.find(ch => ch.order === selectedChapter.order)
        if (!outlineCh) return null
        return (
          <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
            <h4 className="text-sm font-semibold mb-2">Chapter Overview</h4>
            {outlineCh.description && (
              <p className="text-sm text-muted-foreground mb-3">{outlineCh.description}</p>
            )}
            {outlineCh.keyPoints && outlineCh.keyPoints.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Key points</p>
                <ul className="list-disc ml-5 space-y-1">
                  {outlineCh.keyPoints.map((kp, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">{kp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      })()}
      <WritingChat
        bookContext={{
          title: book.title,
          genre: book.genre || undefined,
          targetAudience: book.targetAudience || undefined,
          customInstructions: book.customInstructions || undefined,
          currentContent: (editingChapter?.content || '').replace(/<[^>]*>/g, ''),
          chapters: book.chapters.map(chapter => ({
            id: chapter.id,
            title: chapter.title,
            content: chapter.content,
            order: chapter.order,
            wordCount: chapter.wordCount
          })),
          outline: book.outline ? {
            id: book.outline.id,
            suggestions: book.outline.suggestions,
            chapters: book.outline.chapters.map(outlineChapter => ({
              id: outlineChapter.id,
              title: outlineChapter.title,
              description: outlineChapter.description,
              keyPoints: outlineChapter.keyPoints,
              order: outlineChapter.order
            }))
          } : undefined
        }}
        messages={chapterChat.messages}
        setMessages={(messagesOrUpdater) => {
          setChapterChats(prev => {
            const currentChat = prev[selectedChapter.id] || getChapterChat(selectedChapter.id)
            const newMessages = typeof messagesOrUpdater === 'function'
              ? messagesOrUpdater(currentChat.messages)
              : messagesOrUpdater
            return {
              ...prev,
              [selectedChapter.id]: {
                ...currentChat,
                messages: newMessages
              }
            }
          })
        }}
        isLoading={chapterChat.loading}
        setIsLoading={(loadingOrUpdater) => {
          setChapterChats(prev => {
            const currentChat = prev[selectedChapter.id] || getChapterChat(selectedChapter.id)
            const newLoading = typeof loadingOrUpdater === 'function'
              ? loadingOrUpdater(currentChat.loading)
              : loadingOrUpdater
            return {
              ...prev,
              [selectedChapter.id]: {
                ...currentChat,
                loading: newLoading
              }
            }
          })
        }}
        streamingMessageId={chapterChat.streamingMessageId}
        setStreamingMessageId={(streamingIdOrUpdater) => {
          setChapterChats(prev => {
            const currentChat = prev[selectedChapter.id] || getChapterChat(selectedChapter.id)
            const newStreamingId = typeof streamingIdOrUpdater === 'function'
              ? streamingIdOrUpdater(currentChat.streamingMessageId)
              : streamingIdOrUpdater
            return {
              ...prev,
              [selectedChapter.id]: {
                ...currentChat,
                streamingMessageId: newStreamingId
              }
            }
          })
        }}
        hasExistingContent={Boolean(editingChapter?.wordCount && editingChapter.wordCount > 0)}
        onContentGenerated={async (content) => {
          // Update editor and persist chapter content
          setEditingChapter((prev: Chapter | null) => prev ? { ...prev, content } : prev)
          if (editingChapter) {
            try {
              await updateChapter(editingChapter.id, { content })
            } catch (e) {
              console.error('Failed to save chapter content:', e)
            }
          }
        }}
        collapsed={chapterChat.collapsed}
        mode="chapter"
        headerContext={selectedChapter.title}
        onCollapsedChange={(collapsed) => {
          setChapterChats(prev => ({
            ...prev,
            [selectedChapter.id]: {
              ...prev[selectedChapter.id],
              collapsed
            }
          }))
        }}
      />
    </div>
  )
}