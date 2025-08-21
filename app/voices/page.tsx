"use client"

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Header from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import VoiceCard from '@/components/voice-card'
import { FishAudioVoice } from '@/lib/fish-audio'
import { Search, Filter, Mic, LoaderCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export default function VoicesPage() {
  const { status } = useSession()
  const router = useRouter()
  const [voices, setVoices] = useState<FishAudioVoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
      return
    }

    if (status === 'authenticated') {
      fetchVoices(1, true)
    }
  }, [status, router, searchTerm, selectedLanguage])

  const fetchVoices = async (page: number = 1, reset: boolean = false) => {
    try {
      if (page === 1) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }

      const params = new URLSearchParams({
        page_size: '12',
        page_number: page.toString(),
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
        
        if (reset || page === 1) {
          setVoices(data.data.items || [])
        } else {
          setVoices(prev => [...prev, ...(data.data.items || [])])
        }
        
        setTotalPages(Math.ceil((data.data.pagination?.total || 0) / 12))
        setCurrentPage(page)
      }
    } catch (error) {
      console.error('Failed to fetch voices:', error)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  const handleLoadMore = () => {
    if (currentPage < totalPages && !isLoadingMore) {
      fetchVoices(currentPage + 1, false)
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
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-16 w-full rounded-md" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-2 flex-1" />
          <Skeleton className="h-4 w-4" />
        </div>
      </div>
    </div>
  )

  if (status === 'loading' || (isLoading && voices.length === 0)) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-20 sm:pt-24 container mx-auto px-4">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">AI Voices</h1>
              <p className="text-muted-foreground">Choose the perfect voice for your audiobook</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-40" />
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(12)].map((_, i) => (
                <VoiceSkeleton key={i} />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20 sm:pt-24 container mx-auto px-4">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Mic className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">My AI Voices</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Manage your personal AI voices created on Fish Audio. 
              These are the voices you can use to generate audiobook narration.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
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
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="it">Italian</SelectItem>
                <SelectItem value="pt">Portuguese</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
                <SelectItem value="ko">Korean</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Voices Grid */}
          {voices.length === 0 && !isLoading ? (
            <div className="text-center py-16">
              <Mic className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No personal voices found</h3>
              <div className="space-y-4">
                <p className="text-muted-foreground max-w-md mx-auto">
                  You don&apos;t have any personal AI voices yet. Create your own voices using Fish Audio to use them for audiobook generation.
                </p>
                <Button
                  onClick={() => window.open('https://fish.audio', '_blank')}
                  size="lg"
                  className="rounded-full px-8"
                >
                  Create Voice on Fish Audio
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {voices.map((voice) => (
                <VoiceCard key={voice._id} voice={voice} />
              ))}
            </div>
          )}

          {/* Load More Button */}
          {voices.length > 0 && currentPage < totalPages && (
            <div className="flex justify-center pt-8">
              <Button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                variant="outline"
                size="lg"
                className="min-w-32"
              >
                {isLoadingMore ? (
                  <>
                    <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  `Load More (${voices.length} of ${totalPages * 12})`
                )}
              </Button>
            </div>
          )}

          {/* Stats */}
          {voices.length > 0 && (
            <div className="text-center text-sm text-muted-foreground py-4 border-t">
              Showing {voices.length} voices • Page {currentPage} of {totalPages}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}