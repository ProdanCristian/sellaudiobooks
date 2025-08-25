"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyedMutator } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RefreshCw,
  Save,
  Check,
  Trash2,
  Copy,
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

interface BookForm {
  title: string
  customInstructions: string
  genre: string
  targetAudience: string
}

interface SettingsTabProps {
  book: Book
  bookId: string
  bookForm: BookForm
  setBookForm: (updater: (prev: BookForm) => BookForm) => void
  showDeleteConfirm: boolean
  setShowDeleteConfirm: (show: boolean) => void
  deleteConfirmText: string
  setDeleteConfirmText: (text: string) => void
  mutate: KeyedMutator<Book>
}

export default function SettingsTab({
  book,
  bookId,
  bookForm,
  setBookForm,
  showDeleteConfirm,
  setShowDeleteConfirm,
  deleteConfirmText,
  setDeleteConfirmText,
  mutate
}: SettingsTabProps) {
  const router = useRouter()
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [titleCopied, setTitleCopied] = useState(false)

  // Settings functions
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
  return (
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
              <SelectTrigger id="settings-genre" className="mt-2">
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
              <SelectTrigger id="settings-audience" className="mt-2">
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
                setBookForm((prev) => ({
                  ...prev,
                  title: book.title || '',
                  customInstructions: book.customInstructions || '',
                  genre: book.genre || '',
                  targetAudience: book.targetAudience || ''
                }))
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
  )
}