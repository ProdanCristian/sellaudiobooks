"use client"

import { useEffect } from 'react'
import { KeyedMutator } from 'swr'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BookOpen,
  Settings,
  Volume2,
  List,
} from 'lucide-react'

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

interface BookSidebarProps {
  book: Book
  bookId: string
  activeTab: string
  setActiveTab: (tab: string) => void
  selectedChapter: Chapter | null
  setSelectedChapter: (chapter: Chapter | null) => void
  mutate: KeyedMutator<Book>
}

export default function BookSidebar({
  book,
  bookId,
  activeTab,
  setActiveTab,
  selectedChapter,
  setSelectedChapter,
  mutate
}: BookSidebarProps) {
  // Check if chapters and voice tabs should be disabled
  const hasNoChapters = book.chapters.length === 0
  const hasNoOutline = !book.outline
  const shouldDisableChapters = hasNoChapters && hasNoOutline
  const shouldDisableVoice = hasNoChapters

  // Auto-redirect to outline tab if user is on disabled tab
  const handleTabChange = (value: string) => {
    if (value === 'chapters' && shouldDisableChapters) {
      setActiveTab('outline')
      return
    }
    if (value === 'voice' && shouldDisableVoice) {
      setActiveTab('outline')
      return
    }

    // Auto-select first chapter when switching to chapters tab
    if (value === 'chapters' && book.chapters.length > 0) {
      const firstChapter = book.chapters.sort((a, b) => a.order - b.order)[0]
      setSelectedChapter(firstChapter)
    }

    setActiveTab(value)
  }

  // Auto-switch to outline if currently on a disabled tab
  useEffect(() => {
    if ((activeTab === 'chapters' && shouldDisableChapters) ||
      (activeTab === 'voice' && shouldDisableVoice)) {
      setActiveTab('outline')
    }
  }, [activeTab, shouldDisableChapters, shouldDisableVoice, setActiveTab])

  // Chapter helper functions


  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="w-full"
      orientation="vertical"
    >
      <TabsList className="flex flex-col h-fit w-full p-2">
        <TabsTrigger value="outline" className="w-full justify-start">
          <List className="h-4 w-4 mr-2" />
          Outline
        </TabsTrigger>
        <TabsTrigger
          value="chapters"
          className={`w-full justify-start ${shouldDisableChapters ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={shouldDisableChapters}
        >
          <BookOpen className="h-4 w-4 mr-2" />
          Chapters
        </TabsTrigger>
        <TabsTrigger
          value="voice"
          className={`w-full justify-start ${shouldDisableVoice ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={shouldDisableVoice}
        >
          <Volume2 className="h-4 w-4 mr-2" />
          Voice Generation
        </TabsTrigger>
        <TabsTrigger value="settings" className="w-full justify-start">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </TabsTrigger>
      </TabsList>

      <TabsContent value="chapters" className="space-y-2">
        <div className="backdrop-blur-sm bg-white/1 border border-white/8 rounded-lg p-3">
          <h4 className="text-sm font-medium text-foreground mb-3 px-1">Chapters</h4>
          <div className="max-h-80 overflow-y-auto space-y-3">
            {book.chapters.sort((a, b) => a.order - b.order).map((chapter, index) => (
              <div
                key={chapter.id}
                className={`relative p-4 rounded-lg transition-all duration-200 bg-muted/70 hover:bg-muted/85 hover:shadow-sm ${selectedChapter?.id === chapter.id ? 'bg-muted/95 border-primary shadow-sm' : 'border-muted/40'
                  } group cursor-pointer border`}
                onClick={() => setSelectedChapter(chapter)}
              >
                {/* Chapter Number Badge */}
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium flex-shrink-0 mt-0.5">
                    {chapter.order}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Chapter Title */}
                    <h3 className="font-medium text-sm leading-relaxed mb-2 line-clamp-2">
                      {chapter.title}
                    </h3>

                    {/* Chapter Stats */}
                    <p className="text-xs text-muted-foreground">
                      {chapter.wordCount.toLocaleString()} words
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}