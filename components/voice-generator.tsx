"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Loader2, Volume2, User, Search } from "lucide-react"

interface VoiceModel {
  _id: string
  title: string
  description: string
  author: {
    nickname: string
  }
  languages: string[]
  like_count: number
}

interface VoiceGeneratorProps {
  scripts: string[]
  onVoiceGenerated?: (audioUrl: string, duration: number) => void
}

export function VoiceGenerator({ scripts, onVoiceGenerated }: VoiceGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [voiceSpeed, setVoiceSpeed] = useState(1.0)
  const [temperature, setTemperature] = useState(0.9)
  const [topP, setTopP] = useState(0.9)
  const [selectedScript, setSelectedScript] = useState(0)
  const [selectedVoice, setSelectedVoice] = useState<string>("")
  const [voiceModels, setVoiceModels] = useState<VoiceModel[]>([])
  const [isLoadingVoices, setIsLoadingVoices] = useState(false)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)
  const [audioDuration, setAudioDuration] = useState<number>(0)
  
  // Filter states
  const [searchTitle, setSearchTitle] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState("all")
  const [sortBy, setSortBy] = useState("score")
  const [pageSize, setPageSize] = useState("50")
  
  const audioRef = useRef<HTMLAudioElement>(null)

  // Handle audio loaded to extract duration
  const handleAudioLoaded = () => {
    if (audioRef.current) {
      const duration = audioRef.current.duration
      setAudioDuration(duration)
      if (onVoiceGenerated && audioUrl) {
        onVoiceGenerated(audioUrl, duration)
      }
    }
  }

  const loadVoiceModels = useCallback(async (applyFilters = false) => {
    setIsLoadingVoices(true)
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page_size: pageSize,
        page_number: '1',
        sort_by: sortBy
      })

      if (applyFilters && searchTitle.trim()) {
        params.append('title', searchTitle.trim())
      }
      
      if (applyFilters && selectedLanguage && selectedLanguage !== "all") {
        params.append('language', selectedLanguage)
      }

      const response = await fetch(`/api/fish-voices?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) throw new Error('Failed to load voice models')

      const data = await response.json()
      setVoiceModels(data.items || [])
    } catch (error) {
      console.error('Error loading voice models:', error)
      setError('Failed to load voice models')
    } finally {
      setIsLoadingVoices(false)
    }
  }, [pageSize, sortBy, searchTitle, selectedLanguage])

  useEffect(() => {
    loadVoiceModels()
  }, [loadVoiceModels])

  const applyFilters = () => {
    loadVoiceModels(true)
  }

  const selectVoiceAndClose = (voiceId: string) => {
    setSelectedVoice(voiceId)
    setIsVoiceModalOpen(false)
  }

  const openVoiceModal = () => {
    setIsVoiceModalOpen(true)
    if (voiceModels.length === 0) {
      loadVoiceModels()
    }
  }

  const resetFilters = () => {
    setSearchTitle("")
    setSelectedLanguage("all")
    setSortBy("score")
    setPageSize("50")
    loadVoiceModels(false)
  }

  const generateVoice = async () => {
    const currentScript = scripts[selectedScript]
    if (!currentScript?.trim() || !selectedVoice) return

    setIsGenerating(true)
    setError(null)
    
    try {
      const response = await fetch('/api/generate-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentScript,
          reference_id: selectedVoice,
          speed: voiceSpeed,
          temperature: temperature,
          top_p: topP
        })
      })

      if (!response.ok) throw new Error('Failed to generate voice')

      const audioBlob = await response.blob()
      const url = URL.createObjectURL(audioBlob)
      setAudioUrl(url)
      // onVoiceGenerated will be called from handleAudioLoaded after duration is extracted
      
    } catch (error) {
      console.error("Error generating voice:", error)
      setError("Failed to generate voice. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const selectedVoiceModel = voiceModels.find(v => v._id === selectedVoice)

  const downloadAudio = () => {
    if (audioUrl) {
      const link = document.createElement('a')
      link.href = audioUrl
      link.download = `${selectedVoiceModel?.title || 'voice'}-generated.mp3`
      link.click()
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 w-full">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            AI Voice Generation
          </CardTitle>
          <CardDescription>
            Select a voice model and script to generate professional AI voice using Fish Audio technology
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Script Selection */}
          {scripts.length > 1 && (
            <div className="space-y-4">
              <Label className="font-medium">Select Script</Label>
              
              {/* Simple Script Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {scripts.map((script, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedScript(index)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all duration-200 ${
                      selectedScript === index
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border'
                    }`}
                  >
                    Script {index + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Voice Model Selection */}
          <div className="space-y-4">
            <Label className="font-medium">Select Voice Model</Label>
            
            {/* Current Voice Display */}
            {selectedVoice ? (
              <div className="bg-muted border border-primary rounded-xl p-4">
            <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium text-primary">
                        {selectedVoiceModel?.title || 'Selected Voice'}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {selectedVoiceModel ? `by ${selectedVoiceModel.author.nickname} • ${selectedVoiceModel.like_count} likes` : 'Ready for generation'}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={openVoiceModal}
                    size="sm"
                    variant="outline"
                  >
                    Change Voice
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={openVoiceModal}
                className="w-full h-16 border-2 border-dashed font-medium rounded-xl transition-all duration-200"
                variant="outline"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Choose Voice Model</div>
                    <div className="text-xs text-muted-foreground">Browse and select from Fish Audio voices</div>
                  </div>
                </div>
              </Button>
            )}

            {/* Voice Selection Modal */}
            <Dialog open={isVoiceModalOpen} onOpenChange={setIsVoiceModalOpen}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Select Voice Model
                  </DialogTitle>
                  <DialogDescription>
                    Browse and select a voice model from Fish Audio to generate your script
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Search and Filters */}
                  <div className="grid md:grid-cols-4 gap-3">
                    {/* Search */}
                    <div className="md:col-span-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search voice models..."
                          value={searchTitle}
                          onChange={(e) => setSearchTitle(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    {/* Language Filter */}
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <SelectTrigger>
                        <SelectValue placeholder="Language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Languages</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                        <SelectItem value="ja">Japanese</SelectItem>
                        <SelectItem value="ko">Korean</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="it">Italian</SelectItem>
                        <SelectItem value="pt">Portuguese</SelectItem>
                        <SelectItem value="ru">Russian</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Sort */}
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="score">Best Match</SelectItem>
                        <SelectItem value="like_count">Most Liked</SelectItem>
                        <SelectItem value="created_at">Newest</SelectItem>
                        <SelectItem value="updated_at">Updated</SelectItem>
              </SelectContent>
            </Select>
                  </div>

                  {/* Filter Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={applyFilters}
                      size="sm"
                      disabled={isLoadingVoices}
                    >
                      {isLoadingVoices ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Search
                    </Button>
                    <Button
                      onClick={resetFilters}
                      size="sm"
                      variant="outline"
                    >
                      Reset
                    </Button>
                    <div className="text-xs text-muted-foreground ml-auto">
                      {voiceModels.length} voices found
                    </div>
                  </div>

                  {/* Voice Models Grid */}
                  <div className="max-h-96 overflow-y-auto">
                    {isLoadingVoices ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="ml-2 text-muted-foreground">Loading voices...</span>
                      </div>
                    ) : voiceModels.length > 0 ? (
                      <div className="grid gap-3">
                        {voiceModels.map((voice) => {
                          const isSelected = selectedVoice === voice._id
                          return (
                            <div
                              key={voice._id}
                              onClick={() => selectVoiceAndClose(voice._id)}
                              className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                                isSelected
                                  ? 'bg-muted border-primary shadow-lg'
                                  : 'bg-background hover:bg-muted'
                              }`}
                            >
                              {isSelected && (
                                <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                  <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold ${
                                  isSelected 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-muted text-foreground'
                                }`}>
                                  <User className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                  <h3 className={`font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                    {voice.title}
                                  </h3>
                                  <p className="text-sm text-muted-foreground mb-1">
                                    {voice.description || 'No description available'}
                                  </p>
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span>👤 {voice.author.nickname}</span>
                                    <span>❤️ {voice.like_count} likes</span>
                                    {voice.languages?.length > 0 && (
                                      <span>🌐 {voice.languages.join(', ')}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-foreground">No voice models found</p>
                        <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
                      </div>
                    )}
                  </div>

                  {/* Modal Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-xs text-muted-foreground">
                      {selectedVoice ? 'Voice selected' : 'Select a voice to continue'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setIsVoiceModalOpen(false)}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                      {selectedVoice && (
                        <Button
                          onClick={() => setIsVoiceModalOpen(false)}
                          size="sm"
                        >
                          Continue with Selected Voice
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {/* Voice Speed Control */}
          <div className="space-y-3">
            <Label>Voice Speed</Label>
            <div className="space-y-3">
              {/* Speed Preset Buttons */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { value: 0.5, label: '0.5x', desc: 'Very Slow' },
                  { value: 0.75, label: '0.75x', desc: 'Slow' },
                  { value: 1.0, label: '1.0x', desc: 'Normal' },
                  { value: 1.25, label: '1.25x', desc: 'Fast' },
                  { value: 1.5, label: '1.5x', desc: 'Very Fast' }
                ].map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setVoiceSpeed(preset.value)}
                    className={`p-2 rounded-lg border text-xs font-medium transition-all duration-200 ${
                      voiceSpeed === preset.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border'
                    }`}
                  >
                    <div className="font-semibold">{preset.label}</div>
                    <div className="text-[10px] text-muted-foreground">{preset.desc}</div>
                  </button>
                ))}
              </div>


            </div>
          </div>

          {/* Advanced Voice Quality Controls */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Temperature Control */}
            <div className="space-y-3">
              <Label>Voice Creativity (Temperature)</Label>
              <div className="space-y-3">
                {/* Temperature Presets */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 0.3, label: 'Conservative', desc: 'Predictable' },
                    { value: 0.7, label: 'Balanced', desc: 'Standard' },
                    { value: 0.9, label: 'Creative', desc: 'Default' }
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setTemperature(preset.value)}
                      className={`p-2 rounded-lg border text-xs font-medium transition-all duration-200 ${
                        Math.abs(temperature - preset.value) < 0.01
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted border-border'
                      }`}
                    >
                      <div className="font-semibold">{preset.label}</div>
                      <div className="text-[10px] text-muted-foreground">{preset.desc}</div>
                    </button>
                  ))}
                </div>

              </div>
            </div>

            {/* Top P Control */}
            <div className="space-y-3">
              <Label>Voice Diversity (Top P)</Label>
              <div className="space-y-3">
                {/* Top P Presets */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 0.5, label: 'Focused', desc: 'Precise' },
                    { value: 0.8, label: 'Balanced', desc: 'Standard' },
                    { value: 0.9, label: 'Diverse', desc: 'Default' }
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setTopP(preset.value)}
                      className={`p-2 rounded-lg border text-xs font-medium transition-all duration-200 ${
                        Math.abs(topP - preset.value) < 0.01
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted border-border'
                      }`}
                    >
                      <div className="font-semibold">{preset.label}</div>
                      <div className="text-[10px] text-muted-foreground">{preset.desc}</div>
                    </button>
                  ))}
                </div>

              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setVoiceSpeed(1.0)
                setTemperature(0.9)
                setTopP(0.9)
              }}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Reset to Optimal
            </Button>
          </div>

          {/* Generate Voice Button */}
          {!audioUrl && (
            <Button 
              onClick={generateVoice}
              disabled={isGenerating || scripts.length === 0 || !scripts[selectedScript]?.trim() || !selectedVoice}
              className="w-full py-4 rounded-xl"
            >
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Voice...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5" />
                  Generate Voice {selectedVoiceModel ? `(${selectedVoiceModel.title})` : ''}
                </div>
              )}
            </Button>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Audio Player & Regenerate Button */}
          {audioUrl && (
            <div className="space-y-4">
              {/* Audio Player */}
              <div className="bg-muted border border-primary rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🎉</span>
                  <h4 className="text-sm font-medium text-primary">
                    {selectedVoiceModel?.title || 'Voice'} Generated Successfully!
                  </h4>
                </div>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  className="w-full"
                  controls
                  onLoadedData={handleAudioLoaded}
                />
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={downloadAudio}
                    size="sm"
                    variant="outline"
                  >
                    Download Audio
                  </Button>
                </div>
              </div>
              
              {/* Regenerate Button */}
              <Button 
                onClick={generateVoice}
                disabled={isGenerating}
                className="w-full py-3 rounded-xl"
                variant="outline"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Regenerating Voice...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Regenerate Voice
                  </div>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}