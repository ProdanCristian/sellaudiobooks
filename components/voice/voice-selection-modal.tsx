"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import VoiceCard from '@/components/voice/voice-card'
import { FishAudioVoice } from '@/lib/fish-audio'
import { Search, Filter, X, Mic } from 'lucide-react'

interface VoiceSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  selectedVoice: FishAudioVoice | null
  onSelectVoice: (voice: FishAudioVoice) => void
}

export default function VoiceSelectionModal({
  isOpen,
  onClose,
  selectedVoice,
  onSelectVoice
}: VoiceSelectionModalProps) {
  const [voices, setVoices] = useState<FishAudioVoice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('')

  useEffect(() => {
    if (isOpen && voices.length === 0) {
      fetchVoices()
    }
  }, [isOpen, voices.length])

  useEffect(() => {
    if (isOpen) {
      fetchVoices()
    }
  }, [searchTerm, selectedLanguage, isOpen])

  const fetchVoices = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page_size: '50',
        page_number: '1',
      })

      if (searchTerm.trim()) {
        params.append('title', searchTerm.trim())
      }

      if (selectedLanguage) {
        params.append('language', selectedLanguage)
      }

      const response = await fetch(`/api/media/voices?${params.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        setVoices(data.data.items || [])
      }
    } catch (error) {
      console.error('Failed to fetch voices:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectVoice = (voice: FishAudioVoice) => {
    onSelectVoice(voice)
    onClose()
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
      <div className="flex flex-col max-w-4xl max-h-[80vh] w-full transition-all duration-300 backdrop-blur-md border border-border rounded-lg shadow-lg pointer-events-auto">
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
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Languages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="it">Italian</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-muted/30 rounded-lg p-4 animate-pulse">
                  <div className="space-y-3">
                    <div className="h-5 bg-muted rounded w-3/4 mx-auto"></div>
                    <div className="h-8 bg-muted rounded"></div>
                    <div className="h-8 bg-muted rounded"></div>
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
                  {searchTerm || selectedLanguage 
                    ? "Try adjusting your search terms or filters."
                    : "You don't have any personal AI voices yet. Create your own voices using Fish Audio to use them for audiobook generation."
                  }
                </p>
                {!searchTerm && !selectedLanguage && (
                  <Button
                    onClick={() => window.open('https://fish.audio', '_blank')}
                    variant="outline"
                  >
                    Create Voice on Fish Audio
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {voices.map((voice) => (
                <VoiceCard
                  key={voice._id}
                  voice={voice}
                  onSelect={handleSelectVoice}
                  isSelected={selectedVoice?._id === voice._id}
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