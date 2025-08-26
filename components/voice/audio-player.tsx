"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, Volume2, Download } from 'lucide-react'

interface AudioPlayerProps {
  audioUrl: string
  title: string
  voiceName?: string
  className?: string
  markers?: { label: string; time: number }[]
  normalizedMarkers?: boolean
}

export default function AudioPlayer({ audioUrl, title, voiceName, className = '', markers, normalizedMarkers = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const formatTime = (time: number) => {
    if (!isFinite(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const newTime = (clickX / width) * duration

    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleDownload = async () => {
    const sanitize = (s: string) => s.replace(/[^a-z0-9]/gi, '-').toLowerCase()
    const inferExtFromContentType = (ct: string | null) => {
      if (!ct) return null
      const t = ct.toLowerCase()
      if (t.includes('mpeg')) return 'mp3'
      if (t.includes('mp3')) return 'mp3'
      if (t.includes('wav') || t.includes('x-wav') || t.includes('wave')) return 'wav'
      if (t.includes('ogg')) return 'ogg'
      if (t.includes('opus')) return 'opus'
      return null
    }
    const inferExtFromUrl = (url: string) => {
      try {
        const u = new URL(url)
        const pathname = u.pathname
        const match = pathname.match(/\.([a-z0-9]+)$/i)
        return match ? match[1].toLowerCase() : null
      } catch {
        const match = url.match(/\.([a-z0-9]+)(?:\?|#|$)/i)
        return match ? match[1].toLowerCase() : null
      }
    }
    try {
      const extHint = inferExtFromUrl(audioUrl) || 'mp3'
      const proxyUrl = `/api/media/download-audio?url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(`${sanitize(title)}.${extHint}`)}`
      const res = await fetch(proxyUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const ct = res.headers.get('content-type')
      const ext = inferExtFromContentType(ct) || extHint || 'mp3'
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `${sanitize(title)}.${ext}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      // Fallback: open in new tab if direct download is blocked
      const link = document.createElement('a')
      link.href = audioUrl
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      link.remove()
    }
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={`border rounded-lg p-4 bg-muted/30 ${className}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        {voiceName && (
          <span className="text-xs text-muted-foreground">{voiceName}</span>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <Button
          size="sm"
          variant="ghost"
          onClick={togglePlayPause}
          className="h-8 w-8 p-0"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1">
          <div
            className="relative w-full h-2 bg-muted rounded-full cursor-pointer"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-primary rounded-full transition-all duration-100"
              style={{ width: `${progressPercentage}%` }}
            />
            {Array.isArray(markers) && markers.length > 0 && duration > 0 && (
              <div className="absolute inset-0">
                {markers.map((m, idx) => {
                  const timeSec = normalizedMarkers ? m.time * duration : m.time
                  const left = Math.max(0, Math.min(100, (timeSec / duration) * 100))
                  return (
                    <div
                      key={`${m.label}-${idx}`}
                      className="absolute top-0 -mt-1 h-4 w-px bg-foreground/40 hover:bg-foreground"
                      style={{ left: `${left}%` }}
                      title={`${m.label} • ${formatTime(timeSec)}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        const audio = audioRef.current
                        if (!audio) return
                        audio.currentTime = timeSec
                        setCurrentTime(timeSec)
                      }}
                    />
                  )
                })}
              </div>
            )}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          {Array.isArray(markers) && markers.length > 0 && (
            <div className="flex gap-2 overflow-x-auto mt-2 pb-1">
              {markers.map((m, idx) => (
                <button
                  key={`${m.label}-${idx}`}
                  className="text-xs px-2 py-1 rounded border bg-background/60 hover:bg-accent hover:text-accent-foreground cursor-pointer whitespace-nowrap"
                  title={duration > 0 ? `${m.label} • ${formatTime(normalizedMarkers ? m.time * duration : m.time)}` : m.label}
                  onClick={() => {
                    const audio = audioRef.current
                    if (!audio) return
                    const timeSec = normalizedMarkers ? m.time * duration : m.time
                    audio.currentTime = timeSec
                    setCurrentTime(timeSec)
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleDownload}
          className="h-8 w-8 p-0"
          title="Download audio"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}