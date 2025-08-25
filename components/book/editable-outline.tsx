'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { TextShimmer } from '@/components/motion-primitives/text-shimmer'
import {
  Lightbulb,
  X,
  Check,
  Plus,
  Save,
  Trash2,
  Sparkles,
  Wand2,
  ChevronUp,
  ChevronDown
} from "lucide-react"

interface EditableOutlineProps {
  outline: any
  book: any
  mutate: any
  onOutlineUpdated: () => void
}

export function EditableOutline({ outline, book, mutate, onOutlineUpdated }: EditableOutlineProps) {
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null)
  const [editingTipIndex, setEditingTipIndex] = useState<number | null>(null)
  const [tempTipText, setTempTipText] = useState('')
  const [chapterForm, setChapterForm] = useState<any>(null)
  const [isGeneratingTip, setIsGeneratingTip] = useState(false)
  const [generatingChapterIndex, setGeneratingChapterIndex] = useState<number | null>(null)
  const editingChapterRef = useRef<HTMLDivElement>(null)

  // Close edit mode when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingChapterRef.current && !editingChapterRef.current.contains(event.target as Node)) {
        if (editingChapterId) {
          cancelChapterEdit()
        }
      }
    }

    if (editingChapterId) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [editingChapterId])

  // Handle chapter card click to enter edit mode
  const handleChapterClick = (chapter: any) => {
    setEditingChapterId(chapter.id)
    setChapterForm({
      id: chapter.id,
      title: chapter.title,
      customTitle: extractCustomTitle(chapter.title),
      description: chapter.description,
      keyPoints: [...chapter.keyPoints]
    })
  }

  // Handle chapter form updates
  const updateChapterField = (field: string, value: any) => {
    setChapterForm((prev: any) => ({
      ...prev,
      [field]: value
    }))
  }

  // Save chapter changes and sync with actual chapters
  const saveChapterChanges = async () => {
    if (!chapterForm) return

    try {
      const chapterIndex = outline.chapters.findIndex((ch: any) => ch.id === chapterForm.id)
      const newTitle = generateFullChapterTitle(
        chapterIndex,
        outline.chapters.length,
        chapterForm.customTitle || extractCustomTitle(chapterForm.title)
      )

      // Update the outline chapter
      const response = await fetch(`/api/books/${book.id}/outline`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapterId: chapterForm.id,
          title: newTitle,
          description: chapterForm.description.trim(),
          keyPoints: chapterForm.keyPoints.filter((point: string) => point.trim())
        }),
      })

      if (response.ok) {
        // Also update the corresponding actual chapter if it exists
        await syncChapterWithOutline(chapterIndex, {
          title: newTitle,
          description: chapterForm.description.trim(),
          keyPoints: chapterForm.keyPoints.filter((point: string) => point.trim())
        })

        setEditingChapterId(null)
        setChapterForm(null)
        onOutlineUpdated()
      }
    } catch (error) {
      console.error('Error saving chapter:', error)
    }
  }


  // Sync actual chapter with outline chapter
  const syncChapterWithOutline = async (chapterIndex: number, outlineChapter: any) => {
    try {
      // Get current chapters from book data
      const actualChapters = book.chapters || []
      
      // Find the actual chapter that corresponds to this outline position
      const actualChapter = actualChapters.find(ch => ch.order === chapterIndex + 1)
      
      if (actualChapter) {
        // Update existing chapter
        const updatedContent = generateInitialChapterContent(outlineChapter)
        
        await fetch(`/api/books/${book.id}/chapters/${actualChapter.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: outlineChapter.title,
            content: actualChapter.content || updatedContent, // Keep existing content if it exists
            order: chapterIndex + 1
          }),
        }).catch(error => {
          console.error('Error updating actual chapter:', error)
        })
      } else {
        // Create new chapter if it doesn't exist
        const initialContent = generateInitialChapterContent(outlineChapter)
        
        await fetch(`/api/books/${book.id}/chapters`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: outlineChapter.title,
            content: initialContent,
            order: chapterIndex + 1
          }),
        }).catch(error => {
          console.error('Error creating actual chapter:', error)
        })
      }
    } catch (error) {
      console.error('Error syncing chapter with outline:', error)
    }
  }

  // SMART SYNC: Preserve content but ensure perfect order/title sync
  const syncAllChaptersWithOutline = async () => {
    try {
      console.log('🔄 Starting SMART chapter sync - preserving content!')
      const actualChapters = book.chapters || []
      console.log('Current chapters:', actualChapters.map((ch: any) => ({ id: ch.id, title: ch.title, order: ch.order })))
      console.log('Target outline:', outline.chapters.map((ch: any, i: number) => ({ title: ch.title, targetOrder: i + 1 })))
      
      // Get fresh chapter data from server
      const freshResponse = await fetch(`/api/books/${book.id}/chapters`)
      const freshChapters = freshResponse.ok ? await freshResponse.json() : actualChapters
      const sortedChapters = [...freshChapters].sort((a, b) => a.order - b.order)
      
      // Plan the updates
      const totalNeeded = outline.chapters.length
      const totalCurrent = sortedChapters.length
      
      console.log(`📊 Need ${totalNeeded} chapters, currently have ${totalCurrent}`)
      
      // Step 1: Update existing chapters (preserve their content)
      const updatePromises = []
      for (let i = 0; i < Math.min(totalNeeded, totalCurrent); i++) {
        const outlineChapter = outline.chapters[i]
        const actualChapter = sortedChapters[i]
        const newOrder = i + 1
        
        console.log(`📝 Updating chapter ${actualChapter.id}: order ${actualChapter.order} -> ${newOrder}, title "${actualChapter.title}" -> "${outlineChapter.title}"`)
        
        updatePromises.push(
          fetch(`/api/books/${book.id}/chapters/${actualChapter.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: outlineChapter.title,
              order: newOrder
              // Keep existing content - don't overwrite user's work
            }),
          }).then(r => r.ok ? console.log(`✅ Updated ${actualChapter.id}`) : console.error(`❌ Failed ${actualChapter.id}`))
        )
      }
      
      // Step 2: Create new chapters if outline has more
      if (totalNeeded > totalCurrent) {
        console.log(`➕ Creating ${totalNeeded - totalCurrent} new chapters`)
        for (let i = totalCurrent; i < totalNeeded; i++) {
          const outlineChapter = outline.chapters[i]
          const order = i + 1
          const content = generateInitialChapterContent(outlineChapter)
          
          console.log(`Creating new chapter ${order}: "${outlineChapter.title}"`)
          
          updatePromises.push(
            fetch(`/api/books/${book.id}/chapters`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: outlineChapter.title,
                content: content,
                order: order
              }),
            }).then(r => r.ok ? console.log(`✅ Created chapter ${order}`) : console.error(`❌ Failed creating ${order}`))
          )
        }
      }
      
      // Step 3: Delete extra chapters if outline has fewer
      if (totalCurrent > totalNeeded) {
        console.log(`🗑️ Deleting ${totalCurrent - totalNeeded} extra chapters`)
        for (let i = totalNeeded; i < totalCurrent; i++) {
          const chapterToDelete = sortedChapters[i]
          console.log(`Deleting extra chapter ${chapterToDelete.id}`)
          
          updatePromises.push(
            fetch(`/api/books/${book.id}/chapters/${chapterToDelete.id}`, {
              method: 'DELETE'
            }).then(r => r.ok ? console.log(`✅ Deleted ${chapterToDelete.id}`) : console.error(`❌ Failed deleting ${chapterToDelete.id}`))
          )
        }
      }
      
      // Execute all operations
      await Promise.all(updatePromises)
      console.log('✨ SMART sync completed - perfect order with preserved content!')
    } catch (error) {
      console.error('💥 Error in smart sync:', error)
    }
  }

  // Helper function to generate initial chapter content based on outline
  const generateInitialChapterContent = (outlineChapter: any): string => {
    const keyPointsList = outlineChapter.keyPoints
      ?.map((point: string) => `<li>${point}</li>`)
      .join('') || ''

    return `<p><strong>Chapter Overview:</strong> ${outlineChapter.description || 'This chapter needs content.'}</p>

<h2>Key Topics to Cover:</h2>
<ul>
${keyPointsList}
</ul>

<p><em>This chapter is ready for writing. Click here to start adding your content...</em></p>`
  }

  // Cancel chapter editing
  const cancelChapterEdit = () => {
    setEditingChapterId(null)
    setChapterForm(null)
  }

  // Add new key point
  const addKeyPoint = () => {
    if (!chapterForm) return
    setChapterForm((prev: any) => ({
      ...prev,
      keyPoints: [...prev.keyPoints, 'New key point...']
    }))
  }

  // Remove key point
  const removeKeyPoint = (index: number) => {
    if (!chapterForm) return
    setChapterForm((prev: any) => ({
      ...prev,
      keyPoints: prev.keyPoints.filter((_: string, i: number) => i !== index)
    }))
  }

  // Update key point
  const updateKeyPoint = (index: number, value: string) => {
    if (!chapterForm) return
    setChapterForm((prev: any) => ({
      ...prev,
      keyPoints: prev.keyPoints.map((point: string, i: number) => i === index ? value : point)
    }))
  }

  // Handle tip editing
  const handleTipClick = (index: number, currentTip: string) => {
    setEditingTipIndex(index)
    setTempTipText(currentTip)
  }

  const handleTipSave = async (index: number) => {
    if (!tempTipText.trim()) return

    try {
      const updatedSuggestions = [...outline.suggestions]
      updatedSuggestions[index] = tempTipText.trim()

      const response = await fetch(`/api/books/${book.id}/outline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapters: outline.chapters.map((ch: any, index: number) => ({
            title: ch.title,
            description: ch.description,
            keyPoints: ch.keyPoints,
            order: index + 1
          })),
          suggestions: updatedSuggestions
        }),
      })

      if (response.ok) {
        onOutlineUpdated()
      }
    } catch (error) {
      console.error('Error updating tip:', error)
    }

    setEditingTipIndex(null)
    setTempTipText('')
  }

  const handleTipCancel = () => {
    setEditingTipIndex(null)
    setTempTipText('')
  }


  const handleAddTip = async () => {
    const newSuggestions = [...(outline.suggestions || []), 'New writing tip...']

    // Prepare the updated book data
    const updatedBook = {
      ...book,
      outline: {
        ...outline,
        suggestions: newSuggestions
      }
    }

    // Optimistic update with SWR - this makes the UI update instantly
    mutate(updatedBook, false)

    // Auto-edit the new tip immediately
    setEditingTipIndex(newSuggestions.length - 1)
    setTempTipText('New writing tip...')

    // Save to database in the background
    try {
      const response = await fetch(`/api/books/${book.id}/outline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapters: outline.chapters.map((ch: any, index: number) => ({
            title: ch.title,
            description: ch.description,
            keyPoints: ch.keyPoints,
            order: index + 1
          })),
          suggestions: newSuggestions
        }),
      })

      if (response.ok) {
        // Revalidate to sync with server data
        mutate()
      } else {
        // Revert on error and exit edit mode
        setEditingTipIndex(null)
        setTempTipText('')
        mutate()
      }
    } catch (error) {
      console.error('Error adding tip:', error)
      // Revert on error and exit edit mode
      setEditingTipIndex(null)
      setTempTipText('')
      mutate()
    }
  }

  const handleDeleteTip = async (index: number) => {
    const updatedSuggestions = outline.suggestions.filter((_: string, i: number) => i !== index)

    // Prepare the updated book data
    const updatedBook = {
      ...book,
      outline: {
        ...outline,
        suggestions: updatedSuggestions
      }
    }

    // Optimistic update with SWR - this makes the UI update instantly
    mutate(updatedBook, false)

    // Save to database in the background
    try {
      const response = await fetch(`/api/books/${book.id}/outline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapters: outline.chapters.map((ch: any, index: number) => ({
            title: ch.title,
            description: ch.description,
            keyPoints: ch.keyPoints,
            order: index + 1
          })),
          suggestions: updatedSuggestions
        }),
      })

      if (response.ok) {
        // Revalidate to sync with server data
        mutate()
      } else {
        // Revert on error
        mutate()
      }
    } catch (error) {
      console.error('Error deleting tip:', error)
      // Revert on error
      mutate()
    }
  }

  // Generate dynamic chapter prefix based on position
  const generateChapterPrefix = (position: number, totalChapters: number) => {
    if (position === 0) {
      return 'Introduction:'
    } else if (position === totalChapters - 1) {
      return 'Conclusion:'
    } else {
      return `Chapter ${position}:`
    }
  }

  // Generate full chapter title (prefix + custom title)
  const generateFullChapterTitle = (position: number, totalChapters: number, customTitle: string) => {
    const prefix = generateChapterPrefix(position, totalChapters)
    const title = customTitle || 'New Chapter'
    return `${prefix} ${title}`
  }

  // Extract custom title from full title (remove prefix)
  const extractCustomTitle = (fullTitle: string) => {
    const colonIndex = fullTitle.indexOf(':')
    if (colonIndex === -1) return fullTitle
    return fullTitle.substring(colonIndex + 1).trim()
  }

  // Update all chapter titles to maintain proper sequence
  const updateChapterTitles = (chapters: any[]) => {
    return chapters.map((chapter, index) => {
      const customTitle = extractCustomTitle(chapter.title)
      return {
        ...chapter,
        title: generateFullChapterTitle(index, chapters.length, customTitle)
      }
    })
  }


  const handleCreateAIChapter = async (afterIndex: number) => {
    const newChapterPosition = afterIndex + 1

    // Insert new chapter at the exact position
    const newChapter = {
      title: 'New Chapter', // Will be updated by AI
      description: 'Generating with AI...',
      keyPoints: ['Generating content...']
    }

    const tempChapters = [...outline.chapters]
    tempChapters.splice(newChapterPosition, 0, newChapter)

    // Update titles for all chapters to maintain proper sequence
    const reorderedChapters = updateChapterTitles(tempChapters)

    // Prepare the updated book data
    const updatedBook = {
      ...book,
      outline: {
        ...outline,
        chapters: reorderedChapters
      }
    }

    // Optimistic update with SWR - this makes the UI update instantly
    mutate(updatedBook, false)

    // Save the new structure in the background
    try {
      const response = await fetch(`/api/books/${book.id}/outline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapters: reorderedChapters.map((ch, index) => ({
            ...ch,
            order: index + 1
          })),
          suggestions: outline.suggestions || []
        }),
      })

      if (response.ok) {
        // Sync all chapters with new outline structure
        await syncAllChaptersWithOutline()
        
        // Revalidate to sync with server data
        mutate()
        
        // Then generate AI content for the new chapter at its new position
        setTimeout(() => {
          handleGenerateChapter(newChapterPosition)
        }, 100) // Small delay to ensure outline updates
      } else {
        // Revert on error
        mutate()
      }
    } catch (error) {
      console.error('Error creating AI chapter:', error)
      // Revert on error
      mutate()
    }
  }

  const handleCreateChapter = async (afterIndex: number) => {
    const newChapter = {
      title: 'New Chapter', // Will get proper prefix when updateChapterTitles runs
      description: 'Describe what this chapter will cover...',
      keyPoints: ['Key point 1', 'Key point 2', 'Key point 3']
    }

    const updatedChapters = [...outline.chapters]
    updatedChapters.splice(afterIndex + 1, 0, newChapter)

    // Update titles and order numbers for all chapters
    const reorderedChapters = updateChapterTitles(updatedChapters)

    // Prepare the updated book data
    const updatedBook = {
      ...book,
      outline: {
        ...outline,
        chapters: reorderedChapters
      }
    }

    // Optimistic update with SWR - this makes the UI update instantly
    mutate(updatedBook, false)

    // Save to database in the background
    try {
      const response = await fetch(`/api/books/${book.id}/outline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapters: reorderedChapters.map((ch, index) => ({
            ...ch,
            order: index + 1
          })),
          suggestions: outline.suggestions || []
        }),
      })

      if (response.ok) {
        // Sync all chapters with new outline structure
        await syncAllChaptersWithOutline()
        
        // Revalidate to sync with server data
        mutate()
      } else {
        // Revert on error
        mutate()
      }
    } catch (error) {
      console.error('Error creating chapter:', error)
      // Revert on error
      mutate()
    }
  }

  // Generate chapter with AI
  const handleGenerateChapter = async (chapterIndex: number) => {
    setGeneratingChapterIndex(chapterIndex)
    try {
      const currentChapter = outline.chapters[chapterIndex]
      const totalChapters = outline.chapters.length

      // Determine chapter type and position
      let chapterType = 'middle'
      if (chapterIndex === 0) chapterType = 'introduction'
      else if (chapterIndex === totalChapters - 1) chapterType = 'conclusion'

      const response = await fetch('/api/generation/chapter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: book.title,
          genre: book.genre || '',
          targetAudience: book.targetAudience || '',
          chapterTitle: currentChapter.title,
          chapterType,
          chapterPosition: chapterIndex + 1,
          totalChapters,
          allChapters: outline.chapters.map((ch: any, idx: number) => ({
            title: generateFullChapterTitle(idx, outline.chapters.length, extractCustomTitle(ch.title)),
            description: ch.description,
            isCurrentChapter: idx === chapterIndex
          }))
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate chapter')
      }

      const data = await response.json()

      if (data.chapter) {
        const updatedChapters = [...outline.chapters]
        const currentChapter = updatedChapters[chapterIndex]

        // Enhance the existing chapter instead of replacing it
        updatedChapters[chapterIndex] = {
          ...currentChapter,
          // Keep the existing title prefix but update the custom part
          title: generateFullChapterTitle(chapterIndex, outline.chapters.length, data.chapter.title),
          // Enhance description and key points
          description: data.chapter.description,
          keyPoints: data.chapter.keyPoints
        }

        const saveResponse = await fetch(`/api/books/${book.id}/outline`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chapters: updatedChapters.map((ch: any, index: number) => ({
              title: ch.title,
              description: ch.description,
              keyPoints: ch.keyPoints,
              order: index + 1
            })),
            suggestions: outline.suggestions || []
          }),
        })

        if (saveResponse.ok) {
          // Sync the AI-generated chapter with actual chapters
          await syncChapterWithOutline(chapterIndex, updatedChapters[chapterIndex])
          onOutlineUpdated()
        }
      }
    } catch (error) {
      console.error('Error generating chapter:', error)
    } finally {
      setGeneratingChapterIndex(null)
    }
  }

  const handleMoveChapter = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= outline.chapters.length) return

    // Update the outline chapters array directly
    const updatedChapters = [...outline.chapters]
    const [movedChapter] = updatedChapters.splice(fromIndex, 1)
    updatedChapters.splice(toIndex, 0, movedChapter)

    // Update titles to maintain proper sequence
    const reorderedChapters = updateChapterTitles(updatedChapters)

    // Prepare the updated book data
    const updatedBook = {
      ...book,
      outline: {
        ...outline,
        chapters: reorderedChapters
      }
    }

    // Optimistic update with SWR - this makes the UI update instantly
    mutate(updatedBook, false)

    // Save to database in the background
    try {
      const response = await fetch(`/api/books/${book.id}/outline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapters: reorderedChapters.map((ch: any, index: number) => ({
            title: ch.title,
            description: ch.description,
            keyPoints: ch.keyPoints,
            order: index + 1
          })),
          suggestions: outline.suggestions || []
        }),
      })

      if (response.ok) {
        // Sync all chapters with new outline order
        await syncAllChaptersWithOutline()
        
        // Force revalidation to reflect changes
        await mutate()
      } else {
        // Revert on error
        mutate()
      }
    } catch (error) {
      console.error('Error reordering chapters:', error)
      // Revert on error
      mutate()
    }
  }

  const handleDeleteChapter = async (chapterIndex: number) => {
    const updatedChapters = outline.chapters.filter((_: any, index: number) => index !== chapterIndex)
    const reorderedChapters = updateChapterTitles(updatedChapters)

    // Prepare the updated book data
    const updatedBook = {
      ...book,
      outline: {
        ...outline,
        chapters: reorderedChapters
      }
    }

    // Optimistic update with SWR - this makes the UI update instantly
    mutate(updatedBook, false)

    // Save to database in the background
    try {
      const response = await fetch(`/api/books/${book.id}/outline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapters: reorderedChapters.map((ch: any, index: number) => ({
            title: ch.title,
            description: ch.description,
            keyPoints: ch.keyPoints,
            order: index + 1
          })),
          suggestions: outline.suggestions || []
        }),
      })

      if (response.ok) {
        // Complete resync - this will delete extra chapters and reorder everything perfectly
        await syncAllChaptersWithOutline()
        
        // Force revalidation to reflect changes
        await mutate()
      } else {
        // Revert on error
        mutate()
      }
    } catch (error) {
      console.error('Error deleting chapter:', error)
      // Revert on error
      mutate()
    }
  }


  // Generate single new tip
  const handleGenerateSingleTip = async () => {
    setIsGeneratingTip(true)
    try {
      const response = await fetch('/api/generation/tip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: book.title,
          genre: book.genre || '',
          targetAudience: book.targetAudience || '',
          existingTips: outline.suggestions || [],
          chapters: outline.chapters
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate tip')
      }

      const data = await response.json()

      if (data.tip) {
        const newSuggestions = [...(outline.suggestions || []), data.tip]

        const saveResponse = await fetch(`/api/books/${book.id}/outline`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chapters: outline.chapters.map((ch: any, index: number) => ({
              title: ch.title,
              description: ch.description,
              keyPoints: ch.keyPoints,
              order: index + 1
            })),
            suggestions: newSuggestions
          }),
        })

        if (saveResponse.ok) {
          onOutlineUpdated()
        }
      }
    } catch (error) {
      console.error('Error generating single tip:', error)
    } finally {
      setIsGeneratingTip(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Writing Tips Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2  p-2 rounded-full">
          <Lightbulb className="h-4 w-4 text-white" />
          <h4 className="text-sm font-medium text-white">Writing Tips</h4>
        </div>

        {outline.suggestions?.length > 0 ? (
          <div className="space-y-2">
            {outline.suggestions.map((suggestion: string, index: number) => (
              <div key={index} className="group bg-primary/10 p-2 rounded-md hover:bg-primary/20 transition-colors">
                {editingTipIndex === index ? (
                  <div className="flex gap-2">
                    <Input
                      value={tempTipText}
                      onChange={(e) => setTempTipText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleTipSave(index)
                        } else if (e.key === 'Escape') {
                          handleTipCancel()
                        }
                      }}
                      className="flex-1 text-sm h-8"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={() => handleTipSave(index)}
                      className="h-8 w-8 p-0"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleTipCancel}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors group"
                    onClick={() => handleTipClick(index, suggestion)}
                  >
                    <div className="h-1 w-1 bg-muted-foreground rounded-full flex-shrink-0"></div>
                    <p className="text-sm text-white leading-relaxed flex-1">
                      {suggestion}
                    </p>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2
                        className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-destructive transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTip(index)
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-primary/5 p-4 rounded-lg text-center border border-dashed border-primary/20">
            <p className="text-sm text-muted-foreground mb-3">No writing tips yet</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddTip}
            className="text-xs h-7 px-3"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Tip
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateSingleTip}
            disabled={isGeneratingTip}
            className="text-xs h-7 px-3"
          >
            {isGeneratingTip ? (
              <TextShimmer className="text-xs">
                AI thinking...
              </TextShimmer>
            ) : (
              <>
                <Sparkles className="h-3 w-3 mr-1" />
                Generate
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Chapters Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-muted-foreground">Chapters</h4>
          <span className="text-xs text-muted-foreground">({outline.chapters.length})</span>
        </div>

        <div className="space-y-3">
          {outline.chapters.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex-1 border-t border-dashed border-muted-foreground/30"></div>
              <div className="flex gap-2 mx-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCreateChapter(-1)}
                  className="h-8 w-8 p-0 rounded-full border-dashed border-2 opacity-50 hover:opacity-100 hover:bg-primary/5 transition-all"
                  title="Add empty chapter"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCreateAIChapter(-1)}
                  className="h-8 w-8 p-0 rounded-full border-dashed border-2 opacity-50 hover:opacity-100 hover:bg-purple-500/5 transition-all"
                  title="Create chapter with AI"
                >
                  <Sparkles className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex-1 border-t border-dashed border-muted-foreground/30"></div>
            </div>
          ) : (
            outline.chapters.map((outlineChapter: any, index: number) => (
              <div key={outlineChapter.id || index}>

                {/* Action Buttons - Above the card */}
                {editingChapterId !== outlineChapter.id && (
                  <div className="flex justify-end gap-2 mb-2">
                    {/* AI Generate */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleGenerateChapter(index)
                      }}
                      disabled={generatingChapterIndex === index}
                      className="h-8 px-3 hover:bg-primary/20 text-xs"
                      title={generatingChapterIndex === index ? "Generating with AI..." : "Generate with AI"}
                    >
                      <Wand2 className="h-3 w-3 mr-1" />
                      {generatingChapterIndex === index ? "Generating..." : "Generate"}
                    </Button>
                    
                    {/* Delete Chapter */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteChapter(index)
                      }}
                      className="h-8 px-3 hover:bg-destructive/20 hover:text-destructive text-xs"
                      title="Delete chapter"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}

                {/* Chapter Card */}
                <div
                  ref={editingChapterId === outlineChapter.id ? editingChapterRef : null}
                  className={`rounded-lg p-4 transition-all duration-200 relative group ${generatingChapterIndex === index
                      ? 'bg-muted animate-pulse'
                      : 'bg-muted'
                    } ${editingChapterId === outlineChapter.id
                      ? ''
                      : 'hover:border-primary/50 hover:bg-primary/10 cursor-pointer'
                    }`}
                  onClick={() => editingChapterId !== outlineChapter.id && handleChapterClick(outlineChapter)}
                >

                    {/* Glowing background effect for loading */}
                    {generatingChapterIndex === index && (
                      <div className="absolute -inset-1 bg-gradient-to-br from-purple-500/20 via-transparent to-blue-500/20 rounded-xl opacity-100 -z-10 blur-xl animate-pulse" />
                    )}
                    {editingChapterId === outlineChapter.id && chapterForm ? (
                      // Edit Mode
                      <div className="space-y-4">
                        {/* Chapter Header in Edit Mode */}
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-base font-medium flex-shrink-0 mt-1">
                            {index + 1}
                          </div>
                          <div className="flex-1 space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-muted-foreground text-sm bg-muted/50 px-2 py-1 rounded">
                                  {generateChapterPrefix(index, outline.chapters.length)}
                                </span>
                                <Input
                                  value={chapterForm.customTitle || extractCustomTitle(chapterForm.title)}
                                  onChange={(e) => updateChapterField('customTitle', e.target.value)}
                                  className="flex-1 font-semibold text-lg"
                                  placeholder="Enter chapter title..."
                                />
                              </div>
                            </div>
                            <Textarea
                              value={chapterForm.description}
                              onChange={(e) => updateChapterField('description', e.target.value)}
                              className="resize-none min-h-[80px]"
                              placeholder="Describe what this chapter covers..."
                            />
                          </div>
                        </div>

                        {/* Key Points in Edit Mode */}
                        <div className="pl-9 space-y-3">
                          <h5 className="text-base font-medium text-muted-foreground">Key Points</h5>
                          <div className="space-y-2">
                            {chapterForm.keyPoints.map((point: string, pointIndex: number) => (
                              <div key={pointIndex} className="flex items-center gap-2 group">
                                <div className="h-1 w-1 bg-primary rounded-full flex-shrink-0"></div>
                                <Input
                                  value={point}
                                  onChange={(e) => updateKeyPoint(pointIndex, e.target.value)}
                                  className="flex-1 text-base h-8"
                                  placeholder="Key point..."
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeKeyPoint(pointIndex)
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                addKeyPoint()
                              }}
                              className="text-xs h-7 px-2 border-dashed border ml-3"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Key Point
                            </Button>
                          </div>
                        </div>

                        {/* Save/Cancel Buttons */}
                        <div className="flex justify-end gap-2 pt-3 border-t border-muted">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              cancelChapterEdit()
                            }}
                            className="text-xs h-7 px-3"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              saveChapterChanges()
                            }}
                            className="text-xs h-7 px-3"
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="space-y-4">
                        {/* Chapter Header */}
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-medium flex-shrink-0 mt-1">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-base mb-1 text-foreground transition-colors">
                              {generateFullChapterTitle(index, outline.chapters.length, extractCustomTitle(outlineChapter.title))}
                            </h4>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                              {outlineChapter.description}
                            </p>

                            {/* Key Points */}
                            {outlineChapter.keyPoints.length > 0 && (
                              <div className="space-y-1">
                                {outlineChapter.keyPoints.map((point: string, pointIndex: number) => (
                                  <div key={pointIndex} className="flex items-start gap-2">
                                    <div className="h-1 w-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{point}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>


                      </div>
                    )}

                </div>

                {/* Plus icon with dotted line (shows after chapters except the last one - conclusion) */}
                {index < outline.chapters.length - 1 && (
                  <div className="flex items-center justify-center py-4">
                    <div className="flex-1 border-t border-dashed border-muted-foreground/30"></div>
                    <div className="flex gap-2 mx-3">
                      {/* Move chapter up */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMoveChapter(index + 1, index)}
                        disabled={index === outline.chapters.length - 2}
                        className="h-8 w-8 p-0 rounded-full border-dashed border-2 opacity-50 hover:opacity-100 hover:bg-muted/10 transition-all"
                        title="Move next chapter up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      
                      {/* Add new chapter - in the middle */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateChapter(index)}
                        className="h-8 w-8 p-0 rounded-full border-dashed border-2 opacity-50 hover:opacity-100 hover:bg-primary/5 transition-all"
                        title="Add empty chapter after this one"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      
                      {/* Move chapter down */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMoveChapter(index, index + 1)}
                        className="h-8 w-8 p-0 rounded-full border-dashed border-2 opacity-50 hover:opacity-100 hover:bg-muted/10 transition-all"
                        title="Move current chapter down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex-1 border-t border-dashed border-muted-foreground/30"></div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}