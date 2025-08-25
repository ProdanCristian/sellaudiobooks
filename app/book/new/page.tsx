"use client"

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, BookOpen, Send, ArrowRight, RefreshCw } from 'lucide-react'
import { TextLoop } from '@/components/motion-primitives/text-loop'
import { TextShimmer } from '@/components/motion-primitives/text-shimmer'
import BookCover from '@/components/book/book-cover'

type FlowState = 'prompt' | 'titles' | 'edit' | 'details' | 'cover' | 'complete'

interface BookData {
  title: string
  genre: string
  targetAudience: string
}

const genres = {
  Fiction: [
    'Romance',
    'Mystery & Thriller',
    'Fantasy',
    'Science Fiction',
    'Historical Fiction',
    'Literary Fiction',
    'Horror',
    'Adventure',
    'Western',
    'Young Adult Fiction',
    'Children\'s Fiction'
  ],
  'Non-Fiction': [
    'Biography',
    'Self-Help',
    'Business',
    'Health & Wellness',
    'Technology',
    'History',
    'Science',
    'Philosophy',
    'Travel',
    'Cooking',
    'Politics',
    'Religion',
    'Education',
    'Memoir',
    'True Crime'
  ]
}


const audiences = [
  'General Adult',
  'Young Adult (13-18)',
  'Children (8-12)',
  'Professionals',
  'Students',
  'Entrepreneurs',
  'Parents',
  'Seniors',
  'Beginners',
  'Advanced',
  'Other'
]

const promptPlaceholders = [
  "Tell us what your book is about...",
  "Describe your book idea...",
  "Share your story concept...",
  "Let AI find the perfect title...",
  "What genre interests you?",
  "Describe your target audience...",
  "What's your book's main theme?"
]

