"use client"

import { useSession } from 'next-auth/react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useEffect, useState, } from 'react'
import Header from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, } from 'lucide-react'



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


export default function BookSetupPage() {
  const { status } = useSession()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const bookId = params.id as string
  const bookTitle = searchParams.get('title') || 'your book'

  const [isSaving, setIsSaving] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState('')
  const [selectedAudience, setSelectedAudience] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const handleDetailsSubmit = async () => {
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
        router.push(`/book/${bookId}`)
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


  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20 pb-20 sm:pt-24 flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold">
              Tell us about &quot;{bookTitle}&quot;
            </h2>
            <p className="text-muted-foreground">Select the genre and target audience for your book.</p>
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
                          onClick={() => setSelectedGenre(genre)}
                          variant={selectedGenre === genre ? "default" : "outline"}
                          className={`h-auto py-3 px-4 text-sm font-medium transition-all duration-200 ${selectedGenre === genre
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
                    onClick={() => setSelectedAudience(audience)}
                    variant={selectedAudience === audience ? "default" : "outline"}
                    className={`h-auto py-4 px-4 text-sm font-medium transition-all duration-200 ${selectedAudience === audience
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
                onClick={handleDetailsSubmit}
                disabled={!selectedGenre || !selectedAudience || isSaving}
                className="flex-1"
              >
                Continue to Book
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}