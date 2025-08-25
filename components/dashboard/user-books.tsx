"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Book, FileText, Calendar } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface BookData {
  id: string
  title: string
  customInstructions?: string
  coverImage?: string
  status: string
  createdAt: string
  updatedAt: string
  genre?: string
  targetAudience?: string
  _count: {
    chapters: number
  }
}

export default function UserBooks() {
  const router = useRouter()
  const [books, setBooks] = useState<BookData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchBooks()
  }, [])

  const fetchBooks = async () => {
    try {
      const response = await fetch('/api/books')
      if (response.ok) {
        const data = await response.json()
        setBooks(data)
      }
    } catch (error) {
      console.error('Error fetching books:', error)
    } finally {
      setIsLoading(false)
    }
  }


  const handleBookClick = (e: React.MouseEvent, book: BookData) => {
    e.preventDefault()

    // Check if book has complete metadata
    const hasCompleteMetadata = book.genre && book.targetAudience

    if (hasCompleteMetadata) {
      // Book is ready for writing
      router.push(`/book/${book.id}`)
    } else {
      // Need to complete book setup first - pass title as query param
      const encodedTitle = encodeURIComponent(book.title)
      router.push(`/book/${book.id}/setup?title=${encodedTitle}`)
    }
  }

  const BookSkeleton = () => (
    <div className="group cursor-pointer">
      <div className="space-y-3">
        {/* Cover skeleton - fully visible */}
        <div className="relative mx-auto w-full max-w-[250px]">
          <Skeleton className="aspect-[3/4] w-full rounded-2xl shadow-lg bg-muted/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-2xl" />
        </div>

        {/* Title skeleton */}
        <div className="text-center space-y-2">
          <Skeleton className="h-5 w-3/4 mx-auto bg-muted/20" />
          <div className="flex items-center justify-center gap-2">
            <Skeleton className="h-4 w-16 rounded-full bg-muted/20" />
            <Skeleton className="h-4 w-12 bg-muted/20" />
          </div>
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Latest Books</h2>
            <p className="text-muted-foreground">Manage and continue your audiobook projects</p>
          </div>
          <Button asChild size="sm" className="rounded-full">
            <Link href="/book/new">
              <Plus className="h-4 w-4 mr-2" />
              New Book
            </Link>
          </Button>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <BookSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  const statusConfig = {
    DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
    IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    PUBLISHED: { label: 'Published', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Latest Books</h2>
          <div className="flex items-center gap-3">
            <p className="text-muted-foreground">Manage and continue your audiobook projects</p>
            {books.length > 0 && (
              <Link href="/books" className="inline-flex items-center gap-1 px-2 py-1 text-sm text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-md transition-all duration-200">
                <span>See All My Books ({books.length})</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
        </div>
        {books.length > 0 && (
          <Button asChild size="sm" className="rounded-full">
            <Link href="/book/new">
              <Plus className="h-4 w-4 mr-2" />
              New Book
            </Link>
          </Button>
        )}
      </div>

      {books.length === 0 ? (
        <div className="text-center py-16 px-8">
          <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-2xl font-semibold mb-4">No books yet</h3>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg">
            Start creating your first audiobook and bring your stories to life with AI-powered narration.
          </p>
          <Button asChild size="lg" className="rounded-full px-8">
            <Link href="/book/new">
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Book
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {books.slice(0, 5).map((book) => (
              <div key={book.id} className="group cursor-pointer">
                <div className="space-y-3">
                  {/* Book Cover - Fully Visible and Prominent */}
                  <div className="relative mx-auto w-full max-w-[250px]">
                    <div
                      className="block cursor-pointer"
                      onClick={(e) => handleBookClick(e, book)}
                    >
                      <div className="border relative overflow-hidden rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                        <div className="aspect-[3/4] w-full relative">
                          <Image
                            src={book.coverImage || '/cover.png'}
                            alt={book.title}
                            width={250}
                            height={333}
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    </div>

                    {/* Status Badge on Cover - Always Visible, No Hover Effects */}
                    <div className="absolute top-3 right-3">
                      <div className={`text-xs px-2 py-1 rounded-full font-medium ${statusConfig[book.status as keyof typeof statusConfig]?.color || statusConfig.DRAFT.color} pointer-events-none`}>
                        {statusConfig[book.status as keyof typeof statusConfig]?.label || 'Draft'}
                      </div>
                    </div>
                  </div>

                  {/* Book Info - Clean and Minimal */}
                  <div className="text-center space-y-2">
                    <div
                      className="cursor-pointer"
                      onClick={(e) => handleBookClick(e, book)}
                    >
                      <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors px-2">
                        {book.title}
                      </h3>
                    </div>

                    {/* Meta Info - Compact */}
                    <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center">
                        <FileText className="h-3 w-3 mr-1" />
                        <span>{book._count.chapters} chapters</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>{formatDate(book.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </>
      )}
    </div>
  )
}