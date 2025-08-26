
"use client"

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import useSWR from 'swr'
import { useParams } from 'next/navigation'
import Header from '@/components/layout/header'
import { FishAudioVoice } from '@/lib/fish-audio'
import OutlineTab from '@/components/book/tabs/outline-tab'
import ChaptersTab from '@/components/book/tabs/chapters-tab'
import VoiceTab from '@/components/book/tabs/voice-tab'
import SettingsTab from '@/components/book/tabs/settings-tab'
import BookPageSkeleton from '@/components/book/book-page-skeleton'
import BookNotFound from '@/components/book/book-not-found'
import BookInfo from '@/components/book/book-info'
import BookSidebar from '@/components/book/book-sidebar'

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
  chapters: Chapter[]
  audioGenerations?: AudioGeneration[]
  outline?: Outline
  _count: {
    chapters: number
  }
}

const statusConfig = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  PUBLISHED: { label: 'Published', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' }
}

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function BookEditPage() {
  const { status } = useSession()
  const router = useRouter()
  const params = useParams()
  const bookId = params.id as string

  // Use SWR for book data with smart revalidation
  const { data: book, error, mutate, isLoading } = useSWR<Book>(
    status === 'authenticated' ? `/api/books/${bookId}` : null,
    fetcher,
    {
      revalidateOnFocus: true,        // Revalidate when user focuses the tab
      revalidateOnReconnect: true,    // Revalidate when reconnecting
      refreshWhenHidden: false,       // Don't refresh when tab is hidden
      refreshWhenOffline: false,      // Don't refresh when offline
      shouldRetryOnError: false,      // Don't retry on errors
      // Smart refreshing: only auto-refresh if there are active jobs
      refreshInterval: (data) => {
        const hasActiveJobs = data?.audioGenerations?.some((ag: AudioGeneration) =>
          ag.status === 'PENDING' || ag.status === 'PROCESSING'
        )
        return hasActiveJobs ? 3000 : 0 // 3 seconds if active jobs, disabled otherwise
      }
    }
  )
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null)
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null)
  const [activeTab, setActiveTab] = useState('outline')
  const [bookForm, setBookForm] = useState({
    title: '',
    customInstructions: '',
    genre: '',
    targetAudience: ''
  })
  const [chapterChats, setChapterChats] = useState<Record<string, {
    messages: Message[]
    loading: boolean
    streamingMessageId: string | null
    collapsed: boolean
  }>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [selectedVoice, setSelectedVoice] = useState<FishAudioVoice | null>(null)

  // Keep an editable copy of the selected chapter for rich editor
  useEffect(() => {
    if (selectedChapter) {
      setEditingChapter(selectedChapter)
    }
  }, [selectedChapter])

  // Helper function to get or create chapter chat
  const getChapterChat = (chapterId: string) => {
    return chapterChats[chapterId] || {
      messages: [{
        id: 'welcome',
        role: 'assistant',
        content: `## 👋 Welcome!\nI'm here to help you write this chapter.`,
        timestamp: new Date()
      }],
      loading: false,
      streamingMessageId: null,
      collapsed: true
    }
  }

  // Initialize chapter chat if it doesn't exist
  const initializeChapterChat = useCallback((chapterId: string) => {
    if (!chapterChats[chapterId]) {
      setChapterChats(prev => ({
        ...prev,
        [chapterId]: {
          messages: [{
            id: 'welcome',
            role: 'assistant',
            content: `## 👋 Welcome!\nI'm here to help you write this chapter.`,
            timestamp: new Date()
          }],
          loading: false,
          streamingMessageId: null,
          collapsed: true
        }
      }))
    }
  }, [chapterChats])


  // Initialize chapter chat when a chapter is selected
  useEffect(() => {
    if (selectedChapter) {
      initializeChapterChat(selectedChapter.id)
    }
  }, [selectedChapter, initializeChapterChat])

  // Ensure chat stays collapsed when navigating to a chapter with no content
  useEffect(() => {
    if (!selectedChapter) return
    const isEmptyContent = (!selectedChapter.content || selectedChapter.content.trim() === '') && (selectedChapter.wordCount === 0)
    if (isEmptyContent) {
      setChapterChats(prev => {
        const current = prev[selectedChapter.id] || getChapterChat(selectedChapter.id)
        return {
          ...prev,
          [selectedChapter.id]: {
            ...current,
            collapsed: true
          }
        }
      })
    }
  }, [selectedChapter, setChapterChats])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
      return
    }

    if (error && error.status === 404) {
      router.push('/book')
    }
  }, [status, router, error])


  // Initialize form data when book data loads
  useEffect(() => {
    if (book) {
      setBookForm({
        title: book.title || '',
        customInstructions: book.customInstructions || '',
        genre: book.genre || '',
        targetAudience: book.targetAudience || ''
      })

      if (book.chapters.length > 0 && !selectedChapter) {
        setSelectedChapter(book.chapters[0])
      }
    }
  }, [book, selectedChapter])







  const totalWords = book?.chapters?.reduce((sum, chapter) => sum + chapter.wordCount, 0) || 0

  if (status === 'loading' || isLoading) {
    return <BookPageSkeleton />
  }

  if (!book) {
    return <BookNotFound />
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="pt-20 sm:pt-24 container mx-auto px-2" style={{ paddingBottom: 'calc(var(--writing-chat-reserved, 0px) + 24px)' }}>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
          <div className="lg:col-span-1">
            <BookInfo
              book={book}
              bookId={bookId}
              totalWords={totalWords}
              statusConfig={statusConfig}
              mutate={mutate}
            />

            <BookSidebar
              book={book}
              bookId={bookId}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              selectedChapter={selectedChapter}
              setSelectedChapter={setSelectedChapter}
              mutate={mutate}
            />
          </div>

          <div className="lg:col-span-3">
            {activeTab === 'outline' && (
              <OutlineTab
                book={book}
                mutate={mutate}
                onOutlineUpdated={() => {
                  setSelectedChapter(null)
                  // Soft update - just revalidate without forcing a full refetch
                  mutate()
                }}
              />
            )}

            {activeTab === 'chapters' && (
              <ChaptersTab
                book={book}
                bookId={bookId}
                selectedChapter={selectedChapter}
                editingChapter={editingChapter}
                setEditingChapter={setEditingChapter}
                setSelectedChapter={setSelectedChapter}
                getChapterChat={getChapterChat}
                setChapterChats={setChapterChats}
                mutate={mutate}
              />
            )}

            {activeTab === 'voice' && (
              <VoiceTab
                book={book}
                selectedVoice={selectedVoice}
                setSelectedVoice={setSelectedVoice}
                mutate={mutate}
                onGoToOutline={() => setActiveTab('outline')}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsTab
                book={book}
                bookId={bookId}
                bookForm={bookForm}
                setBookForm={setBookForm}
                showDeleteConfirm={showDeleteConfirm}
                setShowDeleteConfirm={setShowDeleteConfirm}
                deleteConfirmText={deleteConfirmText}
                setDeleteConfirmText={setDeleteConfirmText}
                mutate={mutate}
              />
            )}
          </div>
        </div>
      </main>

    </div>
  )
}
