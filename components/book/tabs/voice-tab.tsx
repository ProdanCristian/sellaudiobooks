"use client"

import { useState, useEffect } from 'react'
import { KeyedMutator } from 'swr'
import { Button } from '@/components/ui/button'
import { Volume2, RefreshCw, BookOpen, X } from 'lucide-react'
import VoiceSelectionModal from '@/components/voice/voice-selection-modal'
import AudioPlayer from '@/components/voice/audio-player'
import { Voice } from '@/types/voice'
// import { useRouter } from 'next/navigation'

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
  selectedVoice: Voice | null
  setSelectedVoice: (voice: Voice | null) => void
  mutate: KeyedMutator<Book>
}

export default function VoiceTab({
  book,
  selectedVoice,
  setSelectedVoice,
  mutate,

}: VoiceTabProps) {
  // const router = useRouter()
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)
  const [batchProgress, setBatchProgress] = useState<{ done: number, total: number } | null>(null)
  const [generatingChapterIds, setGeneratingChapterIds] = useState<Set<string>>(new Set())
  const [isMerging, setIsMerging] = useState(false)
  const [fullMarkers, setFullMarkers] = useState<{ label: string, time: number }[] | null>(null)
  const [showVoiceModal, setShowVoiceModal] = useState(false)
  const [isVoiceModalLoading, setIsVoiceModalLoading] = useState(false)

  const htmlToText = (html: string): string => {
    return (html || '')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<br\s*\/?>(\s*)/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<div[^>]*>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  // On mount and whenever server data changes, derive local generating state
  useEffect(() => {
    if (isGeneratingAudio) return
    const inProgress = (book?.audioGenerations || [])
      .filter(ag => ag.status === 'PENDING' || ag.status === 'PROCESSING')
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
    if (inProgress) {
      setIsGeneratingAudio(true)
      if (inProgress.contentType === 'FULL_BOOK') setGeneratingFor('full-audiobook')
      else if (inProgress.contentType === 'CHAPTER') {
        const chapter = book?.chapters.find(ch => ch.id === inProgress.chapterId)
        setGeneratingFor(chapter ? chapter.title : null)
      }
    } else {
      setIsGeneratingAudio(false)
      setGeneratingFor(null)
    }
  }, [book?.audioGenerations, book?.chapters, isGeneratingAudio])

  // Reset state when completed/failed
  useEffect(() => {
    if (!book?.audioGenerations) return
    // prune local generating set when server shows completed/failed
    setGeneratingChapterIds(prev => {
      if (prev.size === 0) return prev
      const next = new Set(prev)
      for (const chId of prev) {
        const job = (book?.audioGenerations || []).find(ag => ag.contentType === 'CHAPTER' && ag.chapterId === chId)
        if (job && (job.status === 'COMPLETED' || job.status === 'FAILED')) {
          next.delete(chId)
        }
      }
      return next
    })

    if (!isGeneratingAudio || !generatingFor) return
    if (generatingFor === 'full-audiobook') {
      const fullBookJob = (book?.audioGenerations || []).find(ag => ag.contentType === 'FULL_BOOK')
      if (fullBookJob && ((fullBookJob.status === 'COMPLETED' && fullBookJob.audioUrl) || fullBookJob.status === 'FAILED')) {
        setIsGeneratingAudio(false)
        setGeneratingFor(null)
      }
    } else {
      const chapterJob = (book?.audioGenerations || []).find(ag =>
        ag.contentType === 'CHAPTER' &&
        book.chapters.some(ch => ch.title === generatingFor && ch.id === ag.chapterId)
      )
      if (chapterJob && ((chapterJob.status === 'COMPLETED' && chapterJob.audioUrl) || chapterJob.status === 'FAILED')) {
        setIsGeneratingAudio(false)
        setGeneratingFor(null)
      }
    }
  }, [book?.audioGenerations, book?.chapters, isGeneratingAudio, generatingFor])

  // Build exact markers from completed chapter audios (uses real durations)
  useEffect(() => {
    const buildMarkers = async () => {
      try {
        const chapters = (book?.chapters || []).slice().sort((a, b) => a.order - b.order)
        const chaptersWithContent = chapters.filter(ch => {
          const t = htmlToText(ch.content)
          const wc = t.split(/\s+/).filter(w => w.length > 0).length
          return wc > 0 && ch.wordCount > 0
        })
        if (chaptersWithContent.length === 0) { setFullMarkers(null); return }

        const chapterAudioById = new Map<string, string>()
          ; (book?.audioGenerations || []).forEach(ag => {
            if (ag.contentType === 'CHAPTER' && ag.status === 'COMPLETED' && ag.audioUrl && ag.chapterId) {
              chapterAudioById.set(ag.chapterId, ag.audioUrl)
            }
          })

        const urls: { id: string, title: string, url: string }[] = []
        for (const ch of chaptersWithContent) {
          const url = chapterAudioById.get(ch.id)
          if (!url) { setFullMarkers(null); return }
          urls.push({ id: ch.id, title: ch.title, url })
        }

        const getDuration = (src: string) => new Promise<number>((resolve, reject) => {
          const a = new Audio()
          let done = false
          const onMeta = () => { if (!done) { done = true; resolve(isFinite(a.duration) ? a.duration : 0) } }
          const onErr = () => { if (!done) { done = true; reject(new Error('metadata error')) } }
          a.preload = 'metadata'
          a.src = src
          a.addEventListener('loadedmetadata', onMeta)
          a.addEventListener('error', onErr)
          setTimeout(() => { if (!done) { done = true; resolve(0) } }, 10000)
        })

        const durations = await Promise.all(urls.map(u => getDuration(u.url)))
        if (durations.some(d => d <= 0)) { setFullMarkers(null); return }

        const markers: { label: string, time: number }[] = []
        let acc = 0
        for (let i = 0; i < urls.length; i++) {
          markers.push({ label: `${i + 1}. ${urls[i].title}`, time: acc })
          acc += durations[i]
        }
        setFullMarkers(markers)
      } catch {
        setFullMarkers(null)
      }
    }
    buildMarkers()
  }, [book?.audioGenerations, book?.chapters])

  // Helper used by modal: generate missing or all chapter audios, then request full-book
  const handleGenerateFullPlan = async (regenerateAll: boolean) => {
    if (!selectedVoice) {
      alert('Please select a voice first')
      return
    }

    const orderedChapters = (book?.chapters || []).slice().sort((a, b) => a.order - b.order)
    const chaptersWithContent = orderedChapters.filter(ch => {
      const textContent = htmlToText(ch.content)
      const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length
      return wordCount > 0 && ch.wordCount > 0
    })

    const completedById = new Set<string>()
      ; (book?.audioGenerations || []).forEach(ag => {
        if (ag.contentType === 'CHAPTER' && ag.status === 'COMPLETED' && ag.audioUrl && ag.chapterId) {
          completedById.add(ag.chapterId)
        }
      })

    const targetChapters = regenerateAll
      ? chaptersWithContent
      : chaptersWithContent.filter(ch => !completedById.has(ch.id))

    const postChapterJob = async (chapter: Chapter) => {
      const chapterText = htmlToText(chapter.content)
      const textWithTitle = `${chapter.title}.\n\n${chapterText}`
      const res = await fetch('/api/generation/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceId: selectedVoice!.id,
          voiceName: selectedVoice!.title,
          text: textWithTitle,
          chapterTitle: chapter.title,
          bookTitle: book?.title,
          bookId: book?.id,
          chapterId: chapter.id,
          contentType: 'CHAPTER',
          language: (selectedVoice?.languages && selectedVoice.languages[0]) || 'en-us'
        })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(data.error || 'Failed to generate chapter audio')
      }
    }

    setIsGeneratingAudio(true)
    setGeneratingFor('full-audiobook')
    setBatchProgress({ done: 0, total: targetChapters.length })
    // modal removed; nothing to close

    for (let i = 0; i < targetChapters.length; i++) {
      const ch = targetChapters[i]
      try {
        await postChapterJob(ch)
      } catch {
        console.error('Chapter generation failed:', ch.title)
        // Unhide button if enqueue failed
        setGeneratingChapterIds(prev => { const s = new Set(prev); s.delete(ch.id); return s })
      } finally {
        setBatchProgress(prev => prev ? { done: prev.done + 1, total: prev.total } : null)
        mutate()
      }
    }

    // After queuing all chapter jobs, poll until all chapter audios are completed, then merge
    ; (async () => {
      try {
        await waitForAllChapterAudios()
        await handleMergeAllChapters()
      } catch (err) {
        console.warn('Auto-merge skipped or failed:', err)
      } finally {
        setIsGeneratingAudio(false)
        setGeneratingFor(null)
        setBatchProgress(null)
      }
    })()
  }

  const waitForAllChapterAudios = async () => {
    const deadline = Date.now() + 30 * 60 * 1000 // 30 minutes safety timeout
    while (Date.now() < deadline) {
      try {
        const res = await fetch(`/api/books/${book.id}`)
        if (!res.ok) throw new Error('Failed to refresh book state')
        const fresh = await res.json()
        const chaptersWithContent: Chapter[] = (fresh?.chapters || []).filter((ch: Chapter) => {
          const t = htmlToText(ch.content)
          const wc = t.split(/\s+/).filter((w: string) => w.length > 0).length
          return wc > 0 && ch.wordCount > 0
        })
        if (chaptersWithContent.length === 0) return
        const completedById = new Set<string>()
          ; (fresh?.audioGenerations || []).forEach((ag: AudioGeneration) => {
            if (ag.contentType === 'CHAPTER' && ag.status === 'COMPLETED' && ag.audioUrl && ag.chapterId) {
              completedById.add(ag.chapterId)
            }
          })
        const allDone = chaptersWithContent.every((ch: Chapter) => completedById.has(ch.id))
        if (allDone) return
      } catch {
        // continue polling despite transient errors
      }
      await new Promise(r => setTimeout(r, 5000))
    }
    throw new Error('Timed out waiting for chapter audios to complete')
  }

  const handleGenerateAudio = async (content: string, type: 'chapter', chapterTitle?: string, chapterId?: string) => {
    if (!selectedVoice) {
      alert('Please select a voice first')
      return
    }

    const textContent = htmlToText(content)
    const textWithTitle = chapterTitle ? `${chapterTitle}.\n\n${textContent}` : textContent

    try {
      const response = await fetch('/api/generation/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceId: selectedVoice!.id,
          voiceName: selectedVoice!.title,
          text: textWithTitle,
          chapterTitle: chapterTitle || 'Chapter',
          bookTitle: book?.title,
          bookId: book?.id,
          chapterId: chapterId || null,
          contentType: 'CHAPTER',
          language: (selectedVoice?.languages && selectedVoice.languages[0]) || 'en-us'
        })
      })

      const data = await response.json()
      if (response.ok) mutate()
      else throw new Error(data.error || 'Failed to generate audio')
    } catch (error) {
      console.error('Error generating audio:', error)
      alert(`Failed to generate audio: ${error instanceof Error ? error.message : 'Unknown error'}`)
      if (chapterId) setGeneratingChapterIds(prev => { const next = new Set(prev); next.delete(chapterId); return next })
    }
  }
  // const [showVoiceModal, setShowVoiceModal] = useState(false)

  // Convenience booleans
  const hasAnyContent = book.chapters.some(ch => {
    const t = htmlToText(ch.content)
    const wc = t.split(/\s+/).filter(w => w.length > 0).length
    return wc > 0 && ch.wordCount > 0
  })
  const isBatchProcessing = isGeneratingAudio && generatingFor === 'full-audiobook'
  const canMergeAllChapters = (() => {
    const chaptersWithContent = (book?.chapters || []).filter(ch => {
      const t = htmlToText(ch.content)
      const wc = t.split(/\s+/).filter(w => w.length > 0).length
      return wc > 0 && ch.wordCount > 0
    })
    if (chaptersWithContent.length === 0) return false
    const completedById = new Set<string>()
      ; (book?.audioGenerations || []).forEach(ag => {
        if (ag.contentType === 'CHAPTER' && ag.status === 'COMPLETED' && ag.audioUrl && ag.chapterId) {
          completedById.add(ag.chapterId)
        }
      })
    return chaptersWithContent.every(ch => completedById.has(ch.id))
  })()
  const hasMissingChapterAudios = (() => {
    const chaptersWithContent = (book?.chapters || []).filter(ch => {
      const t = htmlToText(ch.content)
      const wc = t.split(/\s+/).filter(w => w.length > 0).length
      return wc > 0 && ch.wordCount > 0
    })
    if (chaptersWithContent.length === 0) return false
    const completedById = new Set<string>()
      ; (book?.audioGenerations || []).forEach(ag => {
        if (ag.contentType === 'CHAPTER' && ag.status === 'COMPLETED' && ag.audioUrl && ag.chapterId) {
          completedById.add(ag.chapterId)
        }
      })
    return chaptersWithContent.some(ch => !completedById.has(ch.id))
  })()

  const handleMergeAllChapters = async () => {
    try {
      setIsMerging(true)
      const res = await fetch('/api/generation/audio/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book?.id })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }))
        alert(data.error || 'Failed to merge chapters into a full audio')
        return
      }
      mutate()
      // modal removed; nothing to close
    } catch (err) {
      console.error('Merge all chapters failed', err)
      alert('Failed to merge chapters into a full audio')
    } finally {
      setIsMerging(false)
    }
  }

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
            <Button variant="outline" size="sm" onClick={() => setShowVoiceModal(true)}>
              {isVoiceModalLoading ? (
                <span className="flex items-center"><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Loading</span>
              ) : (
                'Change'
              )}
            </Button>
          </div>
        ) : (
          <Button onClick={() => setShowVoiceModal(true)} variant="outline" className="w-full">
            <Volume2 className="h-4 w-4 mr-2" />
            Select Voice
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Generate Audio Content</h3>

        {/* Complete Audiobook card (like before) */}
        <div className={`relative border-2 border-primary/20 rounded-lg p-4 bg-primary/5 ${isMerging ? 'animate-pulse' : ''}`}>
          {isMerging && (
            <div className="pointer-events-none absolute -inset-1 bg-gradient-to-br from-blue-500/20 via-transparent to-sky-500/20 rounded-xl opacity-100 -z-10 blur-xl" />
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Volume2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-primary">Complete Audiobook</h4>
                <p className="text-sm text-muted-foreground">Merge chapter audios into a single full book</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canMergeAllChapters ? (
                <div className="relative group w-full sm:w-auto">
                  <div className="pointer-events-none absolute -inset-1 rounded-lg bg-blue-500/20 blur-lg opacity-60 group-hover:opacity-80 transition"></div>
                  <Button
                    variant="default"
                    onClick={handleMergeAllChapters}
                    disabled={isMerging}
                    className="relative w-full sm:w-auto shadow-md"
                  >
                    <span className="flex items-center">
                      <Volume2 className="h-4 w-4 mr-2" />
                      Generate Full Audio Book
                    </span>
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Generate chapters first</div>
              )}
            </div>
          </div>
          {(() => {
            const fullAudio = book.audioGenerations?.find(a => a.contentType === 'FULL_BOOK')
            if (!fullAudio) return null
            // Build exact markers by chapter durations if available
            const chapters = (book?.chapters || []).slice().sort((a, b) => a.order - b.order)
            const chaptersWithContent = chapters.filter(ch => {
              const t = htmlToText(ch.content)
              const wc = t.split(/\s+/).filter(w => w.length > 0).length
              return wc > 0 && ch.wordCount > 0
            })
            const totalWords = chaptersWithContent.reduce((acc, ch) => acc + ch.wordCount, 0)
            let accRatio = 0
            const markers = totalWords > 0 ? chaptersWithContent.map((ch, idx) => {
              const startRatio = accRatio
              const ratio = ch.wordCount / totalWords
              accRatio += ratio
              return { label: `${idx + 1}. ${ch.title}`, time: startRatio }
            }) : []
            return (
              <div className="mt-3">
                <AudioPlayer audioUrl={fullAudio.audioUrl || ''} title={book.title} markers={fullMarkers || markers} normalizedMarkers={!!(!fullMarkers && markers.length > 0)} />
              </div>
            )
          })()}
        </div>

        {/* Generation actions after the card */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          {hasMissingChapterAudios && (
            <Button
              variant="outline"
              onClick={() => handleGenerateFullPlan(false)}
              disabled={!selectedVoice || isBatchProcessing}
              className="w-full sm:w-auto"
            >
              Generate missing chapters
            </Button>
          )}
          <Button
            onClick={() => handleGenerateFullPlan(true)}
            disabled={!selectedVoice || !hasAnyContent || isBatchProcessing}
            className="w-full sm:w-auto"
          >
            {isBatchProcessing && batchProgress ? (
              <span className="flex items-center"><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Processing {batchProgress.done}/{batchProgress.total}...</span>
            ) : (
              'Generate all chapters'
            )}
          </Button>
        </div>

        {/* Chapters Options */}
        {book.chapters.filter(ch => {
          const t = htmlToText(ch.content)
          const wc = t.split(/\s+/).filter(w => w.length > 0).length
          return wc > 0 && ch.wordCount > 0
        }).map((chapter) => (
          <div key={chapter.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h4 className="font-medium">{chapter.title}</h4>
                  <p className="text-sm text-muted-foreground">{chapter.wordCount} words</p>
                </div>
              </div>
              {(() => {
                const ca = book.audioGenerations?.find(a => a.contentType === 'CHAPTER' && a.chapterId === chapter.id)
                const isChapterServerProcessing = !!ca && (ca.status === 'PENDING' || ca.status === 'PROCESSING')
                if (generatingChapterIds.has(chapter.id) || isBatchProcessing || isChapterServerProcessing) return null
                return (
                  <Button
                    variant={selectedVoice ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setGeneratingChapterIds(prev => new Set(prev).add(chapter.id))
                      handleGenerateAudio(chapter.content, 'chapter', chapter.title, chapter.id)
                    }}
                    disabled={!selectedVoice}
                  >
                    <>
                      <Volume2 className="h-4 w-4 mr-2" />
                      Generate Audio
                    </>
                  </Button>
                )
              })()}
            </div>
            {(() => {
              const chapterAudio = book.audioGenerations?.find(a => a.contentType === 'CHAPTER' && a.chapterId === chapter.id)
              if (!chapterAudio) return null
              if (chapterAudio.status === 'COMPLETED' && chapterAudio.audioUrl) {
                return (
                  <div className="mt-3">
                    <AudioPlayer audioUrl={chapterAudio.audioUrl} title={chapter.title} voiceName={chapterAudio.voiceName} />
                  </div>
                )
              }
              if ((chapterAudio.status === 'PENDING' || chapterAudio.status === 'PROCESSING') || generatingChapterIds.has(chapter.id) || isBatchProcessing) {
                return (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Processing chapter audio...</span>
                    </div>
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
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">{chapterAudio.errorMessage}</p>
                    )}
                  </div>
                )
              }
              return null
            })()}
          </div>
        ))}

        {(() => {
          const hasChapterContent = book.chapters.some(ch => {
            const t = htmlToText(ch.content)
            const wc = t.split(/\s+/).filter(w => w.length > 0).length
            return wc > 0 && ch.wordCount > 0
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
        onLoadingChange={setIsVoiceModalLoading}
      />
    </div>
  )
}
