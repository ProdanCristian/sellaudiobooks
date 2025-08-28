"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import VoiceCard from '@/components/voice/voice-card'
import { Voice } from '@/types/voice'
import { Search, X, Mic } from 'lucide-react'

interface VoiceSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  selectedVoice: Voice | null
  onSelectVoice: (voice: Voice) => void
  onLoadingChange?: (loading: boolean) => void
}

export default function VoiceSelectionModal({
  isOpen,
  onClose,
  selectedVoice,
  onSelectVoice,
  onLoadingChange
}: VoiceSelectionModalProps) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [allVoices, setAllVoices] = useState<Voice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  // English-only; no language filter
  const contentRef = useRef<HTMLDivElement>(null)
  const [fixedHeight, setFixedHeight] = useState<number | null>(null)
  const [selectingId, setSelectingId] = useState<string | null>(null)

  // Initial load only: fetch once when modal opens
  useEffect(() => {
    if (isOpen && allVoices.length === 0) {
      fetchVoices()
    }
  }, [isOpen, allVoices.length])

  // Apply filters client-side to avoid flicker
  useEffect(() => {
    let list = allVoices
    const q = searchTerm.trim().toLowerCase()
    if (q) {
      list = list.filter(v => v.title.toLowerCase().includes(q) || v.id.toLowerCase().includes(q))
    }
    setVoices(list)
  }, [searchTerm, allVoices])

  const fetchVoices = async () => {
    // Capture current content height to prevent layout shift during loading
    if (contentRef.current) {
      const h = contentRef.current.clientHeight
      if (h > 0) setFixedHeight(h)
    }
    setIsLoading(true)
    onLoadingChange?.(true)
    try {
      const response = await fetch(`/api/media/voices?page_size=1000&page_number=1`)
      
      if (response.ok) {
        const data = await response.json()
        try { console.log('[Voices API] data', data) } catch {}
        const items: Voice[] = data.data.items || []
        setAllVoices(items)
        // Apply initial search filter if any
        let initial = items
        const q = searchTerm.trim().toLowerCase()
        if (q) initial = initial.filter(v => v.title.toLowerCase().includes(q) || v.id.toLowerCase().includes(q))
        setVoices(initial)
      }
    } catch (error) {
      console.error('Failed to fetch voices:', error)
    } finally {
      setIsLoading(false)
      onLoadingChange?.(false)
      // Keep the fixed height until the next paint to avoid flicker,
      // then release so the content can resize naturally after load
      requestAnimationFrame(() => setFixedHeight(null))
    }
  }

  const handleSelectVoice = async (voice: Voice) => {
    try {
      setSelectingId(voice.id)
      onSelectVoice(voice)
    } finally {
      setSelectingId(null)
      onClose()
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="flex flex-col max-w-4xl w-full h-[80vh] transition-all duration-300 backdrop-blur-md border border-border rounded-lg shadow-lg pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/70 bg-muted/30 rounded-t-lg">
          <div>
            <h2 className="text-xl font-semibold">Select Your Voice</h2>
            <p className="text-sm text-muted-foreground">
              Choose from your personal AI voices
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-border/50 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search voices by name..."
                className="pl-10"
              />
            </div>
            {/* Language filter removed (English-only) */}
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6" style={fixedHeight ? { height: fixedHeight } : undefined}>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-lg border border-border/50 p-4 animate-pulse h-56 flex flex-col">
                  <div className="mb-3">
                    <div className="h-5 bg-muted rounded w-3/4 mx-auto"></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted/40" />
                      <div className="flex-1 min-w-0">
                        <div className="w-full bg-muted/30 rounded-full h-1.5" />
                        <div className="flex justify-between mt-1">
                          <div className="h-3 w-10 bg-muted/30 rounded" />
                          <div className="h-3 w-10 bg-muted/30 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="h-8 bg-muted/30 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : voices.length === 0 ? (
            <div className="text-center py-12">
              <Mic className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">No voices found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {searchTerm
                    ? "Try adjusting your search terms."
                    : "You don't have any voices yet."
                  }
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => window.open('#', '_blank')}
                    variant="outline"
                  >
                    Learn about voices
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {voices.map((voice) => (
                <VoiceCard
                  key={voice.id}
                  voice={voice}
                  onSelect={handleSelectVoice}
                  isSelected={selectedVoice?.id === voice.id}
                  showSelectButton={true}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border/50 bg-muted/20 backdrop-blur-sm rounded-b-lg">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{voices.length} voices available</span>
            {selectedVoice && (
              <span className="text-primary font-medium">
                Selected: {selectedVoice.title}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
