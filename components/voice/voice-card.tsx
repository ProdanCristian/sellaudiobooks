"use client"

import { useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Pause, RefreshCw } from "lucide-react"
import { Voice } from "@/types/voice"

interface VoiceCardProps {
  voice: Voice
  onSelect?: (voice: Voice) => void
  isSelected?: boolean
  showSelectButton?: boolean
}

export default function VoiceCard({ voice, onSelect, isSelected, showSelectButton }: VoiceCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const languageLabel = (voice.languages?.[0] || 'en-us').toUpperCase()

  const sampleAudio = voice.samples?.[0]?.audio || ""
  const sampleText = voice.samples?.[0]?.text || voice.default_text

  const togglePlay = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <Card className={`w-full bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-all duration-300 ${
      isSelected ? 'ring-2 ring-primary border-primary' : ''
    }`}>
      <CardContent className="p-4 flex flex-col h-56">
        {/* Voice Title */}
        <div className="mb-3">
          <h3 className="font-medium text-foreground text-center line-clamp-1">
            {voice.title}
          </h3>
        </div>

        {/* Language Badge */}
        <div className="flex justify-center mb-2">
          <Badge variant="secondary" className="px-2 py-0.5 text-[10px] tracking-wide">
            {languageLabel}
          </Badge>
        </div>

        {/* Audio Player */}
        <div className="flex-1">
          {sampleAudio ? (
            <div className="space-y-3">
              <audio
                ref={audioRef}
                src={sampleAudio}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                preload="none"
              />

              {/* Play Controls */}
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={togglePlay}
                  className="h-8 w-8 rounded-full p-0 flex-shrink-0"
                >
                  {isPlaying ? (
                    <Pause className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3 ml-0.5" />
                  )}
                </Button>

                <div className="flex-1 min-w-0">
                  {/* Progress Bar */}
                  <div className="w-full bg-muted/30 rounded-full h-1.5 relative">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all duration-100"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>

                  {/* Time Display */}
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Skeleton area to preserve consistent height when no sample is available
            <div className="space-y-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted/40" />
                <div className="flex-1 min-w-0">
                  <div className="w-full bg-muted/30 rounded-full h-1.5" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <div className="h-3 w-10 bg-muted/30 rounded" />
                    <div className="h-3 w-10 bg-muted/30 rounded" />
                  </div>
                </div>
              </div>
              <div className="text-center text-xs text-muted-foreground">Preview not available yet</div>
            </div>
          )}
        </div>

        {/* Select Voice Button */}
        {showSelectButton && (
          <div className="mt-4">
            <Button
              onClick={async () => {
                if (!onSelect) return
                try {
                  setIsSelecting(true)
                  await Promise.resolve(onSelect(voice))
                } finally {
                  setIsSelecting(false)
                }
              }}
              variant={isSelected ? "default" : "outline"}
              className="w-full"
              size="sm"
            >
              {isSelecting ? (
                <span className="flex items-center justify-center"><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Selecting...</span>
              ) : isSelected ? "Selected" : "Select Voice"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
