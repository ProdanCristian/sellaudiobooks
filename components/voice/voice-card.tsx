"use client"

import { useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Pause } from "lucide-react"
import { FishAudioVoice } from "@/lib/fish-audio"

interface VoiceCardProps {
  voice: FishAudioVoice
  onSelect?: (voice: FishAudioVoice) => void
  isSelected?: boolean
  showSelectButton?: boolean
}

export default function VoiceCard({ voice, onSelect, isSelected, showSelectButton }: VoiceCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const sampleAudio = voice.samples[0]?.audio || ""
  const sampleText = voice.samples[0]?.text || voice.default_text

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
      <CardContent className="p-4">
        {/* Voice Title */}
        <div className="mb-3">
          <h3 className="font-medium text-foreground text-center line-clamp-1">
            {voice.title}
          </h3>
        </div>

        {/* Audio Player */}
        {sampleAudio && (
          <div className="space-y-3">
            <audio
              ref={audioRef}
              src={sampleAudio}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
              preload="metadata"
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
        )}

        {/* Select Voice Button */}
        {showSelectButton && (
          <div className="mt-4">
            <Button
              onClick={() => onSelect?.(voice)}
              variant={isSelected ? "default" : "outline"}
              className="w-full"
              size="sm"
            >
              {isSelected ? "Selected" : "Select Voice"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}