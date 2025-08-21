"use client"

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { useParams } from 'next/navigation'
import Header from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Plus,
  Save,
  BookOpen,
  FileText,
  Settings,
  RefreshCw,
  X,
  Check,
  Trash2,
  Volume2,
  Copy
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import WritingChat from '@/components/writing-chat'
import RichEditor from '@/components/rich-editor'
import VoiceGenerator from '@/components/voice-generator'
import VoiceSelectionModal from '@/components/voice-selection-modal'
import AudioPlayer from '@/components/audio-player'
import { FishAudioVoice } from '@/lib/fish-audio'

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
  contentType: 'INTRODUCTION' | 'CHAPTER' | 'CONCLUSION' | 'FULL_BOOK'
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
  introduction?: string
  conclusion?: string
  customInstructions?: string
  genre?: string
  targetAudience?: string
  coverImage?: string
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'PUBLISHED'
  createdAt: string
  updatedAt: string
  chapters: Chapter[]
  audioGenerations?: AudioGeneration[]
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
  const [introductionContent, setIntroductionContent] = useState('')
  const [conclusionContent, setConclusionContent] = useState('')
  const [activeTab, setActiveTab] = useState('introduction')
  const [isSavingIntroduction, setIsSavingIntroduction] = useState(false)
  const [isSavingConclusion, setIsSavingConclusion] = useState(false)
  const [isSavingChapter, setIsSavingChapter] = useState(false)
  const [isRegeneratingCover, setIsRegeneratingCover] = useState(false)
  const [editingCover, setEditingCover] = useState(false)
  const [customCoverPrompt, setCustomCoverPrompt] = useState('')
  const [bookForm, setBookForm] = useState({
    title: '',
    introduction: '',
    customInstructions: '',
    genre: '',
    targetAudience: ''
  })
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [introChatMessages, setIntroChatMessages] = useState<Message[]>([])
  const [introChatLoading, setIntroChatLoading] = useState(false)
  const [introStreamingMessageId, setIntroStreamingMessageId] = useState<string | null>(null)
  const [introChatCollapsed, setIntroChatCollapsed] = useState(false)
  const [conclusionChatMessages, setConclusionChatMessages] = useState<Message[]>([])
  const [conclusionChatLoading, setConclusionChatLoading] = useState(false)
  const [conclusionStreamingMessageId, setConclusionStreamingMessageId] = useState<string | null>(null)
  const [conclusionChatCollapsed, setConclusionChatCollapsed] = useState(false)
  const [chapterChats, setChapterChats] = useState<Record<string, {
    messages: Message[]
    loading: boolean
    streamingMessageId: string | null
    collapsed: boolean
  }>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [titleCopied, setTitleCopied] = useState(false)
  const [deletingChapterId, setDeletingChapterId] = useState<string | null>(null)
  const [confirmDeleteChapterId, setConfirmDeleteChapterId] = useState<string | null>(null)
  const [isCreatingChapter, setIsCreatingChapter] = useState(false)
  const [showVoiceGenerator, setShowVoiceGenerator] = useState(false)
  const [voiceGeneratorContent, setVoiceGeneratorContent] = useState({
    content: '',
    type: 'introduction' as 'introduction' | 'chapter' | 'conclusion',
    chapterTitle: ''
  })
  const [selectedVoice, setSelectedVoice] = useState<FishAudioVoice | null>(null)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)
  const [showVoiceModal, setShowVoiceModal] = useState(false)

  // Keep an editable copy of the selected chapter for rich editor
  useEffect(() => {
    if (selectedChapter) {
      setEditingChapter(selectedChapter)
    }
  }, [selectedChapter])

  // Helper function to get or create chapter chat
  const getChapterChat = (chapterId: string) => {
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
          collapsed: false
        }
      }))
    }
    return chapterChats[chapterId] || {
      messages: [{
        id: 'welcome',
        role: 'assistant',
        content: `## 👋 Welcome!\nI'm here to help you write this chapter.`,
        timestamp: new Date()
      }],
      loading: false,
      streamingMessageId: null,
      collapsed: false
    }
  }

  // Helper: extract plain text from HTML for word count and AI context
  const getTextContent = (htmlContent: string) => {
    const div = document.createElement('div')
    div.innerHTML = htmlContent
    return div.textContent || div.innerText || ''
  }

  // Detect if a string is likely Markdown (no HTML tags and markdown patterns)
  const looksLikeMarkdown = (value: string) => {
    if (!value) return false
    if (/<\w+[\s\S]*>/.test(value)) return false
    return /(^|\n)#{1,6}\s|\*\*|\*[^*].*\*|^[-*]\s|^\d+\.\s|^>\s|```|---/m.test(value)
  }

  // Minimal Markdown -> HTML for migrating legacy content
  const markdownToHtmlBasic = (md: string): string => {
    if (!md) return ''
    let text = md.replace(/\r\n/g, '\n')

    const codeBlocks: string[] = []
    text = text.replace(/```([\s\S]*?)```/g, (_m, code) => {
      const idx = codeBlocks.push(`<pre><code>${code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`) - 1
      return `{{CODE_BLOCK_${idx}}}`
    })

    text = text.replace(/^\s*---\s*$/gm, '<hr />')
    text = text.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
    text = text.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
    text = text.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
    text = text.replace(/^(>\s?.+)$/gm, (_m, line) => `<blockquote><p>${line.replace(/^>\s?/, '')}</p></blockquote>`)
    text = text.replace(/(?:^|\n)(\d+\.\s+.*(?:\n\d+\.\s+.*)*)/g, (_m, block) => {
      const items = block.split('\n').map((l: string) => l.trim()).filter(Boolean).map((l: string) => l.replace(/^\d+\.\s+/, '')).map((i: string) => `<li>${i}</li>`).join('')
      return `\n<ol>${items}</ol>`
    })
    text = text.replace(/(?:^|\n)([-*]\s+.*(?:\n[-*]\s+.*)*)/g, (_m, block) => {
      const items = block.split('\n').map((l: string) => l.trim()).filter(Boolean).map((l: string) => l.replace(/^[-*]\s+/, '')).map((i: string) => `<li>${i}</li>`).join('')
      return `\n<ul>${items}</ul>`
    })
    text = text.replace(/(\*\*|__)(.+?)\1/g, '<strong>$2</strong>')
    text = text.replace(/(^|[^*_])(\*|_)([^*_].*?)\2/g, '$1<em>$3</em>')
    text = text.replace(/`([^`]+)`/g, (_m, code) => `<code>${code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>`)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')

    const blocks = text.split(/\n{2,}/)
    const html = blocks.map(block => {
      const trimmed = block.trim()
      if (!trimmed) return ''
      if (/^<h[1-3]>/.test(trimmed) || /^<ul>/.test(trimmed) || /^<ol>/.test(trimmed) || /^<pre>/.test(trimmed) || /^<blockquote>/.test(trimmed) || /^<hr\s*\/>$/.test(trimmed)) {
        return trimmed
      }
      return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`
    }).join('')

    return html.replace(/\{\{CODE_BLOCK_(\d+)\}\}/g, (_m, idx) => codeBlocks[Number(idx)])
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
      return
    }

    if (error && error.status === 404) {
      router.push('/books')
    }
  }, [status, router, error])


  // Initialize form data when book data loads
  useEffect(() => {
    if (book) {
      // If introduction looks like markdown, convert to HTML once for the editor
      const intro = book.introduction || ''
      const normalizedIntro = looksLikeMarkdown(intro) ? markdownToHtmlBasic(intro) : intro
      setIntroductionContent(normalizedIntro)

      // If conclusion looks like markdown, convert to HTML once for the editor
      const conclusion = book.conclusion || ''
      const normalizedConclusion = looksLikeMarkdown(conclusion) ? markdownToHtmlBasic(conclusion) : conclusion
      setConclusionContent(normalizedConclusion)

      setBookForm({
        title: book.title || '',
        introduction: normalizedIntro || '',
        customInstructions: book.customInstructions || '',
        genre: book.genre || '',
        targetAudience: book.targetAudience || ''
      })

      // Initialize introduction chat with welcome message after book data is loaded
      if (introChatMessages.length === 0) {
        const hasExistingIntroduction = book.introduction && book.introduction.trim().length > 0
        setIntroChatMessages([{
          id: 'welcome',
          role: 'assistant',
          content: hasExistingIntroduction
            ? `## 👋 Welcome back!\nI'm here to help you continue working on **"${book.title}"**.`
            : `## 👋 Welcome!\nI'm here to help you write **"${book.title}"**.`,
          timestamp: new Date()
        }])
      }

      // Initialize conclusion chat with welcome message after book data is loaded
      if (conclusionChatMessages.length === 0) {
        const hasExistingConclusion = book.conclusion && book.conclusion.trim().length > 0
        setConclusionChatMessages([{
          id: 'welcome',
          role: 'assistant',
          content: hasExistingConclusion
            ? `## 👋 Welcome back!\nI'm here to help you continue working on your conclusion for **"${book.title}"**.`
            : `## 👋 Welcome!\nI'm here to help you write a powerful conclusion for **"${book.title}"**.`,
          timestamp: new Date()
        }])
      }

      if (book.chapters.length > 0 && !selectedChapter) {
        setSelectedChapter(book.chapters[0])
      }
    }
  }, [book, introChatMessages.length, conclusionChatMessages.length, selectedChapter])

  const updateBookDetails = async () => {
    setIsSavingSettings(true)
    setSettingsSaved(false)

    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookForm),
      })

      if (response.ok) {
        const updatedBook = await response.json()
        // Update SWR cache with new data
        mutate({ ...book!, ...updatedBook }, { revalidate: false })

        // Show green "Saved" state for 2 seconds
        setSettingsSaved(true)
        setTimeout(() => {
          setSettingsSaved(false)
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to update book:', error)
    } finally {
      setIsSavingSettings(false)
    }
  }

  const saveIntroduction = async () => {
    if (isSavingIntroduction) return

    setIsSavingIntroduction(true)
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ introduction: introductionContent }),
      })

      if (response.ok) {
        const updatedBook = await response.json()
        // Update SWR cache with new introduction
        mutate({ ...book!, introduction: updatedBook.introduction }, { revalidate: false })
      }
    } catch (error) {
      console.error('Failed to save introduction:', error)
    } finally {
      setIsSavingIntroduction(false)
    }
  }

  const saveConclusion = async () => {
    if (isSavingConclusion) return
    setIsSavingConclusion(true)
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conclusion: conclusionContent }),
      })

      if (response.ok) {
        const updatedBook = await response.json()
        // Update SWR cache with new conclusion
        mutate({ ...book!, conclusion: updatedBook.conclusion }, { revalidate: false })
      }
    } catch (error) {
      console.error('Failed to save conclusion:', error)
    } finally {
      setIsSavingConclusion(false)
    }
  }

  // Autosave removed; use manual save button only

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
      const response = await fetch('/api/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: book.title,
          customPrompt: customPrompt?.trim() || '',
          bookId: book.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate cover')
      }

      const newCoverUrl = data.imageUrl || data.fallbackUrl || '/cover.png'

      const updateResponse = await fetch(`/api/books/${book.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverImage: newCoverUrl })
      })

      const updateData = await updateResponse.json()

      if (updateResponse.ok) {
        // Update SWR cache with new cover
        mutate({ ...book!, coverImage: newCoverUrl }, { revalidate: false })
      } else {
        throw new Error(updateData.error || 'Failed to update book cover')
      }
    } catch (error) {
      console.error('Error regenerating cover:', error)
      alert('Failed to regenerate cover. Please try again.')
    } finally {
      setIsRegeneratingCover(false)
    }
  }

  const handleCustomCoverUpload = () => {
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/*'
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file || !book) return

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.')
        return
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Please select an image smaller than 10MB.')
        return
      }

      setIsRegeneratingCover(true)

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('bookId', book.id)
        formData.append('bookTitle', book.title)

        const response = await fetch('/api/upload-cover', {
          method: 'POST',
          body: formData
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload cover')
        }

        const newCoverUrl = data.imageUrl

        // Update book with new cover URL
        const updateResponse = await fetch(`/api/books/${book.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coverImage: newCoverUrl })
        })

        const updateData = await updateResponse.json()

        if (updateResponse.ok) {
          // Update SWR cache with new cover
          mutate({ ...book!, coverImage: newCoverUrl }, { revalidate: false })
        } else {
          throw new Error(updateData.error || 'Failed to update book cover')
        }
      } catch (error) {
        console.error('Error uploading cover:', error)
        alert('Failed to upload cover. Please try again.')
      } finally {
        setIsRegeneratingCover(false)
      }
    }
    fileInput.click()
  }


  const handleGenerateFullAudiobook = async () => {
    if (!selectedVoice) {
      alert('Please select a voice first')
      return
    }

    if (isGeneratingAudio) {
      return // Prevent multiple simultaneous generations
    }

    // Combine all content
    let fullContent = ''

    // Add introduction if it has content
    if (book?.introduction) {
      const introTextContent = book.introduction.replace(/<[^>]*>/g, '').trim()
      const introWordCount = introTextContent.split(/\s+/).filter(w => w.length > 0).length
      if (introWordCount > 0) {
        fullContent += `Introduction.\n\n${introTextContent}\n\n`
      }
    }

    // Add chapters with content
    const chaptersWithContent = book?.chapters.filter(chapter => {
      const textContent = chapter.content.replace(/<[^>]*>/g, '').trim()
      const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length
      return wordCount > 0
    }) || []

    chaptersWithContent.forEach((chapter, index) => {
      const chapterTextContent = chapter.content.replace(/<[^>]*>/g, '').trim()
      fullContent += `${chapter.title}.\n\n${chapterTextContent}`

      // Add spacing between chapters (but not after the last one unless we have a conclusion)
      if (index < chaptersWithContent.length - 1 || (book?.conclusion && book.conclusion.replace(/<[^>]*>/g, '').trim().length > 0)) {
        fullContent += '\n\n'
      }
    })

    // Add conclusion if it has content
    if (book?.conclusion) {
      const conclusionTextContent = book.conclusion.replace(/<[^>]*>/g, '').trim()
      const conclusionWordCount = conclusionTextContent.split(/\s+/).filter(w => w.length > 0).length
      if (conclusionWordCount > 0) {
        fullContent += `Conclusion.\n\n${conclusionTextContent}`
      }
    }

    setIsGeneratingAudio(true)
    setGeneratingFor('full-audiobook')

    try {
      const response = await fetch('/api/generate-audio', {
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
      } else {
        throw new Error(data.error || 'Failed to generate audiobook')
      }
    } catch (error) {
      console.error('Error generating full audiobook:', error)
      alert(`Failed to generate audiobook: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGeneratingAudio(false)
      setGeneratingFor(null)
    }
  }

  const handleGenerateAudio = async (content: string, type: 'introduction' | 'chapter' | 'conclusion', chapterTitle?: string, chapterId?: string) => {
    if (!selectedVoice) {
      alert('Please select a voice first')
      return
    }

    if (isGeneratingAudio) {
      return // Prevent multiple simultaneous generations
    }

    const textContent = content.replace(/<[^>]*>/g, '').trim()
    const contentId = chapterTitle || type

    setIsGeneratingAudio(true)
    setGeneratingFor(contentId)

    try {
      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceId: selectedVoice._id,
          voiceName: selectedVoice.title,
          text: textContent,
          chapterTitle: chapterTitle || (type === 'introduction' ? 'Introduction' : type === 'conclusion' ? 'Conclusion' : 'Chapter'),
          bookTitle: book?.title,
          bookId: book?.id,
          chapterId: chapterId || null,
          contentType: type.toUpperCase()
        })
      })

      const data = await response.json()

      if (response.ok) {
        console.log('Audio generation job started:', data.jobId)

        // Trigger a revalidation to get the updated audio generation status
        mutate()

        // Keep the generating state for a bit longer for immediate visual feedback
        setTimeout(() => {
          setIsGeneratingAudio(false)
          setGeneratingFor(null)
        }, 1000)
      } else {
        throw new Error(data.error || 'Failed to generate audio')
      }
    } catch (error) {
      console.error('Error generating audio:', error)
      alert(`Failed to generate audio: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // Clear state immediately on error
      setIsGeneratingAudio(false)
      setGeneratingFor(null)
    }
  }

  // SWR handles data fetching and revalidation automatically

  // Helper function to get audio generation status for a specific content
  const getAudioStatus = (chapterId: string | null, contentType: 'INTRODUCTION' | 'CHAPTER' | 'CONCLUSION') => {
    return book?.audioGenerations?.find(ag =>
      ag.chapterId === chapterId && ag.contentType === contentType
    )
  }

  const handleAudioGenerated = (audioUrl: string, metadata: Record<string, unknown>) => {
    console.log('Audio generated:', audioUrl, metadata)
    // Here you could save the audio URL to the database or display it to the user
    // For now, we'll just log it
  }

  const handleBackFromVoiceGenerator = () => {
    setShowVoiceGenerator(false)
    setVoiceGeneratorContent({
      content: '',
      type: 'introduction',
      chapterTitle: ''
    })
  }

  const copyBookTitle = async () => {
    if (!book) return

    try {
      await navigator.clipboard.writeText(book.title)
      setDeleteConfirmText(book.title) // Fill the input field
      setTitleCopied(true)

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setTitleCopied(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to copy title:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = book.title
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)

      setDeleteConfirmText(book.title) // Fill the input field
      setTitleCopied(true)
      setTimeout(() => {
        setTitleCopied(false)
      }, 2000)
    }
  }

  const deleteBook = async () => {
    if (!book) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/dashboard')
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete book')
      }
    } catch (error) {
      console.error('Error deleting book:', error)
      alert('Failed to delete book. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      setTitleCopied(false)
      setDeleteConfirmText('')
    }
  }

  // Chapter helpers
  const createChapterWithTitle = async (title: string, skipTabSwitch = false) => {
    const normalizedTitle = title.trim()
    if (!normalizedTitle || isCreatingChapter) return

    setIsCreatingChapter(true)
    try {
      const response = await fetch(`/api/books/${bookId}/chapters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: normalizedTitle,
          content: ''
        }),
      })

      if (response.ok) {
        const newChapter = await response.json()
        // Update SWR cache with new chapter
        mutate({
          ...book!,
          chapters: [...book!.chapters, newChapter].sort((a, b) => a.order - b.order)
        }, { revalidate: false })
        setSelectedChapter(newChapter)
        // Only switch to chapters tab if not already switching (to prevent loops)
        if (!skipTabSwitch) {
          setActiveTab('chapters')
        }
      }
    } catch (error) {
      console.error('Failed to create chapter:', error)
    } finally {
      setIsCreatingChapter(false)
    }
  }

  const createNextChapter = async () => {
    if (!book) return
    const nextChapterNumber = book.chapters.length + 1
    const title = `Chapter ${nextChapterNumber}`
    await createChapterWithTitle(title)
  }

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

  const deleteChapter = async (chapterId: string) => {
    if (!book) return

    setDeletingChapterId(chapterId)
    try {
      const response = await fetch(`/api/books/${bookId}/chapters/${chapterId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Remove chapter from local state and renumber remaining chapters
        const remainingChapters = book.chapters
          .filter(ch => ch.id !== chapterId)
          .sort((a, b) => a.order - b.order) // Sort by order first
          .map((chapter, index) => ({
            ...chapter,
            title: `Chapter ${index + 1}`, // Renumber starting from 1
            order: index + 1 // Update order as well
          }))

        // Update all chapters with new titles and orders
        const updatePromises = remainingChapters.map(chapter =>
          fetch(`/api/books/${bookId}/chapters/${chapter.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: chapter.title,
              order: chapter.order
            }),
          })
        )

        // Wait for all updates to complete
        await Promise.all(updatePromises)

        // Update SWR cache with renumbered chapters
        mutate({
          ...book!,
          chapters: remainingChapters
        }, { revalidate: false })

        // If this was the selected chapter, clear selection
        if (selectedChapter?.id === chapterId) {
          setSelectedChapter(null)
        }

        // Clean up the chapter's chat
        setChapterChats(prev => {
          const newChats = { ...prev }
          delete newChats[chapterId]
          return newChats
        })
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete chapter')
      }
    } catch (error) {
      console.error('Error deleting chapter:', error)
      alert('Failed to delete chapter. Please try again.')
    } finally {
      setDeletingChapterId(null)
    }
  }


  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-20 sm:pt-24 container mx-auto px-2">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
            {/* Left sidebar skeleton */}
            <div className="lg:col-span-1">
              {/* Book cover skeleton */}
              <div className="mb-6 space-y-4 text-center">
                <div className="flex justify-center">
                  <div className="relative w-40 h-52 max-w-[160px] group">
                    <div className="border relative overflow-hidden rounded-2xl shadow-lg">
                      <div className="aspect-[3/4] w-full relative">
                        <div className="w-full h-full bg-muted/30"></div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Book details skeleton */}
                <div className="space-y-2">
                  <Skeleton className="h-6 w-3/4 mx-auto bg-muted/20" />
                  <Skeleton className="h-4 w-16 mx-auto rounded-full bg-muted/20" />
                </div>
              </div>

              {/* Tabs skeleton */}
              <div className="space-y-2">
                <div className="space-y-1">
                  <Skeleton className="h-9 w-full rounded-md bg-muted/20" />
                  <Skeleton className="h-9 w-full rounded-md bg-muted/20" />
                  <Skeleton className="h-9 w-full rounded-md bg-muted/20" />
                </div>
              </div>
            </div>

            {/* Main content skeleton */}
            <div className="lg:col-span-3">
              <div className="space-y-4">
                {/* Header skeleton */}
                <div className="space-y-2">
                  <Skeleton className="h-7 w-32 bg-muted/20" />
                  <Skeleton className="h-4 w-48 bg-muted/20" />
                </div>

                {/* Content area skeleton */}
                <Skeleton className="h-[360px] w-full rounded-lg bg-muted/20" />
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-20 sm:pt-24 container mx-auto px-2">
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold mb-2">Book not found</h2>
            <Button asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const totalWords = book.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0)

  return (
    <div className="min-h-screen">
      <Header />

      <main className="pt-20 sm:pt-24 container mx-auto px-2" style={{ paddingBottom: 'calc(var(--writing-chat-reserved, 0px) + 24px)' }}>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
          <div className="lg:col-span-1">
            {/* Book Info Section */}
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
                  {(() => {
                    const hasIntro = book.introduction && book.introduction.replace(/<[^>]*>/g, '').trim().length > 0
                    if (hasIntro && book.introduction) {
                      const introTextContent = book.introduction.replace(/<[^>]*>/g, '').trim()
                      const introWordCount = introTextContent.split(/\s+/).filter(w => w.length > 0).length
                      return (
                        <div className="flex items-center">
                          <FileText className="h-3 w-3 mr-1" />
                          Introduction • {introWordCount.toLocaleString()} words
                        </div>
                      )
                    }
                    return null
                  })()}
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

            <Tabs value={activeTab} onValueChange={async (value) => {
              // Auto-create Chapter 1 when switching to chapters tab if no chapters exist
              if (value === 'chapters' && book && book.chapters.length === 0 && !isCreatingChapter) {
                await createChapterWithTitle('Chapter 1', true) // Skip tab switch to prevent loop
              }
              setActiveTab(value)
            }} className="w-full" orientation="vertical">
              <TabsList className="flex flex-col h-fit w-full p-2">
                <TabsTrigger value="introduction" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Introduction
                </TabsTrigger>
                <TabsTrigger value="chapters" className="w-full justify-start">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Chapters
                </TabsTrigger>
                <TabsTrigger value="conclusion" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Conclusion
                </TabsTrigger>
                <TabsTrigger value="voice" className="w-full justify-start">
                  <Volume2 className="h-4 w-4 mr-2" />
                  Voice Generation
                </TabsTrigger>
                <TabsTrigger value="settings" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chapters" className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">
                    {book.chapters.length} {book.chapters.length === 1 ? 'chapter' : 'chapters'}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={createNextChapter}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Chapter
                  </Button>
                </div>

                {book.chapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className={`relative p-3 border rounded-lg transition-colors hover:bg-muted/50 ${selectedChapter?.id === chapter.id ? 'bg-muted border-primary' : ''
                      } group`}
                  >
                    <div
                      className="cursor-pointer"
                      onClick={() => setSelectedChapter(chapter)}
                    >
                      <h3 className="font-medium line-clamp-2 text-sm">
                        {chapter.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {chapter.wordCount.toLocaleString()} words
                      </p>
                    </div>

                    {/* Delete button - only show on hover */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="relative">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmDeleteChapterId(confirmDeleteChapterId === chapter.id ? null : chapter.id)
                          }}
                          disabled={deletingChapterId === chapter.id}
                          title="Delete chapter"
                        >
                          {deletingChapterId === chapter.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>

                        {/* Confirmation dropdown */}
                        {confirmDeleteChapterId === chapter.id && (
                          <div className="absolute top-full right-0 mt-1 backdrop-blur-md border border-border/50 rounded-lg shadow-lg p-3 z-50 min-w-[140px]">
                            <p className="text-xs text-foreground mb-3">Delete chapter?</p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 px-3 text-xs flex-1"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteChapter(chapter.id)
                                  setConfirmDeleteChapterId(null)
                                }}
                                disabled={deletingChapterId === chapter.id}
                              >
                                Delete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-3 text-xs flex-1"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setConfirmDeleteChapterId(null)
                                }}
                                disabled={deletingChapterId === chapter.id}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-3">
            {activeTab === 'introduction' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Introduction</h2>
                    <p className="text-sm text-muted-foreground">
                      {(() => {
                        const textContent = getTextContent(introductionContent || '')
                        const hasContent = textContent.trim().length > 0
                        const lastUpdated = book.updatedAt ? new Date(book.updatedAt).toLocaleDateString() : ''

                        if (hasContent && lastUpdated) {
                          return `${textContent.length} characters • Last updated ${lastUpdated}`
                        } else if (hasContent) {
                          return `${textContent.length} characters`
                        } else {
                          return 'Start writing your book\'s introduction'
                        }
                      })()}
                    </p>
                  </div>
                </div>

                {/* Rich Text Editor */}
                <div className="space-y-3">
                  <RichEditor
                    value={introductionContent}
                    onChange={setIntroductionContent}
                    onSave={saveIntroduction}
                    isSaving={isSavingIntroduction}
                    autoSave={true}
                    className="bg-transparent"
                  />
                </div>

                <WritingChat
                  bookContext={{
                    title: book.title,
                    genre: book.genre || undefined,
                    targetAudience: book.targetAudience || undefined,
                    customInstructions: book.customInstructions || undefined,
                    currentContent: getTextContent(introductionContent),
                    fullIntroduction: book.introduction || undefined,
                    fullConclusion: book.conclusion || undefined,
                    chapters: book.chapters.map(chapter => ({
                      id: chapter.id,
                      title: chapter.title,
                      content: chapter.content,
                      order: chapter.order,
                      wordCount: chapter.wordCount
                    }))
                  }}
                  messages={introChatMessages}
                  setMessages={setIntroChatMessages}
                  isLoading={introChatLoading}
                  setIsLoading={setIntroChatLoading}
                  streamingMessageId={introStreamingMessageId}
                  setStreamingMessageId={setIntroStreamingMessageId}
                  hasExistingContent={(() => {
                    if (!book.introduction) return false

                    // Remove HTML tags and check if there's actual content
                    const textContent = book.introduction.replace(/<[^>]*>/g, '').trim()
                    const hasContent = textContent.length > 0

                    console.log('Book introduction HTML:', book.introduction)
                    console.log('Text content after removing HTML:', textContent)
                    console.log('Has existing content:', hasContent)
                    return hasContent
                  })()}
                  onContentGenerated={async (content) => {
                    setIntroductionContent(content)

                    // Automatically save to database
                    try {
                      const response = await fetch(`/api/books/${bookId}`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ introduction: content }),
                      })

                      if (response.ok) {
                        const updatedBook = await response.json()
                        // Update SWR cache with new introduction
                        mutate({ ...book!, introduction: updatedBook.introduction }, { revalidate: false })
                      }
                    } catch (error) {
                      console.error('Failed to save introduction:', error)
                    }
                  }}
                  collapsed={introChatCollapsed}
                  onCollapsedChange={setIntroChatCollapsed}
                />
              </div>
            )}
            {activeTab === 'conclusion' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Conclusion</h2>
                    <p className="text-sm text-muted-foreground">
                      {(() => {
                        const textContent = getTextContent(conclusionContent || '')
                        const hasContent = textContent.trim().length > 0
                        const lastUpdated = book.updatedAt ? new Date(book.updatedAt).toLocaleDateString() : ''

                        if (hasContent && lastUpdated) {
                          return `${textContent.length} characters • Last updated ${lastUpdated}`
                        } else if (hasContent) {
                          return `${textContent.length} characters`
                        } else {
                          return 'Start writing your book\'s conclusion'
                        }
                      })()}
                    </p>
                  </div>
                </div>
                {/* Rich Text Editor */}
                <div className="space-y-3">
                  <RichEditor
                    value={conclusionContent}
                    onChange={setConclusionContent}
                    onSave={saveConclusion}
                    isSaving={isSavingConclusion}
                    autoSave={true}
                    className="bg-transparent"
                  />
                </div>

                <WritingChat
                  bookContext={{
                    title: book.title,
                    genre: book.genre || undefined,
                    targetAudience: book.targetAudience || undefined,
                    customInstructions: book.customInstructions || undefined,
                    currentContent: getTextContent(conclusionContent),
                    fullIntroduction: book.introduction || undefined,
                    fullConclusion: book.conclusion || undefined,
                    chapters: book.chapters.map(chapter => ({
                      id: chapter.id,
                      title: chapter.title,
                      content: chapter.content,
                      order: chapter.order,
                      wordCount: chapter.wordCount
                    }))
                  }}
                  messages={conclusionChatMessages}
                  setMessages={setConclusionChatMessages}
                  isLoading={conclusionChatLoading}
                  setIsLoading={setConclusionChatLoading}
                  streamingMessageId={conclusionStreamingMessageId}
                  setStreamingMessageId={setConclusionStreamingMessageId}
                  hasExistingContent={(() => {
                    if (!book.conclusion) return false

                    // Remove HTML tags and check if there's actual content
                    const textContent = book.conclusion.replace(/<[^>]*>/g, '').trim()
                    const hasContent = textContent.length > 0

                    console.log('Book conclusion HTML:', book.conclusion)
                    console.log('Text content after removing HTML:', textContent)
                    console.log('Has existing content:', hasContent)
                    return hasContent
                  })()}
                  onContentGenerated={async (content) => {
                    setConclusionContent(content)

                    // Automatically save to database
                    try {
                      const response = await fetch(`/api/books/${bookId}`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ conclusion: content }),
                      })

                      if (response.ok) {
                        const updatedBook = await response.json()
                        // Update SWR cache with new conclusion
                        mutate({ ...book!, conclusion: updatedBook.conclusion }, { revalidate: false })
                      }
                    } catch (error) {
                      console.error('Failed to save conclusion:', error)
                    }
                  }}
                  collapsed={conclusionChatCollapsed}
                  onCollapsedChange={setConclusionChatCollapsed}
                  mode="conclusion"
                />
              </div>
            )}

            {activeTab === 'chapters' && (
              <div className="space-y-4">
                {selectedChapter ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold">{selectedChapter.title}</h2>
                        <p className="text-sm text-muted-foreground">
                          {selectedChapter.wordCount.toLocaleString()} words • Last updated {new Date(selectedChapter.updatedAt).toLocaleDateString()}
                        </p>
                      </div>

                    </div>

                    <div className="space-y-3">
                      <RichEditor
                        value={editingChapter?.content || ''}
                        onChange={(html) => setEditingChapter(prev => prev ? { ...prev, content: html } : prev)}
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
                      const chapterChat = getChapterChat(selectedChapter.id)
                      return (
                        <WritingChat
                          bookContext={{
                            title: book.title,
                            genre: book.genre || undefined,
                            targetAudience: book.targetAudience || undefined,
                            customInstructions: book.customInstructions || undefined,
                            currentContent: (editingChapter?.content || '').replace(/<[^>]*>/g, ''),
                            fullIntroduction: book.introduction || undefined,
                            fullConclusion: book.conclusion || undefined,
                            chapters: book.chapters.map(chapter => ({
                              id: chapter.id,
                              title: chapter.title,
                              content: chapter.content,
                              order: chapter.order,
                              wordCount: chapter.wordCount
                            }))
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
                          hasExistingContent={Boolean((editingChapter?.content || '').replace(/<[^>]*>/g, '').trim().length)}
                          onContentGenerated={async (content) => {
                            // Update editor and persist chapter content
                            setEditingChapter(prev => prev ? { ...prev, content } : prev)
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
                      )
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h2 className="text-xl font-semibold mb-2">Select a chapter to edit</h2>
                    <p className="text-muted-foreground mb-6">
                      Choose a chapter from the sidebar to get started writing.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'voice' && (
              <div className="space-y-6">
                {showVoiceGenerator ? (
                  <VoiceGenerator
                    bookTitle={book.title}
                    bookId={book.id}
                    content={voiceGeneratorContent.content}
                    contentType={voiceGeneratorContent.type}
                    chapterTitle={voiceGeneratorContent.chapterTitle}
                    onAudioGenerated={handleAudioGenerated}
                    onBack={handleBackFromVoiceGenerator}
                  />
                ) : (
                  <>
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
                        const hasIntroContent = book.introduction && (() => {
                          const textContent = book.introduction.replace(/<[^>]*>/g, '').trim()
                          const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length
                          return wordCount > 0
                        })()

                        const hasConclusionContent = book.conclusion && (() => {
                          const textContent = book.conclusion.replace(/<[^>]*>/g, '').trim()
                          const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length
                          return wordCount > 0
                        })()

                        const chaptersWithContent = book.chapters.filter(chapter => {
                          const textContent = chapter.content.replace(/<[^>]*>/g, '').trim()
                          const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length
                          return wordCount > 0
                        })

                        const totalContentPieces = (hasIntroContent ? 1 : 0) + (hasConclusionContent ? 1 : 0) + chaptersWithContent.length

                        return totalContentPieces > 1
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
                                onClick={() => handleGenerateFullAudiobook()}
                                disabled={!selectedVoice || (isGeneratingAudio && generatingFor === 'full-audiobook')}
                                className="bg-primary hover:bg-primary/90"
                              >
                                {isGeneratingAudio && generatingFor === 'full-audiobook' ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Generating...
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

                      {/* Introduction Option */}
                      {book.introduction && (() => {
                        const textContent = book.introduction.replace(/<[^>]*>/g, '').trim()
                        const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length
                        return wordCount > 0
                      })() && (
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <h4 className="font-medium">Introduction</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {(() => {
                                      const textContent = book.introduction.replace(/<[^>]*>/g, '').trim()
                                      const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length
                                      return `${wordCount} words`
                                    })()}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant={selectedVoice ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleGenerateAudio(book.introduction || '', 'introduction')}
                                disabled={!selectedVoice || (isGeneratingAudio && generatingFor === 'introduction') || (() => {
                                  const introStatus = getAudioStatus(null, 'INTRODUCTION')
                                  return introStatus?.status === 'PENDING' || introStatus?.status === 'PROCESSING'
                                })()}
                              >
                                {(() => {
                                  const introStatus = getAudioStatus(null, 'INTRODUCTION')

                                  // Show processing immediately if we're generating this specific content
                                  if (isGeneratingAudio && generatingFor === 'introduction') {
                                    return (
                                      <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Processing...
                                      </>
                                    )
                                  }

                                  // Only show job status for truly active jobs (PENDING/PROCESSING)
                                  if (introStatus?.status === 'PENDING') {
                                    return (
                                      <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Queued...
                                      </>
                                    )
                                  }

                                  if (introStatus?.status === 'PROCESSING') {
                                    return (
                                      <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Processing...
                                      </>
                                    )
                                  }

                                  // For FAILED, COMPLETED, or no status, show appropriate static button
                                  if (introStatus?.status === 'FAILED') {
                                    return (
                                      <>
                                        <X className="h-4 w-4 mr-2" />
                                        Retry Audio
                                      </>
                                    )
                                  }

                                  if (introStatus?.status === 'COMPLETED' && introStatus.audioUrl) {
                                    return (
                                      <>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Regenerate Audio
                                      </>
                                    )
                                  }

                                  // Default state - no existing audio or incomplete
                                  return (
                                    <>
                                      <Volume2 className="h-4 w-4 mr-2" />
                                      Generate Audio
                                    </>
                                  )
                                })()}
                              </Button>
                            </div>
                            {/* Audio Player for Introduction */}
                            {(() => {
                              const introAudio = book.audioGenerations?.find(
                                audio => audio.contentType === 'INTRODUCTION'
                              )

                              if (!introAudio) return null

                              if (introAudio.status === 'COMPLETED' && introAudio.audioUrl) {
                                return (
                                  <div className="mt-3">
                                    <AudioPlayer
                                      audioUrl={introAudio.audioUrl}
                                      title="Introduction"
                                      voiceName={introAudio.voiceName}
                                    />
                                  </div>
                                )
                              }

                              if (introAudio.status === 'FAILED') {
                                return (
                                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                                      <X className="h-4 w-4" />
                                      <span>Audio generation failed</span>
                                    </div>
                                    {introAudio.errorMessage && (
                                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                                        {introAudio.errorMessage}
                                      </p>
                                    )}
                                  </div>
                                )
                              }

                              return null
                            })()}
                          </div>
                        )}

                      {/* Conclusion Option */}
                      {book.conclusion && (() => {
                        const textContent = book.conclusion.replace(/<[^>]*>/g, '').trim()
                        const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length
                        return wordCount > 0
                      })() && (
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <h4 className="font-medium">Conclusion</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {(() => {
                                      const textContent = book.conclusion.replace(/<[^>]*>/g, '').trim()
                                      const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length
                                      return `${wordCount} words`
                                    })()}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant={selectedVoice ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleGenerateAudio(book.conclusion || '', 'conclusion')}
                                disabled={!selectedVoice || (isGeneratingAudio && generatingFor === 'conclusion') || (() => {
                                  const conclusionStatus = getAudioStatus(null, 'CONCLUSION')
                                  return conclusionStatus?.status === 'PENDING' || conclusionStatus?.status === 'PROCESSING'
                                })()}
                              >
                                {(() => {
                                  const conclusionStatus = getAudioStatus(null, 'CONCLUSION')

                                  // Show processing immediately if we're generating this specific content
                                  if (isGeneratingAudio && generatingFor === 'conclusion') {
                                    return (
                                      <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Processing...
                                      </>
                                    )
                                  }

                                  // Only show job status for truly active jobs (PENDING/PROCESSING)
                                  if (conclusionStatus?.status === 'PENDING') {
                                    return (
                                      <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Queued...
                                      </>
                                    )
                                  }

                                  if (conclusionStatus?.status === 'PROCESSING') {
                                    return (
                                      <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Processing...
                                      </>
                                    )
                                  }

                                  // For FAILED, COMPLETED, or no status, show appropriate static button
                                  if (conclusionStatus?.status === 'FAILED') {
                                    return (
                                      <>
                                        <X className="h-4 w-4 mr-2" />
                                        Retry Audio
                                      </>
                                    )
                                  }

                                  if (conclusionStatus?.status === 'COMPLETED' && conclusionStatus.audioUrl) {
                                    return (
                                      <>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Regenerate Audio
                                      </>
                                    )
                                  }

                                  // Default state - no existing audio or incomplete
                                  return (
                                    <>
                                      <Volume2 className="h-4 w-4 mr-2" />
                                      Generate Audio
                                    </>
                                  )
                                })()}
                              </Button>
                            </div>
                            {/* Audio Player for Conclusion */}
                            {(() => {
                              const conclusionAudio = book.audioGenerations?.find(
                                audio => audio.contentType === 'CONCLUSION'
                              )

                              if (!conclusionAudio) return null

                              if (conclusionAudio.status === 'COMPLETED' && conclusionAudio.audioUrl) {
                                return (
                                  <div className="mt-3">
                                    <AudioPlayer
                                      audioUrl={conclusionAudio.audioUrl}
                                      title="Conclusion"
                                      voiceName={conclusionAudio.voiceName}
                                    />
                                  </div>
                                )
                              }

                              if (conclusionAudio.status === 'FAILED') {
                                return (
                                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                                      <X className="h-4 w-4" />
                                      <span>Audio generation failed</span>
                                    </div>
                                    {conclusionAudio.errorMessage && (
                                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                                        {conclusionAudio.errorMessage}
                                      </p>
                                    )}
                                  </div>
                                )
                              }

                              return null
                            })()}
                          </div>
                        )}

                      {/* Chapters Options */}
                      {book.chapters.filter(chapter => {
                        const textContent = chapter.content.replace(/<[^>]*>/g, '').trim()
                        const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length
                        return wordCount > 0
                      }).map((chapter) => (
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
                              onClick={() => handleGenerateAudio(chapter.content, 'chapter', chapter.title, chapter.id)}
                              disabled={!selectedVoice || (isGeneratingAudio && generatingFor === chapter.title) || (() => {
                                const chapterStatus = getAudioStatus(chapter.id, 'CHAPTER')
                                return chapterStatus?.status === 'PENDING' || chapterStatus?.status === 'PROCESSING'
                              })()}
                            >
                              {(() => {
                                const chapterStatus = getAudioStatus(chapter.id, 'CHAPTER')

                                // Show processing immediately if we're generating this specific content
                                if (isGeneratingAudio && generatingFor === chapter.title) {
                                  return (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                      Processing...
                                    </>
                                  )
                                }

                                // Only show job status for truly active jobs (PENDING/PROCESSING)
                                if (chapterStatus?.status === 'PENDING') {
                                  return (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                      Queued...
                                    </>
                                  )
                                }

                                if (chapterStatus?.status === 'PROCESSING') {
                                  return (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                      Processing...
                                    </>
                                  )
                                }

                                // For FAILED, COMPLETED, or no status, show appropriate static button
                                if (chapterStatus?.status === 'FAILED') {
                                  return (
                                    <>
                                      <X className="h-4 w-4 mr-2" />
                                      Retry Audio
                                    </>
                                  )
                                }

                                if (chapterStatus?.status === 'COMPLETED' && chapterStatus.audioUrl) {
                                  return (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Regenerate Audio
                                    </>
                                  )
                                }

                                // Default state - no existing audio or incomplete
                                return (
                                  <>
                                    <Volume2 className="h-4 w-4 mr-2" />
                                    Generate Audio
                                  </>
                                )
                              })()}
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
                        const hasIntroContent = book.introduction && (() => {
                          const textContent = book.introduction.replace(/<[^>]*>/g, '').trim()
                          const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length
                          return wordCount > 0
                        })()

                        const hasConclusionContent = book.conclusion && (() => {
                          const textContent = book.conclusion.replace(/<[^>]*>/g, '').trim()
                          const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length
                          return wordCount > 0
                        })()

                        const hasChapterContent = book.chapters.some(chapter => {
                          const textContent = chapter.content.replace(/<[^>]*>/g, '').trim()
                          const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length
                          return wordCount > 0
                        })

                        return !hasIntroContent && !hasConclusionContent && !hasChapterContent
                      })() && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Volume2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Add content to your book to generate audio</p>
                          </div>
                        )}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Book Settings</h2>
                    <p className="text-sm text-muted-foreground">
                      Configure your book details and AI writing preferences
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="settings-title" className="text-sm font-medium">Book Title</Label>
                      <Input
                        id="settings-title"
                        value={bookForm.title}
                        onChange={(e) => setBookForm(prev => ({ ...prev, title: e.target.value }))}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="settings-genre" className="text-sm font-medium">Genre</Label>
                      <Select
                        value={bookForm.genre}
                        onValueChange={(value) => setBookForm(prev => ({ ...prev, genre: value }))}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select a genre..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Romance">Romance</SelectItem>
                          <SelectItem value="Mystery & Thriller">Mystery & Thriller</SelectItem>
                          <SelectItem value="Fantasy">Fantasy</SelectItem>
                          <SelectItem value="Science Fiction">Science Fiction</SelectItem>
                          <SelectItem value="Historical Fiction">Historical Fiction</SelectItem>
                          <SelectItem value="Literary Fiction">Literary Fiction</SelectItem>
                          <SelectItem value="Horror">Horror</SelectItem>
                          <SelectItem value="Adventure">Adventure</SelectItem>
                          <SelectItem value="Western">Western</SelectItem>
                          <SelectItem value="Young Adult Fiction">Young Adult Fiction</SelectItem>
                          <SelectItem value="Children's Fiction">Children's Fiction</SelectItem>
                          <SelectItem value="Biography">Biography</SelectItem>
                          <SelectItem value="Self-Help">Self-Help</SelectItem>
                          <SelectItem value="Business">Business</SelectItem>
                          <SelectItem value="Health & Wellness">Health & Wellness</SelectItem>
                          <SelectItem value="Technology">Technology</SelectItem>
                          <SelectItem value="History">History</SelectItem>
                          <SelectItem value="Science">Science</SelectItem>
                          <SelectItem value="Philosophy">Philosophy</SelectItem>
                          <SelectItem value="Travel">Travel</SelectItem>
                          <SelectItem value="Cooking">Cooking</SelectItem>
                          <SelectItem value="Politics">Politics</SelectItem>
                          <SelectItem value="Religion">Religion</SelectItem>
                          <SelectItem value="Education">Education</SelectItem>
                          <SelectItem value="Memoir">Memoir</SelectItem>
                          <SelectItem value="True Crime">True Crime</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="settings-audience" className="text-sm font-medium">Target Audience</Label>
                      <Select
                        value={bookForm.targetAudience}
                        onValueChange={(value) => setBookForm(prev => ({ ...prev, targetAudience: value }))}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select target audience..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="General Adult">General Adult</SelectItem>
                          <SelectItem value="Young Adult (13-18)">Young Adult (13-18)</SelectItem>
                          <SelectItem value="Children (8-12)">Children (8-12)</SelectItem>
                          <SelectItem value="Professionals">Professionals</SelectItem>
                          <SelectItem value="Students">Students</SelectItem>
                          <SelectItem value="Entrepreneurs">Entrepreneurs</SelectItem>
                          <SelectItem value="Parents">Parents</SelectItem>
                          <SelectItem value="Seniors">Seniors</SelectItem>
                          <SelectItem value="Beginners">Beginners</SelectItem>
                          <SelectItem value="Advanced">Advanced</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="settings-instructions" className="text-sm font-medium">AI Writing Instructions</Label>
                      <Textarea
                        id="settings-instructions"
                        value={bookForm.customInstructions}
                        onChange={(e) => setBookForm(prev => ({ ...prev, customInstructions: e.target.value }))}
                        placeholder="Provide specific instructions for AI to follow when writing chapters (tone, style, themes, character development, etc.)"
                        rows={6}
                        className="mt-2 resize-none bg-transparent backdrop-blur-md border border-border rounded-lg"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={updateBookDetails}
                        className={`px-6 transition-colors ${settingsSaved ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        disabled={isSavingSettings}
                      >
                        {isSavingSettings ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : settingsSaved ? (
                          <Check className="h-4 w-4 mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        {isSavingSettings ? 'Saving...' : settingsSaved ? 'Saved' : 'Save Changes'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBookForm({
                            title: book.title || '',
                            introduction: book.introduction || '',
                            customInstructions: book.customInstructions || '',
                            genre: book.genre || '',
                            targetAudience: book.targetAudience || ''
                          })
                        }}
                      >
                        Reset
                      </Button>
                    </div>

                    {/* Danger Zone */}
                    <div className="mt-8 pt-6 border-t border-border">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Delete Book</h3>
                          <p className="text-sm text-muted-foreground">
                            This action cannot be undone.
                          </p>
                        </div>

                        {!showDeleteConfirm ? (
                          <Button
                            variant="destructive"
                            onClick={() => {
                              setShowDeleteConfirm(true)
                              setTitleCopied(false)
                              setDeleteConfirmText('')
                            }}
                            className="px-6"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Book
                          </Button>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor="delete-confirm" className="text-sm font-medium">
                                Type
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={copyBookTitle}
                                  className="h-5 w-5 p-0 mx-1 inline-flex"
                                  disabled={isDeleting}
                                >
                                  {titleCopied ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                                <span className="font-semibold">&quot;{book.title}&quot;</span> to confirm:
                              </Label>
                              <Input
                                id="delete-confirm"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="Enter book title..."
                                className="mt-2"
                                disabled={isDeleting}
                              />
                            </div>
                            <div className="flex gap-3">
                              <Button
                                variant="destructive"
                                onClick={deleteBook}
                                disabled={isDeleting || deleteConfirmText.trim() !== book.title}
                                className="px-6"
                              >
                                {isDeleting ? 'Deleting...' : 'Delete Forever'}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setShowDeleteConfirm(false)
                                  setTitleCopied(false)
                                  setDeleteConfirmText('')
                                }}
                                disabled={isDeleting}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

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