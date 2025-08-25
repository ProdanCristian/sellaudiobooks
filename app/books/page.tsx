"use client"

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Plus, Book, FileText, Calendar } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import Image from 'next/image'
import Link from 'next/link'

interface BookData {
  id: string
  title: string
  customInstructions?: string
  coverImage?: string
  genre?: string
  targetAudience?: string
  status: string
  createdAt: string
  updatedAt: string
  _count: {
    chapters: number
  }
}


export default function BooksPage() {
  const { status } = useSession()
  const router = useRouter()
  const [books, setBooks] = useState<BookData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
      return
    }

    if (status === 'authenticated') {
      fetchBooks()
    }
  }, [status, router])

  const fetchBooks = async () => {
    try {
      const response = await fetch('/api/books')
      if (response.ok) {
        const data = await response.json()
        setBooks(data)
      }
    } catch (error) {
      console.error('Failed to fetch books:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBookClick = (e: React.MouseEvent, book: BookData) => {
    e.preventDefault()

    const hasCompleteMetadata = book.genre && book.targetAudience

    if (hasCompleteMetadata) {
      router.push(`/book/${book.id}`)
    } else {
      router.push(`/book/${book.id}/setup`)
    }
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

  const BookSkeleton = () => (
    <div className="group cursor-pointer">
      <div className="space-y-3">
        <div className="relative mx-auto w-full max-w-[250px]">
          <Skeleton className="aspect-[3/4] w-full rounded-2xl shadow-lg bg-muted/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-2xl" />
        </div>
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

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-20 sm:pt-24 container mx-auto px-2">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">My Books</h2>
                <p className="text-muted-foreground">Manage and continue your audiobook projects</p>
              </div>
              <Button asChild size="sm" className="rounded-full">
                <Link href="/book/new">
                  <Plus className="h-4 w-4 mr-2" />
                  New Book
                </Link>
              </Button>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <BookSkeleton key={i} />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20 sm:pt-24 container mx-auto px-2">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">My Books</h2>
              <p className="text-muted-foreground">Manage and continue your audiobook projects</p>
            </div>
            <Button asChild size="sm" className="rounded-full">
              <Link href="/book/new">
                <Plus className="h-4 w-4 mr-2" />
                New Book
              </Link>
            </Button>
          </div>

          {books.length === 0 ? (
            <div className="text-center py-16 px-8">
              <div className="mx-auto w-24 h-32 rounded-2xl bg-muted/30 flex items-center justify-center mb-8 shadow-lg">
                <Book className="h-12 w-12 text-muted-foreground" />
              </div>
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
            <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {books.map((book) => (
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
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      </div>

                      {/* Status Badge on Cover */}
                      <div className="absolute top-3 right-3">
                        <div className={`text-xs px-2 py-1 rounded-full font-medium backdrop-blur-sm ${statusConfig[book.status as keyof typeof statusConfig]?.color || statusConfig.DRAFT.color} pointer-events-none`}>
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
          )}
        </div>
      </main>
    </div>
  )
}