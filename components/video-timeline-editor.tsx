"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Film,
  Download,
  SkipBack,
  SkipForward,
  Music
} from "lucide-react"

interface ImageResult {
  index: number
  prompt: string
  imageUrl?: string
  error?: string
  taskId?: string
}

interface VideoTimelineEditorProps {
  images: ImageResult[]
  audioDuration: number // in seconds
  audioUrl?: string
  aspectRatio?: string // "16:9" for horizontal, "9:16" for vertical
  onExportVideo?: () => void
}

export const VideoTimelineEditor = ({ 
  images, 
  audioDuration, 
  audioUrl,
  aspectRatio = "16:9",
  onExportVideo 
}: VideoTimelineEditorProps) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState([50])
  const [isMuted, setIsMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  
  // Get aspect ratio class based on orientation
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case "9:16":
        return "aspect-[9/16]" // Vertical (mobile/short videos)
      case "16:9":
        return "aspect-video" // Horizontal (standard video)
      default:
        return "aspect-video" // Default to horizontal
    }
  }

  // Get container classes based on orientation for sticky left panel
  const getContainerClasses = () => {
    return aspectRatio === "9:16" 
      ? "w-64" // Fixed width for vertical videos in sidebar
      : "w-96" // Fixed width for horizontal videos in sidebar
  }
  
  // Calculate image duration (assuming equal distribution)
  const imageDuration = audioDuration / images.length
  const successfulImages = images.filter(img => img.imageUrl)
  
  // Update current time and sync with audio
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => {
      setCurrentTime(audio.currentTime)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [audioUrl])

  // Calculate current image index
  const getCurrentImageIndex = () => {
    return Math.min(Math.floor(currentTime / imageDuration), successfulImages.length - 1)
  }

  const currentImageIndex = getCurrentImageIndex()

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Play/Pause functionality
  const togglePlayback = async () => {
    const audio = audioRef.current
    
    // If no audio URL, simulate playback
    if (!audioUrl) {
      if (isPlaying) {
        setIsPlaying(false)
      } else {
        setIsPlaying(true)
        // Simulate playback with a timer
        simulatePlayback()
      }
      return
    }

    if (!audio) return

    try {
      if (isPlaying) {
        audio.pause()
      } else {
        // Ensure audio is ready to play
        if (audio.readyState >= 2) {
          await audio.play()
          console.log('Audio playback started')
        } else {
          console.log('Audio not ready, waiting...')
          audio.addEventListener('canplay', async () => {
            try {
              await audio.play()
              console.log('Audio playback started after loading')
            } catch (error) {
              console.error('Error playing audio after loading:', error)
            }
          }, { once: true })
        }
      }
    } catch (error) {
      console.error('Error toggling audio playback:', error)
    }
  }

  // Simulate audio playback when no real audio is available
  const simulatePlayback = useCallback(() => {
    if (!isPlaying) return
    
    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const newTime = prev + 0.1 // Update every 100ms
        if (newTime >= audioDuration) {
          setIsPlaying(false)
          clearInterval(interval)
          return audioDuration
        }
        return newTime
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isPlaying, audioDuration])

  // Handle simulated playback
  useEffect(() => {
    if (isPlaying && !audioUrl) {
      const cleanup = simulatePlayback()
      return cleanup
    }
  }, [isPlaying, audioUrl, simulatePlayback])

  // Seek to specific time
  const seekTo = (time: number) => {
    const clampedTime = Math.max(0, Math.min(time, audioDuration))
    
    const audio = audioRef.current
    if (audio && audioUrl) {
      audio.currentTime = clampedTime
    }
    
    setCurrentTime(clampedTime)
  }

  // Reset to beginning
  const resetPlayback = () => {
    const audio = audioRef.current
    if (audio && audioUrl) {
      audio.currentTime = 0
      audio.pause()
    }
    
    setCurrentTime(0)
    setIsPlaying(false)
  }

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current
    setVolume(value)
    
    if (audio && audioUrl) {
      audio.volume = value[0] / 100
    }
  }

  // Toggle mute
  const toggleMute = () => {
    const audio = audioRef.current
    setIsMuted(!isMuted)
    
    if (audio && audioUrl) {
      audio.muted = !isMuted
    }
  }

  // Frame navigation
  const goToNextFrame = () => {
    const frameTime = 1 / 30 // 30 FPS
    seekTo(currentTime + frameTime)
  }
  
  const goToPrevFrame = () => {
    const frameTime = 1 / 30 // 30 FPS
    seekTo(currentTime - frameTime)
  }

  // Generate audio waveform data
  const generateWaveformData = () => {
    const points = 100
    const data = []
    for (let i = 0; i < points; i++) {
      // Simulate waveform with some randomness and frequency patterns
      const frequency = Math.sin(i * 0.1) * 0.5 + 0.5
      const amplitude = Math.random() * 0.8 + 0.2
      data.push(frequency * amplitude)
    }
    return data
  }

  const waveformData = generateWaveformData()

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Film className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <CardTitle>Video Preview</CardTitle>
              <p className="text-sm text-muted-foreground">
                Preview your video scenes with synchronized audio
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {successfulImages.length} scenes
            </Badge>
            <Badge variant="outline">
              {formatTime(audioDuration)}
            </Badge>
            <Button onClick={onExportVideo} size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="h-screen overflow-hidden">
        {/* Audio Element */}
        {audioUrl && (
          <audio 
            ref={audioRef} 
            src={audioUrl} 
            preload="metadata"
            onLoadedMetadata={() => {
              const audio = audioRef.current
              if (audio) {
                audio.volume = volume[0] / 100
                console.log('Audio loaded:', audio.duration, 'seconds')
              }
            }}
            onError={(e) => {
              console.error('Audio loading error:', e)
            }}
          />
        )}

        {/* Main Layout: Sticky Video Left + Timeline Right */}
        <div className="flex gap-6 h-full">
          {/* Left Panel - Sticky Video Preview */}
          <div className="sticky top-0 h-fit">
            <div className={getContainerClasses()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">Video Preview</h3>
                  {!audioUrl ? (
                    <Badge variant="outline" className="text-xs">
                      Demo Mode
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-xs">
                      <Music className="w-3 h-3 mr-1" />
                      Audio Loaded
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">
                    {aspectRatio}
                  </Badge>
                </div>
                <Badge variant="secondary">
                  Scene {currentImageIndex + 1} of {successfulImages.length}
                </Badge>
              </div>
              
              <div className={`relative ${getAspectRatioClass()} rounded-lg overflow-hidden bg-black border-2 border-muted shadow-lg`}>
                {successfulImages[currentImageIndex]?.imageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      key={currentImageIndex} // Force re-render on scene change
                      src={successfulImages[currentImageIndex].imageUrl} 
                      alt={`Scene ${currentImageIndex + 1}`}
                      className="w-full h-full object-cover transition-opacity duration-300"
                    />
                    
                    {/* Playing Indicator */}
                    {isPlaying && (
                      <div className="absolute top-4 left-4">
                        <div className="flex items-center gap-2 bg-black/70 text-white px-3 py-1 rounded-full">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-sm font-medium">LIVE</span>
                        </div>
                      </div>
                    )}

                    {/* Progress Indicator */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                      <div
                        className="h-full bg-red-500 transition-all duration-100"
                        style={{ width: `${(currentTime / audioDuration) * 100}%` }}
                      />
                    </div>

                    {/* Scene Timer */}
                    <div className="absolute top-4 right-4">
                      <div className="bg-black/70 text-white px-2 py-1 rounded text-sm font-mono">
                        {formatTime(currentTime)}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Film className="w-16 h-16 mb-4" />
                    <p className="text-lg">No scene available</p>
                    <p className="text-sm opacity-70">Load audio to begin playback</p>
                  </div>
                )}
              </div>

              {/* Scene Info */}
              {successfulImages[currentImageIndex] && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-1">Current Scene</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {successfulImages[currentImageIndex].prompt}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Timeline and Controls */}
          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Playback Controls */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Playback Controls</h3>
              {/* Main Controls */}
              <div className="flex items-center gap-4">
                <Button
                  onClick={resetPlayback}
                  variant="outline"
                  size="sm"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>

                <Button
                  onClick={goToPrevFrame}
                  variant="outline"
                  size="sm"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>

                <Button
                  onClick={togglePlayback}
                  size="lg"
                  className={isPlaying ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </Button>

                <Button
                  onClick={goToNextFrame}
                  variant="outline"
                  size="sm"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    onClick={toggleMute}
                    variant="outline"
                    size="sm"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  <Slider
                    value={volume}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    className="w-20"
                  />
                  <span className="text-xs text-muted-foreground w-8">
                    {Math.round(volume[0])}%
                  </span>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm text-muted-foreground">
                    {formatTime(currentTime)} / {formatTime(audioDuration)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress 
                  value={(currentTime / audioDuration) * 100} 
                  className="h-2 cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const clickX = e.clientX - rect.left
                    const percentage = clickX / rect.width
                    seekTo(percentage * audioDuration)
                  }}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0:00</span>
                  <span>{formatTime(audioDuration)}</span>
                </div>
              </div>
            </div>

            {/* Scene Navigation */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Scene Navigation</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Scene {currentImageIndex + 1} of {successfulImages.length}
                  </Badge>
                </div>
              </div>

              {/* Scene Thumbnails */}
              <div className="grid grid-cols-4 gap-2">
                {successfulImages.map((image, index) => {
                  const isActive = index === currentImageIndex
                  const sceneStartTime = index * imageDuration
                  
                  return (
                    <div
                      key={index}
                      onClick={() => seekTo(sceneStartTime)}
                      className={`
                        relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all
                        ${isActive 
                          ? 'border-blue-500 shadow-lg shadow-blue-500/25' 
                          : 'border-muted hover:border-blue-300'
                        }
                      `}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.imageUrl}
                        alt={`Scene ${index + 1}`}
                        className="w-full aspect-video object-cover"
                      />
                      <div className="absolute bottom-1 left-1 right-1">
                        <div className="bg-black/70 text-white text-xs px-1 py-0.5 rounded text-center">
                          {formatTime(sceneStartTime)}
                        </div>
                      </div>
                      {isActive && (
                        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <Play className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Audio Track */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Audio Track</h3>
              
              {/* Simple Audio Waveform */}
              <div className="relative border rounded-lg bg-muted/20 overflow-hidden">
                {/* Time Ruler */}
                <div className="flex justify-between text-xs text-muted-foreground p-2 border-b bg-muted/10">
                  <span>0:00</span>
                  <span>{formatTime(audioDuration / 4)}</span>
                  <span>{formatTime(audioDuration / 2)}</span>
                  <span>{formatTime(3 * audioDuration / 4)}</span>
                  <span>{formatTime(audioDuration)}</span>
                </div>

                {/* Audio Waveform Track */}
                <div className="h-20 bg-orange-500/10 relative cursor-pointer"
                     onClick={(e) => {
                       const rect = e.currentTarget.getBoundingClientRect()
                       const clickX = e.clientX - rect.left
                       const percentage = clickX / rect.width
                       seekTo(percentage * audioDuration)
                     }}>
                  
                  {/* Playhead */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 shadow-lg"
                    style={{
                      left: `${(currentTime / audioDuration) * 100}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full shadow-lg" />
                  </div>

                  {/* Waveform visualization */}
                  <div className="flex items-center justify-center h-full px-4">
                    <div className="flex items-end gap-0.5 h-16 w-full justify-between">
                      {waveformData.map((amplitude, index) => {
                        const barPosition = (index / waveformData.length) * 100
                        const progress = (currentTime / audioDuration) * 100
                        const isPastPlayhead = barPosition <= progress
                        
                        return (
                          <div
                            key={index}
                            className={`w-1 transition-colors duration-100 ${
                              isPastPlayhead ? 'bg-orange-500' : 'bg-orange-300'
                            }`}
                            style={{
                              height: `${Math.max(amplitude * 100, 10)}%`
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>
                  
                  <div className="absolute top-2 left-2 text-xs text-muted-foreground">
                    Audio Waveform - Click to seek
                  </div>
                  
                  <div className="absolute top-2 right-2 text-xs text-muted-foreground">
                    {formatTime(currentTime)} / {formatTime(audioDuration)}
                  </div>
                </div>
              </div>
            </div>

            {/* Export Section */}
            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
              <div>
                <p className="text-sm font-medium">Ready to Export</p>
                <p className="text-xs text-muted-foreground">
                  Your video scenes and audio are ready for export
                </p>
              </div>
              <Button onClick={onExportVideo} size="lg">
                <Download className="w-4 h-4 mr-2" />
                Export Video
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}