export default function NewBookPage() {
  const { status } = useSession()
  const router = useRouter()
  const [flowState, setFlowState] = useState<FlowState>('prompt')
  const [isLoading, setIsLoading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  // Form data
  const [prompt, setPrompt] = useState('')
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([])
  const [editableTitle, setEditableTitle] = useState('')
  const [bookData, setBookData] = useState<BookData>({
    title: '',
    genre: '',
    targetAudience: ''
  })
  const [generatedCover, setGeneratedCover] = useState<string>('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const generateTitles = async (prompt: string) => {
    try {
      const response = await fetch('/api/generation/titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const data = await response.json()
      return data.titles || []
    } catch (error) {
      console.error('Error generating titles:', error)
      return []
    }
  }

  const generateBookCover = async (title: string) => {
    try {
      const response = await fetch('/api/generation/cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          bookId: `temp-${Date.now()}` // Temporary ID for new book covers
        })
      })
      const data = await response.json()
      return data.imageUrl || data.fallbackUrl || '/cover.png'
    } catch (error) {
      console.error('Error generating cover:', error)
      return '/cover.png'
    }
  }

  const createBook = async () => {
    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bookData.title,
          genre: bookData.genre,
          targetAudience: bookData.targetAudience,
          coverImage: generatedCover
        })
      })

      if (response.ok) {
        const book = await response.json()
        router.push(`/book/${book.id}`)
      } else {
        throw new Error('Failed to create book')
      }
    } catch (error) {
      console.error('Error creating book:', error)
      alert('Failed to create book')
    }
  }

  // Handle different flow states
  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isLoading) return

    setIsLoading(true)
    try {
      const titles = await generateTitles(prompt.trim())
      setGeneratedTitles(titles)
      setFlowState('titles')
    } catch (error) {
      console.error('Error submitting prompt:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTitleSelect = (title: string) => {
    setEditableTitle(title)
    setFlowState('edit')
  }

  const handleEditConfirm = () => {
    setBookData({ ...bookData, title: editableTitle })
    setFlowState('details')
  }

  const handleDetailsSubmit = async () => {
    if (!bookData.genre || !bookData.targetAudience) return

    setFlowState('cover')
    setIsLoading(true)

    try {
      const coverUrl = await generateBookCover(bookData.title)
      setGeneratedCover(coverUrl)
    } catch (error) {
      console.error('Error generating cover:', error)
      setGeneratedCover('/cover.png')
    } finally {
      setIsLoading(false)
      setFlowState('complete')
    }
  }

  const handleImageLoad = () => {
    setFlowState('complete')
  }

  const handleRegenerateTitles = async () => {
    setIsRegenerating(true)
    try {
      const newTitles = await generateTitles(prompt.trim())
      setGeneratedTitles(newTitles)
    } catch (error) {
      console.error('Error regenerating titles:', error)
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const syntheticEvent = {
        preventDefault: () => { },
        target: e.target,
        currentTarget: e.currentTarget
      } as React.FormEvent
      handlePromptSubmit(syntheticEvent)
    }
  }

  const actualLoading = isLoading

  // Complete state - show final book with cover (same as ai-prompt)
  if (flowState === 'complete') {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-20 sm:pt-24 flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">{bookData.title}</h2>
            </div>

            {generatedCover && (
              <div className="flex justify-center">
                <BookCover
                  imageSrc={generatedCover}
                  alt={bookData.title}
                  className="max-w-sm"
                />
              </div>
            )}

            <Button
              onClick={createBook}
              size="lg"
              className="px-8 py-3 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Start Writing Your Book
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </main>
      </div>
    )
  }

  // Cover generation state (exactly like ai-prompt)
  if (flowState === 'cover') {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-20 sm:pt-24 flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">{bookData.title}</h2>
              <p className="text-xl text-muted-foreground">Creating a beautiful cover for your book</p>
            </div>

            <div className="flex justify-center">
              <BookCover
                imageSrc={generatedCover || '/cover.png'}
                alt={bookData.title}
                className="max-w-sm"
                isLoading={!generatedCover}
                onLoad={handleImageLoad}
              />
            </div>
            <TextShimmer className="text-base text-muted-foreground/70">
              Generating Cover...
            </TextShimmer>
          </div>
        </main>
      </div>
    )
  }

  // Details form state (only genre and target audience)
  if (flowState === 'details') {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-20 sm:pt-24 flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold">Tell us about &quot;{bookData.title}&quot;</h2>
              <p className="text-muted-foreground">Select the genre and target audience for your book</p>
            </div>

            <div className="space-y-10">
              {/* Genre Selection */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-center">Choose Genre</h3>
                <div className="space-y-6">
                  {Object.entries(genres).map(([category, subGenres]) => (
                    <div key={category} className="space-y-3">
                      <h4 className="text-base font-medium text-muted-foreground text-center">{category}</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {subGenres.map((genre) => (
                          <Button
                            key={genre}
                            onClick={() => setBookData({ ...bookData, genre })}
                            variant={bookData.genre === genre ? "default" : "outline"}
                            className={`h-auto py-3 px-4 text-sm font-medium transition-all duration-200 ${bookData.genre === genre
                              ? "bg-primary text-primary-foreground shadow-lg scale-105"
                              : "hover:bg-primary/5 hover:border-primary/50"
                              }`}
                          >
                            {genre}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target Audience Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center">Target Audience</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {audiences.map((audience) => (
                    <Button
                      key={audience}
                      onClick={() => setBookData({ ...bookData, targetAudience: audience })}
                      variant={bookData.targetAudience === audience ? "default" : "outline"}
                      className={`h-auto py-4 px-4 text-sm font-medium transition-all duration-200 ${bookData.targetAudience === audience
                        ? "bg-primary text-primary-foreground shadow-lg scale-105"
                        : "hover:bg-primary/5 hover:border-primary/50"
                        }`}
                    >
                      {audience}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-6 max-w-md mx-auto">
                <Button
                  variant="outline"
                  onClick={() => setFlowState('edit')}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleDetailsSubmit}
                  disabled={!bookData.genre || !bookData.targetAudience}
                  className="flex-1"
                >
                  Generate Cover
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Edit title state
  if (flowState === 'edit') {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-20 sm:pt-24 flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold">Edit Your Title</h2>
              <p className="text-muted-foreground">Make any changes to your book title</p>
            </div>

            <div className="space-y-6">
              <Input
                type="text"
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                className="h-12 sm:h-14 text-center text-base sm:text-lg font-medium px-4"
                placeholder="Enter your book title..."
              />

              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setFlowState('titles')}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Titles
                </Button>
                <Button
                  onClick={handleEditConfirm}
                  disabled={!editableTitle.trim()}
                  className="flex-1"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Title selection state (exactly like ai-prompt)
  if (flowState === 'titles' && generatedTitles.length > 0) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-20 sm:pt-24 flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold">Choose a Book Title</h2>
            </div>

            <div className="space-y-3">
              {generatedTitles.map((title, index) => (
                <Button
                  key={index}
                  onClick={() => handleTitleSelect(title)}
                  variant="outline"
                  className="w-full p-4 h-auto text-left justify-start hover:bg-primary/5 border-1 hover:border-primary/50 transition-all duration-300"
                  disabled={isLoading || isRegenerating}
                >
                  <div className="text-base font-medium break-words whitespace-normal leading-relaxed">{title}</div>
                </Button>
              ))}
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={handleRegenerateTitles}
                variant="ghost"
                disabled={isRegenerating || isLoading}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {isRegenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating new titles...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generate different titles
                  </>
                )}
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Prompt input state (exactly like ai-prompt)
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20 sm:pt-24 flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <BookOpen className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-3xl font-bold">Create New Book</h1>
            <p className="text-muted-foreground">Start your AI-powered authoring journey</p>
          </div>

          <form onSubmit={handlePromptSubmit}>
            <div className="relative">
              <Input
                type="text"
                value={actualLoading ? "" : prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-12 sm:h-14 md:h-16 pl-6 pr-20 sm:pr-24 rounded-full border focus:border-primary transition-all duration-300 md:text-base"
                placeholder=""
                disabled={actualLoading}
              />
              {actualLoading ? (
                <div className="pointer-events-none absolute inset-y-0 left-6 flex items-center pr-16 sm:pr-20 md:pr-24 max-w-[75%] sm:max-w-[80%] md:max-w-[85%] overflow-hidden">
                  <TextShimmer className="text-base text-muted-foreground/70">
                    Generating titles...
                  </TextShimmer>
                </div>
              ) : prompt.length === 0 ? (
                <div className="pointer-events-none absolute inset-y-0 left-6 flex items-center pr-16 sm:pr-20 md:pr-24 max-w-[75%] sm:max-w-[80%] md:max-w-[85%] overflow-hidden">
                  <TextLoop className="text-muted-foreground/70 text-center" interval={2.5} transition={{ duration: 0.35 }}>
                    {promptPlaceholders.map((text) => (
                      <span key={text} className="truncate">{text}</span>
                    ))}
                  </TextLoop>
                </div>
              ) : null}
              <div className="absolute top-1/2 right-2 sm:right-3 -translate-y-1/2 flex gap-1">
                <Button
                  type="submit"
                  size="sm"
                  variant={prompt.trim() ? "default" : "ghost"}
                  className="rounded-full w-8 h-8 sm:w-9 sm:h-9"
                  disabled={!prompt.trim() || actualLoading}
                >
                  <Send className="shrink-0 w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}