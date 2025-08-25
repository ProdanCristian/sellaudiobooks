'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { RefreshCw, Lightbulb } from 'lucide-react'
import { Input } from '../ui/input'

interface RegenerateOutlineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookTitle: string
  onRegenerate: (prompt: string) => void
  isRegenerating: boolean
}

export function RegenerateOutlineDialog({
  open,
  onOpenChange,
  bookTitle,
  onRegenerate,
  isRegenerating
}: RegenerateOutlineDialogProps) {
  const [prompt, setPrompt] = useState('')

  const handleRegenerate = () => {
    if (prompt.trim()) {
      onRegenerate(prompt.trim())
      setPrompt('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      handleRegenerate()
    }
  }

  const suggestions = [
    "Make it more focused on practical examples",
    "Add more chapters about advanced techniques",
    "Structure it for complete beginners",
    "Include more case studies and real-world applications",
    "Make it shorter and more concise",
    "Add chapters about common mistakes to avoid"
  ]

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="flex flex-col max-w-md w-full transition-all duration-300 backdrop-blur-xl border border-border rounded-lg shadow-lg pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/70 bg-muted/30 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Regenerate Outline</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0"
            disabled={isRegenerating}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground">
            Provide specific instructions to customize the outline for <span className="font-semibold">"{bookTitle}"</span>
          </p>

          <Input
            placeholder="Write prompt to change the outline..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-12 sm:h-14 md:h-16 pl-6 pr-20 sm:pr-24 rounded-full border focus:border-primary transition-all duration-300 md:text-sm text-foreground"
            disabled={isRegenerating}
          />

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Quick suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    setPrompt(suggestion)
                    onRegenerate(suggestion)
                  }}
                  disabled={isRegenerating}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isRegenerating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRegenerate}
              disabled={!prompt.trim() || isRegenerating}
              className="flex-1"
            >
              {isRegenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}