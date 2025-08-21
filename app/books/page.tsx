"use client"

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Header from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Book, FileText, Calendar, Edit, RefreshCw, X, Check, Sparkles } from 'lucide-react'
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
  const [regeneratingCover, setRegeneratingCover] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [titleEditMode, setTitleEditMode] = useState<'edit' | 'generate' | null>(null)
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([])
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false)
  const [editingCover, setEditingCover] = useState<string | null>(null)
  const [customCoverPrompt, setCustomCoverPrompt] = useState('')

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

  // Copy all the handler functions from UserBooks component
  const handleEditTitle = (e: React.MouseEvent, book: BookData) => {
    e.stopPropagation()
    setEditingTitle(book.id)
    setNewTitle(book.title)
    setTitleEditMode('edit')
  }

  const generateTitles = async (currentTitle: string) => {
    try {
      const response = await fetch('/api/generate-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Generate alternative titles for a book currently titled "${currentTitle}"` })
      })
      const data = await response.json()
      return data.titles || []
    } catch (error) {
      console.error('Error generating titles:', error)
      return []
    }
  }

  const handleGenerateTitles = async () => {
    setIsGeneratingTitles(true)
    setTitleEditMode('generate')
    try {
      const titles = await generateTitles(newTitle)
      setGeneratedTitles(titles)
    } catch (error) {
      console.error('Error generating titles:', error)
    } finally {
      setIsGeneratingTitles(false)
    }
  }

  const handleSelectGeneratedTitle = (title: string) => {
    setNewTitle(title)
    setTitleEditMode('edit')
    setGeneratedTitles([])
  }

  const handleSaveTitle = async (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation()
    if (!newTitle.trim()) return

    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() })
      })

      if (response.ok) {
        setBooks(books.map(b => 
          b.id === bookId ? { ...b, title: newTitle.trim() } : b
        ))
        setEditingTitle(null)
        setNewTitle('')
        setTitleEditMode(null)
        setGeneratedTitles([])
      }
    } catch (error) {
      console.error('Error updating title:', error)
    }
  }

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingTitle(null)
    setNewTitle('')
    setTitleEditMode(null)
    setGeneratedTitles([])
  }

  const handleRegenerateCover = (e: React.MouseEvent, book: BookData) => {
    e.stopPropagation()
    setEditingCover(book.id)
    setCustomCoverPrompt('')
  }

  const handleCoverGeneration = async (book: BookData, customPrompt?: string) => {
    setRegeneratingCover(book.id)
    setEditingCover(null)
    
    try {
      const response = await fetch('/api/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: book.title,
          customPrompt: customPrompt?.trim() || ''
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
        setBooks(books.map(b => 
          b.id === book.id ? { ...b, coverImage: newCoverUrl } : b
        ))
      } else {
        throw new Error(updateData.error || 'Failed to update book cover')
      }
    } catch (error) {
      console.error('Error regenerating cover:', error)
      alert('Failed to regenerate cover. Please try again.')
    } finally {
      setRegeneratingCover(null)
    }
  }

  const handleCancelCoverEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingCover(null)
    setCustomCoverPrompt('')
  }

  const handleBookClick = (e: React.MouseEvent, book: BookData) => {
    e.preventDefault()
    
    const hasCompleteMetadata = book.genre && book.targetAudience
    
    if (hasCompleteMetadata) {
      router.push(`/books/${book.id}`)
    } else {
      router.push(`/books/${book.id}/setup`)
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
                <Link href="/books/new">
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
              <Link href="/books/new">
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
                <Link href="/books/new">
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
                            {regeneratingCover === book.id ? (
                              <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 animate-pulse">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                              </div>
                            ) : (
                              <Image
                                src={book.coverImage || '/cover.png'}
                                alt={book.title}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            )}
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      </div>
                      
                      {/* Hover Action Buttons */}
                      <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-10">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1 h-8 text-xs backdrop-blur-sm bg-white/90 hover:bg-white text-black border-0"
                            onClick={(e) => handleEditTitle(e, book)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit Title
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1 h-8 text-xs backdrop-blur-sm bg-white/90 hover:bg-white text-black border-0"
                            onClick={(e) => handleRegenerateCover(e, book)}
                            disabled={regeneratingCover === book.id}
                          >
                            {regeneratingCover === book.id ? (
                              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3 mr-1" />
                            )}
                            Cover
                          </Button>
                        </div>
                      </div>

                      {/* Status Badge on Cover - No Hover Effects */}
                      <div className="absolute top-3 right-3">
                        <div className={`text-xs px-2 py-1 rounded-full font-medium backdrop-blur-sm ${statusConfig[book.status as keyof typeof statusConfig]?.color || statusConfig.DRAFT.color} pointer-events-none`}>
                          {statusConfig[book.status as keyof typeof statusConfig]?.label || 'Draft'}
                        </div>
                      </div>
                    </div>

                    {/* Book Info - Clean and Minimal */}
                    <div className="text-center space-y-2">
                      {editingTitle === book.id ? (
                        <div className="px-2 space-y-2">
                          {titleEditMode === 'generate' && generatedTitles.length > 0 ? (
                            // Generated titles selection
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground">Choose a new title:</p>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {generatedTitles.map((title, index) => (
                                  <Button
                                    key={index}
                                    onClick={() => handleSelectGeneratedTitle(title)}
                                    variant="outline"
                                    className="w-full h-auto p-2 text-xs text-left justify-start hover:bg-primary/5"
                                  >
                                    {title}
                                  </Button>
                                ))}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setTitleEditMode('edit')}
                                className="w-full h-6 text-xs"
                              >
                                Back to Edit
                              </Button>
                            </div>
                          ) : (
                            // Manual edit mode
                            <>
                              <Input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className="h-8 text-center text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleSaveTitle(e as unknown as React.MouseEvent, book.id)
                                  }
                                  if (e.key === 'Escape') {
                                    e.preventDefault()
                                    handleCancelEdit(e as unknown as React.MouseEvent)
                                  }
                                }}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex gap-1 justify-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs"
                                  onClick={handleGenerateTitles}
                                  disabled={isGeneratingTitles}
                                >
                                  {isGeneratingTitles ? (
                                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-3 w-3 mr-1" />
                                  )}
                                  AI
                                </Button>
                                <Button
                                  size="sm" 
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => handleSaveTitle(e, book.id)}
                                >
                                  <Check className="h-3 w-3 text-green-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost" 
                                  className="h-6 w-6 p-0"
                                  onClick={handleCancelEdit}
                                >
                                  <X className="h-3 w-3 text-red-600" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer"
                          onClick={(e) => handleBookClick(e, book)}
                        >
                          <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors px-2">
                            {book.title}
                          </h3>
                        </div>
                      )}

                      {/* Cover Editing Interface */}
                      {editingCover === book.id && (
                        <div className="px-2 space-y-2 mt-3">
                          <Input
                            value={customCoverPrompt}
                            onChange={(e) => setCustomCoverPrompt(e.target.value)}
                            className="h-8 text-center text-sm"
                            placeholder="Add style details (optional)..."
                            maxLength={150}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleCoverGeneration(book, customCoverPrompt)
                              }
                              if (e.key === 'Escape') {
                                e.preventDefault()
                                handleCancelCoverEdit(e as unknown as React.MouseEvent)
                              }
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => handleCoverGeneration(book, customCoverPrompt)}
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