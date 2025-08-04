"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Image, RefreshCw, CheckCircle } from "lucide-react"
import { VideoTimelineEditor } from "./video-timeline-editor"

interface ImageResult {
  index: number
  prompt: string
  imageUrl?: string
  error?: string
  taskId?: string
}

interface ImageGeneratorProps {
  scripts: string[]
  audioDuration?: number // in seconds
  aspectRatio?: string // "16:9" for long videos, "9:16" for short videos
  audioUrl?: string // URL to audio file
  onImagesGenerated?: (images: ImageResult[]) => void
}

export const ImageGenerator = ({ 
  scripts, 
  audioDuration = 60,
  aspectRatio = "16:9",
  audioUrl,
  onImagesGenerated 
}: ImageGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<ImageResult[]>([])
  const [selectedStyle, setSelectedStyle] = useState("2d_art_poster")
  const [progress, setProgress] = useState(0)
  const [currentPrompt, setCurrentPrompt] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const carouselRef = useRef<HTMLDivElement>(null)

  // Calculate number of images needed (one every 5 seconds)
  const numberOfImages = Math.ceil(audioDuration / 5)
  
  // Digital illustration substyles (Recraft V2 & V3)
  const styleOptions = [
    { value: "2d_art_poster", label: "2D Art Poster", category: "Artistic", image: "/style-references/style-2d_art_poster.jpg" },
    { value: "2d_art_poster_2", label: "2D Art Poster 2", category: "Artistic", image: "/style-references/style-2d_art_poster_2.jpg" },
    { value: "3d", label: "3D", category: "Artistic", image: "/style-references/style-3d.jpg" },
    { value: "80s", label: "80s Style", category: "Artistic", image: "/style-references/style-80s.jpg" },
    { value: "antiquarian", label: "Antiquarian", category: "Artistic", image: "/style-references/style-antiquarian.jpg" },
    { value: "bold_fantasy", label: "Bold Fantasy", category: "Artistic", image: "/style-references/style-bold_fantasy.jpg" },
    { value: "child_book", label: "Children's Book", category: "Artistic", image: "/style-references/style-child_book.jpg" },
    { value: "cover", label: "Cover Art", category: "Artistic", image: "/style-references/style-cover.jpg" },
    { value: "crosshatch", label: "Crosshatch", category: "Artistic", image: "/style-references/style-crosshatch.jpg" },
    { value: "digital_engraving", label: "Digital Engraving", category: "Artistic", image: "/style-references/style-digital_engraving.jpg" },
    { value: "engraving_color", label: "Color Engraving", category: "Artistic", image: "/style-references/style-engraving_color.jpg" },
    { value: "expressionism", label: "Expressionism", category: "Artistic", image: "/style-references/style-expressionism.jpg" },
    { value: "pop_art", label: "Pop Art", category: "Artistic", image: "/style-references/style-pop_art.jpg" },
    { value: "pop_renaissance", label: "Pop Renaissance", category: "Artistic", image: "/style-references/style-pop_renaissance.jpg" },
    { value: "psychedelic", label: "Psychedelic", category: "Artistic", image: "/style-references/style-psychedelic.jpg" },
    { value: "street_art", label: "Street Art", category: "Artistic", image: "/style-references/style-street_art.jpg" },
    { value: "watercolor", label: "Watercolor", category: "Artistic", image: "/style-references/style-watercolor.jpg" },
    
    { value: "freehand_details", label: "Freehand Details", category: "Sketch", image: "/style-references/style-freehand_details.jpg" },
    { value: "hand_drawn", label: "Hand Drawn", category: "Sketch", image: "/style-references/style-hand_drawn.jpg" },
    { value: "hand_drawn_outline", label: "Hand Drawn Outline", category: "Sketch", image: "/style-references/style-hand_drawn_outline.jpg" },
    { value: "infantile_sketch", label: "Infantile Sketch", category: "Sketch", image: "/style-references/style-infantile_sketch.jpg" },
    { value: "kawaii", label: "Kawaii", category: "Sketch", image: "/style-references/style-kawaii.jpg" },
    { value: "outline_details", label: "Outline Details", category: "Sketch", image: "/style-references/style-outline_details.jpg" },
    { value: "pastel_sketch", label: "Pastel Sketch", category: "Sketch", image: "/style-references/style-pastel_sketch.jpg" },
    { value: "tablet_sketch", label: "Tablet Sketch", category: "Sketch", image: "/style-references/style-tablet_sketch.jpg" },
    { value: "urban_sketching", label: "Urban Sketching", category: "Sketch", image: "/style-references/style-urban_sketching.jpg" },
    
    { value: "glow", label: "Glow", category: "Effects", image: "/style-references/style-glow.jpg" },
    { value: "grain", label: "Grain", category: "Effects", image: "/style-references/style-grain.jpg" },
    { value: "grain_20", label: "Grain 20", category: "Effects", image: "/style-references/style-grain_20.jpg" },
    { value: "graphic_intensity", label: "Graphic Intensity", category: "Effects", image: "/style-references/style-graphic_intensity.jpg" },
    { value: "handmade_3d", label: "Handmade 3D", category: "Effects", image: "/style-references/style-handmade_3d.jpg" },
    { value: "hard_comics", label: "Hard Comics", category: "Effects", image: "/style-references/style-hard_comics.jpg" },
    { value: "long_shadow", label: "Long Shadow", category: "Effects", image: "/style-references/style-long_shadow.jpg" },
    { value: "neon_calm", label: "Neon Calm", category: "Effects", image: "/style-references/style-neon_calm.jpg" },
    { value: "noir", label: "Noir", category: "Effects", image: "/style-references/style-noir.jpg" },
    { value: "pixel_art", label: "Pixel Art", category: "Effects", image: "/style-references/style-pixel_art.jpg" },
    { value: "plastic", label: "Plastic", category: "Effects", image: "/style-references/style-plastic.jpg" },
    { value: "urban_glow", label: "Urban Glow", category: "Effects", image: "/style-references/style-urban_glow.jpg" },
    { value: "voxel", label: "Voxel", category: "Effects", image: "/style-references/style-voxel.jpg" },
    
    { value: "modern_folk", label: "Modern Folk", category: "Color", image: "/style-references/style-modern_folk.jpg" },
    { value: "multicolor", label: "Multicolor", category: "Color", image: "/style-references/style-multicolor.jpg" },
    { value: "nostalgic_pastel", label: "Nostalgic Pastel", category: "Color", image: "/style-references/style-nostalgic_pastel.jpg" },
    { value: "pastel_gradient", label: "Pastel Gradient", category: "Color", image: "/style-references/style-pastel_gradient.jpg" },
    
    { value: "young_adult_book", label: "Young Adult Book", category: "Book", image: "/style-references/style-young_adult_book.jpg" },
    { value: "young_adult_book_2", label: "Young Adult Book 2", category: "Book", image: "/style-references/style-young_adult_book_2.jpg" },
    
    { value: "seamless", label: "Seamless", category: "Special", image: "/style-references/style-seamless.jpg" }
  ]

  // Filter styles based on active category
  const filteredStyles = activeCategory === "All" 
    ? styleOptions 
    : styleOptions.filter(style => style.category === activeCategory)



  // Generate contextually relevant scene prompts based on script content
  const generateScenePrompts = async (script: string): Promise<string[]> => {
    try {
      // First, try AI-powered prompt generation
      const response = await fetch('/api/generate-scene-prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: script,
          numberOfScenes: numberOfImages,
          aspectRatio: aspectRatio
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.prompts) {
          return result.prompts
        }
      }
    } catch (error) {
      console.warn('AI prompt generation failed, falling back to manual generation:', error)
    }

    // Fallback to enhanced manual prompt generation
    return generateFallbackPrompts(script)
  }

  // Enhanced fallback prompt generation with better context understanding
  const generateFallbackPrompts = (script: string): string[] => {
    // Split script into logical segments
    const sentences = script.split(/[.!?]+/).filter(sentence => sentence.trim().length > 10)
    const segmentsPerImage = Math.ceil(sentences.length / numberOfImages)
    
    const prompts: string[] = []
    
    // Define visual style based on content type and aspect ratio
    const visualStyle = aspectRatio === "9:16" 
      ? "mobile-friendly, portrait orientation, close-up focus"
      : "cinematic wide shot, landscape composition"
    
    for (let i = 0; i < numberOfImages; i++) {
      const startIndex = i * segmentsPerImage
      const endIndex = Math.min((i + 1) * segmentsPerImage, sentences.length)
      const sceneText = sentences.slice(startIndex, endIndex).join('. ').trim()
      
      // Analyze content for visual elements
      const visualPrompt = createContextualPrompt(sceneText, i, numberOfImages, visualStyle)
      prompts.push(visualPrompt)
    }
    
    return prompts
  }

  // Create contextual visual prompts based on content analysis
  const createContextualPrompt = (text: string, sceneIndex: number, totalScenes: number, visualStyle: string): string => {
    // Extract key concepts and themes
    const lowerText = text.toLowerCase()
    
    // Determine scene type and visual elements
    let sceneType = "abstract concept visualization"
    let visualElements: string[] = []
    let mood = "professional, clean"
    let setting = "modern, minimalist background"
    
    // Business/Finance content
    if (lowerText.includes('business') || lowerText.includes('money') || lowerText.includes('finance') || 
        lowerText.includes('profit') || lowerText.includes('investment') || lowerText.includes('market')) {
      sceneType = "business and finance"
      visualElements = ["charts", "graphs", "business people", "office environment", "financial symbols"]
      setting = "modern office, conference room, or financial district"
    }
    
    // Technology content
    else if (lowerText.includes('technology') || lowerText.includes('digital') || lowerText.includes('ai') || 
             lowerText.includes('computer') || lowerText.includes('data') || lowerText.includes('software')) {
      sceneType = "technology and innovation"
      visualElements = ["computers", "digital interfaces", "code", "futuristic elements", "tech workspace"]
      setting = "modern tech office, data center, or futuristic environment"
    }
    
    // Health/Fitness content
    else if (lowerText.includes('health') || lowerText.includes('fitness') || lowerText.includes('exercise') || 
             lowerText.includes('nutrition') || lowerText.includes('wellness') || lowerText.includes('medical')) {
      sceneType = "health and wellness"
      visualElements = ["healthy lifestyle", "exercise equipment", "nutritious food", "medical symbols", "wellness imagery"]
      setting = "gym, kitchen, medical facility, or outdoor nature setting"
    }
    
    // Education content
    else if (lowerText.includes('learn') || lowerText.includes('education') || lowerText.includes('study') || 
             lowerText.includes('knowledge') || lowerText.includes('skill') || lowerText.includes('course')) {
      sceneType = "education and learning"
      visualElements = ["books", "classroom", "students", "teacher", "educational materials"]
      setting = "classroom, library, study environment, or online learning setup"
    }
    
    // Success/Motivation content
    else if (lowerText.includes('success') || lowerText.includes('goal') || lowerText.includes('achieve') || 
             lowerText.includes('motivation') || lowerText.includes('growth') || lowerText.includes('improve')) {
      sceneType = "success and motivation"
      visualElements = ["upward arrows", "achievement symbols", "goal visualization", "progress indicators"]
      setting = "inspiring environment, mountain peaks, or achievement celebration"
      mood = "inspiring, uplifting, energetic"
    }
    
    // Travel content
    else if (lowerText.includes('travel') || lowerText.includes('journey') || lowerText.includes('destination') || 
             lowerText.includes('explore') || lowerText.includes('adventure') || lowerText.includes('vacation')) {
      sceneType = "travel and exploration"
      visualElements = ["landscapes", "landmarks", "transportation", "adventure gear", "cultural elements"]
      setting = "exotic locations, natural landscapes, or travel destinations"
    }
    
    // Food/Cooking content
    else if (lowerText.includes('food') || lowerText.includes('cooking') || lowerText.includes('recipe') || 
             lowerText.includes('kitchen') || lowerText.includes('meal') || lowerText.includes('restaurant')) {
      sceneType = "food and culinary"
      visualElements = ["delicious food", "cooking utensils", "kitchen environment", "ingredients", "dining"]
      setting = "modern kitchen, restaurant, or food photography setup"
    }
    
    // Lifestyle content
    else if (lowerText.includes('lifestyle') || lowerText.includes('daily') || lowerText.includes('routine') || 
             lowerText.includes('home') || lowerText.includes('family') || lowerText.includes('life')) {
      sceneType = "lifestyle and daily life"
      visualElements = ["modern lifestyle", "home environment", "people in natural settings", "daily activities"]
      setting = "contemporary home, urban environment, or lifestyle photography"
    }
    
    // Self-improvement content
    else if (lowerText.includes('mindset') || lowerText.includes('habit') || lowerText.includes('productivity') || 
             lowerText.includes('focus') || lowerText.includes('discipline') || lowerText.includes('personal')) {
      sceneType = "personal development"
      visualElements = ["focus symbols", "growth metaphors", "peaceful environments", "productivity tools"]
      setting = "serene workspace, nature, or minimalist environment"
      mood = "calm, focused, inspirational"
    }

    // Create progression narrative
    let progression = ""
    if (sceneIndex === 0) {
      progression = "opening scene, introduction,"
    } else if (sceneIndex === totalScenes - 1) {
      progression = "conclusion scene, final impact,"
    } else {
      progression = `scene ${sceneIndex + 1} of ${totalScenes},`
    }

    // Build the final prompt
    const finalPrompt = `${progression} ${sceneType} visualization: ${visualElements.slice(0, 2).join(' and ')} in ${setting}. ${visualStyle}, ${mood}, professional photography, high quality, detailed, engaging composition, perfect lighting`

    return finalPrompt
  }

  const handleGenerateImages = async () => {
    if (scripts.length === 0) return

    setIsGenerating(true)
    setProgress(0)
    setGeneratedImages([])

    try {
      // Use the first script for scene generation
      const mainScript = scripts[0]
      setCurrentPrompt("Analyzing script and generating contextual prompts...")
      const scenePrompts = await generateScenePrompts(mainScript)
      
      // Log the generated prompts for debugging
      console.log('Generated scene prompts:', scenePrompts)

      setCurrentPrompt("Generating scene images...")

      const response = await fetch('/api/generate-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompts: scenePrompts,
          style: selectedStyle,
          aspectRatio: aspectRatio
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate images')
      }

      const result = await response.json()
      
      if (result.success) {
        setGeneratedImages(result.images)
        if (onImagesGenerated) {
          onImagesGenerated(result.images)
        }
      } else {
        throw new Error(result.error || 'Image generation failed')
      }

    } catch (error) {
      console.error('Error generating images:', error)
      // Handle error state
    } finally {
      setIsGenerating(false)
      setProgress(100)
      setCurrentPrompt("")
    }
  }


  const successfulImages = generatedImages.filter(img => img.imageUrl)
  const failedImages = generatedImages.filter(img => img.error)

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <CardTitle>Scene Image Generation</CardTitle>
            <CardDescription>
              Generate {numberOfImages} scene images for your {Math.round(audioDuration)}s voiceover track
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Configuration */}
        <div className="space-y-6">
          {/* Style Selection Carousel */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium">Visual Style</label>
              <div className="text-xs text-muted-foreground">
                {(() => {
                  const selectedStyleOption = styleOptions.find(s => s.value === selectedStyle);
                  return selectedStyleOption ? `${selectedStyleOption.label} • ${selectedStyleOption.category}` : 'Select a style';
                })()}
              </div>
            </div>
            
            {/* Category Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 cursor-pointer">
              {["All", "Artistic", "Sketch", "Effects", "Color", "Book", "Special"].map((category) => {
                const isActive = activeCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`
                      whitespace-nowrap px-3 py-1 text-xs rounded-full transition-colors
                      ${isActive 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-muted hover:bg-muted/80'
                      }
                    `}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            {/* Styles Carousel */}
            <div className="relative group">
              

              {/* Carousel */}
              <div 
                ref={carouselRef}
                className="p-2 flex gap-4 overflow-x-auto pb-4 scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-muted/20 [&::-webkit-scrollbar-thumb]:bg-muted [&::-webkit-scrollbar-thumb]:rounded-full px-1"
              >
                {filteredStyles.map((style) => {
                  const isSelected = selectedStyle === style.value;
                  return (
                    <div
                      key={style.value}
                      onClick={() => setSelectedStyle(style.value)}
                      className={`
                        relative flex-shrink-0 cursor-pointer group/item transition-all duration-200
                        ${isSelected ? 'scale-105' : 'hover:scale-102'}
                      `}
                    >
                      <div className={`
                        w-28 h-28 rounded-xl overflow-hidden bg-muted transition-all duration-200
                        ${isSelected 
                          ? 'border-2 border-blue-500 shadow-lg shadow-blue-500/25' 
                          : 'border border-border shadow-sm hover:shadow-md'
                        }
                      `}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={style.image} 
                          alt={style.label}
                          className="w-full h-full object-cover transition-transform group-hover/item:scale-105"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiA5VjEzTTEyIDE3SDE2TDggMTdIMTJaIiBzdHJva2U9IiM5CA0YTE0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K';
                          }}
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center rounded-xl">
                            <CheckCircle className="w-7 h-7 text-blue-500 drop-shadow-md" />
                          </div>
                        )}
                      </div>
                      
                      {/* Style Label */}
                      <div className="mt-2 text-center">
                        <p className="text-xs font-medium truncate w-28" title={style.label}>
                          {style.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {style.category}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>



          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm font-medium">Generation Plan</p>
              <p className="text-xs text-muted-foreground">
                {numberOfImages} images • One every 5 seconds • {aspectRatio} aspect ratio
              </p>
            </div>
            <Badge variant="secondary">{Math.round(audioDuration)}s voiceover</Badge>
          </div>
        </div>

        {/* Generate Button */}
        <Button 
          onClick={handleGenerateImages}
          disabled={isGenerating || scripts.length === 0}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generating Images...
            </>
          ) : (
            <>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image className="w-4 h-4 mr-2" />
              Generate Scene Images
            </>
          )}
        </Button>

        {/* Progress */}
        {isGenerating && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            {currentPrompt && (
              <p className="text-sm text-muted-foreground text-center">
                {currentPrompt}
              </p>
            )}
          </div>
        )}

        {/* Generation Summary - Hidden Images */}
        {generatedImages.length > 0 && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Images Generated Successfully</p>
                <p className="text-xs text-muted-foreground">
                  {successfulImages.length}/{generatedImages.length} scenes ready for timeline
                </p>
              </div>
              <Badge variant={failedImages.length > 0 ? "destructive" : "default"}>
                {successfulImages.length} scenes
              </Badge>
            </div>
          </div>
        )}

        {/* Video Timeline Editor */}
        {generatedImages.length > 0 && successfulImages.length > 0 && (
          <div className="mt-8">
            <VideoTimelineEditor 
              images={generatedImages}
              audioDuration={audioDuration}
              audioUrl={audioUrl || undefined}
              aspectRatio={aspectRatio}
              onExportVideo={() => {
                // Handle video export logic here
                console.log('Exporting video with images:', successfulImages.length)
                console.log('Audio duration:', audioDuration)
                console.log('Voiceover URL:', audioUrl)
                console.log('Aspect ratio:', aspectRatio)
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}