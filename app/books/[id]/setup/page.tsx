"use client"

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/header'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react'

interface BookData {
  id: string
  title: string
  genre?: string
  targetAudience?: string
}

const genres = [
  'Fiction',
  'Non-Fiction', 
  'Biography',
  'Self-Help',
  'Business',
  'Health & Wellness',
  'Technology',
  'History',
  'Science',
  'Philosophy',
  'Romance',
  'Mystery & Thriller',
  'Fantasy',
  'Science Fiction',
  'Children\'s',
  'Young Adult',
  'Other'
]

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

export default function BookSetupPage() {
  const { status } = useSession()
  const router = useRouter()
  const params = useParams()
  const bookId = params.id as string

  const [book, setBook] = useState<BookData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState('')
  const [selectedAudience, setSelectedAudience] = useState('')

  const fetchBook = useCallback(async () => {
    try {
      const response = await fetch(`/api/books/${bookId}`)
      if (response.ok) {
        const bookData = await response.json()
        setBook(bookData)
        setSelectedGenre(bookData.genre || '')
        setSelectedAudience(bookData.targetAudience || '')
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error fetching book:', error)
      router.push('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [bookId, router])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    } else if (status === 'authenticated' && bookId) {
      fetchBook()
    }
  }, [status, bookId, router, fetchBook])

  const handleSave = async () => {
    if (!selectedGenre || !selectedAudience) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          genre: selectedGenre,
          targetAudience: selectedAudience
        })
      })

      if (response.ok) {
        // Redirect to writing page
        router.push(`/books/${bookId}`)
      } else {
        throw new Error('Failed to save book details')
      }
    } catch (error) {
      console.error('Error saving book:', error)
      alert('Failed to save book details. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center h-64">
          <p>Book not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20 sm:pt-24 flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <BookOpen className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-2xl font-bold">Complete Book Setup</h2>
            <p className="text-muted-foreground">
              Before you start writing &quot;{book.title}&quot;, please select the genre and target audience
            </p>
          </div>

          <div className="space-y-10">
            {/* Genre Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center">Choose Genre</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {genres.map((genre) => (
                  <Button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    variant={selectedGenre === genre ? "default" : "outline"}
                    className={`h-auto py-3 px-4 text-sm font-medium transition-all duration-200 ${
                      selectedGenre === genre 
                        ? "bg-primary text-primary-foreground shadow-lg scale-105" 
                        : "hover:bg-primary/5 hover:border-primary/50"
                    }`}
                  >
                    {genre}
                  </Button>
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
                    onClick={() => setSelectedAudience(audience)}
                    variant={selectedAudience === audience ? "default" : "outline"}
                    className={`h-auto py-4 px-4 text-sm font-medium transition-all duration-200 ${
                      selectedAudience === audience 
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
                onClick={() => router.push('/dashboard')}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <Button
                onClick={handleSave}
                disabled={!selectedGenre || !selectedAudience || isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    Start Writing
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}