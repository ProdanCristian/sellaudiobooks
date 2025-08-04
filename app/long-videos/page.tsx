"use client"

import { useState } from "react"
import DashboardHeader from "@/components/dashboard-header"
import { ScriptGenerator } from "@/components/script-generator"
import { VoiceGenerator } from "@/components/voice-generator"
import { ImageGenerator } from "@/components/image-generator"
import { StepsProgress, StepBadge } from "@/components/steps-progress"
import { Youtube, Video, Image } from "lucide-react"

const LongVideos = () => {
  const [currentStep, setCurrentStep] = useState(0)
  const [showScrollHint, setShowScrollHint] = useState(false)
  const [generatedScripts, setGeneratedScripts] = useState<string[]>([])
  const [audioUrl, setAudioUrl] = useState<string>("")
  const [audioDuration, setAudioDuration] = useState<number>(0)
  const [generatedImages, setGeneratedImages] = useState<any[]>([])
  
  // Progress tracking helper
  const updateProgress = (step: number) => {
    setCurrentStep(step)
    // Show scroll hint for 3 seconds
    setShowScrollHint(true)
    setTimeout(() => setShowScrollHint(false), 3000)
  }

  const handleScriptGenerated = (scripts: string[]) => {
    if (scripts.length > 0) {
      setGeneratedScripts(scripts)
      updateProgress(1)
    }
  }

  const handleVoiceGenerated = (url: string, duration: number) => {
    // Voice generated successfully, store audio data and move to next step
    setAudioUrl(url)
    setAudioDuration(duration)
    updateProgress(2)
  }

  const handleImagesGenerated = (images: any[]) => {
    // Images generated successfully, move to next step
    setGeneratedImages(images)
    updateProgress(3)
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      {/* Progress Indicator */}
      <StepsProgress currentStep={currentStep} showScrollHint={showScrollHint} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 sm:pt-24">
        {/* Header */}
        <div className="text-center mb-8 mt-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-12 w-12 bg-red-500/20 rounded-xl flex items-center justify-center">
              <Youtube className="w-6 h-6 text-red-500" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Long Format Videos
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Create comprehensive long-form video scripts perfect for YouTube and educational content
          </p>
        </div>

        {/* Content based on current step */}
        <div className="space-y-8">
          {/* Step 1: Script Generator - Always editable */}
          {currentStep >= 0 && (
            <div className="relative">
              {/* Step Number Badge */}
              <StepBadge stepNumber={1} currentStep={currentStep} />
              <ScriptGenerator 
                type="long" 
                onScriptGenerated={handleScriptGenerated}
              />
            </div>
          )}

          {/* Step 2: Voice Generator - Always editable once available */}
          {currentStep >= 1 && (
            <div className="relative">
              {/* Step Number Badge */}
              <StepBadge stepNumber={2} currentStep={currentStep} />
              <VoiceGenerator 
                scripts={generatedScripts}
                onVoiceGenerated={handleVoiceGenerated}
              />
            </div>
          )}

          {/* Step 3: Image Generator */}
          {currentStep >= 2 && (
            <div className="relative">
              {/* Step Number Badge */}
              <StepBadge stepNumber={3} currentStep={currentStep} />
              <ImageGenerator 
                scripts={generatedScripts}
                audioDuration={audioDuration}
                aspectRatio="16:9"
                audioUrl={audioUrl}
                onImagesGenerated={handleImagesGenerated}
              />
            </div>
          )}

          {/* Step 4: Video Generator (placeholder) */}
          {currentStep >= 3 && (
            <div className="relative max-w-4xl mx-auto">
              {/* Step Number Badge */}
              <StepBadge stepNumber={4} currentStep={currentStep} />
              <div className="text-center p-12 border-2 border-dashed border-muted-foreground/30 rounded-lg">
                <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Video Generation</h3>
                <p className="text-muted-foreground">
                  Video generation feature coming soon! Your script and voice are ready.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default LongVideos