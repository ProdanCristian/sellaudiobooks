"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import VoiceCard from "@/components/voice-card"
import { FishAudioVoice } from "@/lib/fish-audio"
import { Mic, Search, Filter, Play, Download, Loader2, ArrowLeft } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface VoiceGeneratorProps {
  bookTitle: string
  bookId: string
  content: string
  contentType: 'introduction' | 'chapter' | 'conclusion'
  chapterTitle?: string
  onAudioGenerated?: (audioUrl: string, metadata: Record<string, unknown>) => void
  onBack?: () => void
}

export default function VoiceGenerator({ 
  bookTitle, 
  bookId, 
  content, 
  contentType, 
  chapterTitle,
  onAudioGenerated,
  onBack
}: VoiceGeneratorProps) {
  const [currentStep, setCurrentStep] = useState<'select' | 'generate' | 'complete'>('select')
  const [voices, setVoices] = useState<FishAudioVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<FishAudioVoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedAudio, setGeneratedAudio] = useState<{ url: string, metadata: Record<string, unknown> } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en')
  
  useEffect(() => {
    fetchVoices()
  }, [searchTerm, selectedLanguage])

  const fetchVoices = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page_size: '12',
        page_number: '1',
      })

      if (searchTerm.trim()) {
        params.append('title', searchTerm.trim())
      }

      if (selectedLanguage) {
        params.append('language', selectedLanguage)
      }

      const response = await fetch(`/api/voices?${params.toString()}`)
      
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

  const handleVoiceSelect = (voice: FishAudioVoice) => {
    setSelectedVoice(voice)
  }

  const generateAudio = async () => {
    if (!selectedVoice || !content.trim()) return

    setIsGenerating(true)
    setCurrentStep('generate')

    try {
      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceId: selectedVoice._id,
          text: content,
          chapterTitle: chapterTitle || (contentType === 'introduction' ? 'Introduction' : contentType === 'conclusion' ? 'Conclusion' : 'Chapter'),
          bookTitle: bookTitle
        })
      })

      const data = await response.json()

      if (response.ok) {
        setGeneratedAudio({
          url: data.audioUrl,
          metadata: data.metadata
        })
        setCurrentStep('complete')
        onAudioGenerated?.(data.audioUrl, data.metadata)
      } else {
        throw new Error(data.error || 'Failed to generate audio')
      }
    } catch (error) {
      console.error('Error generating audio:', error)
      alert('Failed to generate audio. Please try again.')
      setCurrentStep('select')
    } finally {
      setIsGenerating(false)
    }
  }

  const VoiceSkeleton = () => (
    <div className="w-full bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  )

  // Complete step
  if (currentStep === 'complete' && generatedAudio) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Audio Generated Successfully!</h2>
            <p className="text-sm text-muted-foreground">
              {contentType === 'introduction' ? 'Introduction' : contentType === 'conclusion' ? 'Conclusion' : chapterTitle} • {bookTitle}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Generated Audio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <audio controls className="w-full">
                  <source src={generatedAudio.url} type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>
              </div>
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Voice:</strong> {selectedVoice?.title}</p>
              <p><strong>Text Length:</strong> {generatedAudio.metadata.textLength} characters</p>
              <p><strong>Generated:</strong> {new Date(generatedAudio.metadata.generatedAt).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button 
            variant="outline" 
            onClick={() => {
              setCurrentStep('select')
              setGeneratedAudio(null)
            }}
            className="flex-1"
          >
            Generate Another
          </Button>
          <Button onClick={onBack} className="flex-1">
            Done
          </Button>
        </div>
      </div>
    )
  }

  // Generate step
  if (currentStep === 'generate') {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Generating Audio</h2>
            <p className="text-muted-foreground">
              Creating audio for your {contentType === 'introduction' ? 'introduction' : contentType === 'conclusion' ? 'conclusion' : 'chapter'} using {selectedVoice?.title}...
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Book:</strong> {bookTitle}</p>
              {chapterTitle && <p><strong>Chapter:</strong> {chapterTitle}</p>}
              <p><strong>Voice:</strong> {selectedVoice?.title}</p>
              <p><strong>Content Length:</strong> {content.length} characters</p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          This may take a few moments depending on the length of your content...
        </div>
      </div>
    )
  }

  // Select step
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">Choose Your Voice</h2>
          <p className="text-sm text-muted-foreground">
            Select from your personal AI voices for your {contentType === 'introduction' ? 'introduction' : contentType === 'conclusion' ? 'conclusion' : 'chapter'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Don't have voices yet? <button 
              onClick={() => window.open('https://fish.audio', '_blank')}
              className="text-primary underline hover:no-underline"
            >
              Create them on Fish Audio
            </button>
          </p>
        </div>
      </div>

      {/* Search and Filters */}
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
            <SelectValue placeholder="Language" />
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

      {/* Content Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground line-clamp-3">
            {content.substring(0, 200)}...
          </div>
        </CardContent>
      </Card>

      {/* Voices Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <VoiceSkeleton key={i} />
          ))}
        </div>
      ) : voices.length === 0 ? (
        <div className="text-center py-12">
          <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <div className="space-y-4">
            <p className="text-muted-foreground">No personal voices found.</p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                You don&apos;t have any personal AI voices yet. Create your own voices using Fish Audio to use them here.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('https://fish.audio', '_blank')}
              >
                Create Voice on Fish Audio
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {voices.map((voice) => (
            <VoiceCard
              key={voice._id}
              voice={voice}
              onSelect={handleVoiceSelect}
              isSelected={selectedVoice?._id === voice._id}
              showSelectButton={true}
            />
          ))}
        </div>
      )}

      {/* Generate Button */}
      <div className="flex justify-center pt-6">
        <Button
          onClick={generateAudio}
          disabled={!selectedVoice || isGenerating}
          size="lg"
          className="min-w-48"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Generate Audio
            </>
          )}
        </Button>
      </div>
    </div>
  )
}