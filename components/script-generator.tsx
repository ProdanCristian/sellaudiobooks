"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {Star, Clock, Loader2, Wand2, AlertCircle, Sparkles, FileText, Ghost, Laugh, Zap, Heart, Target, Edit, Skull, Save, X } from "lucide-react"

interface ScriptGeneratorProps {
  type: "short" | "long"
  onScriptGenerated?: (scripts: string[]) => void
}

interface ScriptResponse {
  scripts: string[]
}

export function ScriptGenerator({ type, onScriptGenerated }: ScriptGeneratorProps) {
  const [prompt, setPrompt] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedTopic, setSelectedTopic] = useState("")
  const [instructions, setInstructions] = useState("")
  const [customScript, setCustomScript] = useState("")
  const [mode, setMode] = useState<"generate" | "optimize">("generate")
  const [scripts, setScripts] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editedScript, setEditedScript] = useState<string>("")
  const [scriptLength, setScriptLength] = useState<number>(
    type === "short" ? 60 : 180
  )

  const targetCharacters = Math.round(scriptLength * 12) 

  // Video topics organized by category
  const videoTopics = [
    // Relationship
    {"topic": "Toxic relationships and breakups", "category": "Relationship", "tone": "Dramatic"},
    {"topic": "Love triangles and jealousy", "category": "Relationship", "tone": "Emotional"},
    {"topic": "Secret crush reveals", "category": "Relationship", "tone": "Sweet"},
    {"topic": "Dating someone with a hidden past", "category": "Relationship", "tone": "Suspenseful"},
    {"topic": "Family disapproving of partner", "category": "Relationship", "tone": "Conflict"},
    {"topic": "Long distance relationship struggles", "category": "Relationship", "tone": "Heartfelt"},
    {"topic": "Finding love after heartbreak", "category": "Relationship", "tone": "Hopeful"},
    {"topic": "Discovering partner's double life", "category": "Relationship", "tone": "Shocking"},
    {"topic": "Workplace romance gone wrong", "category": "Relationship", "tone": "Complicated"},
    {"topic": "Arranged marriage turning into love", "category": "Relationship", "tone": "Transformative"},
    {"topic": "Best friends falling in love", "category": "Relationship", "tone": "Sweet"},
    {"topic": "Social media ruining relationships", "category": "Relationship", "tone": "Modern"},

    // Motivational
    {"topic": "Overcoming failure or rejection", "category": "Motivational", "tone": "Inspiring"},
    {"topic": "Turning trauma into success", "category": "Motivational", "tone": "Empowering"},
    {"topic": "Building something from scratch", "category": "Motivational", "tone": "Uplifting"},
    {"topic": "Self-education after being kicked out", "category": "Motivational", "tone": "Determined"},
    {"topic": "Gaining confidence after years of shame", "category": "Motivational", "tone": "Transformative"},
    {"topic": "From homeless to millionaire journey", "category": "Motivational", "tone": "Triumphant"},
    {"topic": "Overcoming addiction and finding purpose", "category": "Motivational", "tone": "Powerful"},
    {"topic": "Breaking generational cycles", "category": "Motivational", "tone": "Revolutionary"},
    {"topic": "Starting over at 40+ years old", "category": "Motivational", "tone": "Courageous"},
    {"topic": "Proving everyone wrong who doubted you", "category": "Motivational", "tone": "Vindictive"},
    {"topic": "Finding your calling after losing everything", "category": "Motivational", "tone": "Spiritual"},
    {"topic": "Building an empire from a single idea", "category": "Motivational", "tone": "Ambitious"},

    // Horror
    {"topic": "Haunted house with a dark past", "category": "Horror", "tone": "Suspenseful"},
    {"topic": "Possessed objects or cursed items", "category": "Horror", "tone": "Dark"},
    {"topic": "Disappearing people or glitch in reality", "category": "Horror", "tone": "Creepy"},
    {"topic": "You exist in multiple realities", "category": "Horror", "tone": "Paranormal"},
    {"topic": "Being followed by a shadowy figure", "category": "Horror", "tone": "Scary"},
    {"topic": "Urban legends that turned out to be real", "category": "Horror", "tone": "Terrifying"},
    {"topic": "Sleep paralysis demon encounters", "category": "Horror", "tone": "Nightmare"},
    {"topic": "Abandoned places with dark secrets", "category": "Horror", "tone": "Eerie"},
    {"topic": "Ouija board sessions gone wrong", "category": "Horror", "tone": "Demonic"},
    {"topic": "Mirror showing different reflections", "category": "Horror", "tone": "Disturbing"},
    {"topic": "Technology becoming sentient and evil", "category": "Horror", "tone": "Cyber-Horror"},
    {"topic": "Time distortions and temporal anomalies", "category": "Horror", "tone": "Mind-Bending"},

    // Funny
    {"topic": "Pretending to be someone else for fun", "category": "Funny", "tone": "Humorous"},
    {"topic": "Awkward first dates", "category": "Funny", "tone": "Light-hearted"},
    {"topic": "Embarrassing childhood stories", "category": "Funny", "tone": "Nostalgic"},
    {"topic": "Misunderstandings with parents", "category": "Funny", "tone": "Relatable"},
    {"topic": "Trying to impress someone and failing", "category": "Funny", "tone": "Ironic"},
    {"topic": "Epic cooking disasters", "category": "Funny", "tone": "Chaotic"},
    {"topic": "Autocorrect fails that ruined everything", "category": "Funny", "tone": "Cringe"},
    {"topic": "Trying to be cool in front of kids", "category": "Funny", "tone": "Pathetic"},
    {"topic": "Getting lost with GPS navigation", "category": "Funny", "tone": "Absurd"},
    {"topic": "Meeting your online friend in real life", "category": "Funny", "tone": "Awkward"},
    {"topic": "Trying new trends that don't work for you", "category": "Funny", "tone": "Self-Deprecating"},
    {"topic": "Pet causing chaos in important moments", "category": "Funny", "tone": "Endearing"},

    // Tech
    {"topic": "AI taking over your job", "category": "Tech", "tone": "Dystopian"},
    {"topic": "Smart home turning against its owner", "category": "Tech", "tone": "Thriller"},
    {"topic": "Dating app disaster stories", "category": "Tech", "tone": "Satirical"},
    {"topic": "Deepfake ruining your reputation", "category": "Tech", "tone": "Tense"},
    {"topic": "Trapped in a video game", "category": "Tech", "tone": "Sci-Fi"},
    {"topic": "Social media algorithm controlling your life", "category": "Tech", "tone": "Disturbing"},
    {"topic": "Cryptocurrency investment gone wrong", "category": "Tech", "tone": "Dramatic"},
    {"topic": "Virtual reality addiction", "category": "Tech", "tone": "Warning"},
    {"topic": "Robot companions replacing human relationships", "category": "Tech", "tone": "Lonely"},
    {"topic": "Privacy invasion through smart devices", "category": "Tech", "tone": "Paranoid"},
    {"topic": "Digital detox changing your perspective", "category": "Tech", "tone": "Enlightening"},
    {"topic": "Quantum computing breaking reality", "category": "Tech", "tone": "Mind-Blowing"},

    // Psychological
    {"topic": "Being stuck in a time loop", "category": "Psychological", "tone": "Mind-Bending"},
    {"topic": "Memory loss or implanted memories", "category": "Psychological", "tone": "Confusing"},
    {"topic": "Simulation or alternate reality theories", "category": "Psychological", "tone": "Thought-provoking"},
    {"topic": "Fear of losing control over your own actions", "category": "Psychological", "tone": "Disturbing"},
    {"topic": "Hearing voices or seeing visions", "category": "Psychological", "tone": "Paranoia"},
    {"topic": "Déjà vu experiences that feel too real", "category": "Psychological", "tone": "Unsettling"},
    {"topic": "Multiple personality disorder discovery", "category": "Psychological", "tone": "Shocking"},
    {"topic": "Lucid dreaming vs reality confusion", "category": "Psychological", "tone": "Surreal"},
    {"topic": "Gaslighting and psychological manipulation", "category": "Psychological", "tone": "Dark"},
    {"topic": "Existential crisis and meaning of life", "category": "Psychological", "tone": "Deep"},
    {"topic": "Collective unconscious and shared dreams", "category": "Psychological", "tone": "Mystical"},
    {"topic": "Breaking free from mental prison", "category": "Psychological", "tone": "Liberation"},

    // Drama
    {"topic": "Family secrets revealed during a funeral", "category": "Drama", "tone": "Emotional"},
    {"topic": "Public shaming or scandal", "category": "Drama", "tone": "Explosive"},
    {"topic": "Fake friend sabotaging your success", "category": "Drama", "tone": "Tense"},
    {"topic": "Fighting for inheritance", "category": "Drama", "tone": "Intense"},
    {"topic": "Sibling rivalries and betrayals", "category": "Drama", "tone": "Personal"},
    {"topic": "Corporate whistleblowing consequences", "category": "Drama", "tone": "Heroic"},
    {"topic": "Adoption reunion gone wrong", "category": "Drama", "tone": "Heartbreaking"},
    {"topic": "Cheating scandal in small town", "category": "Drama", "tone": "Gossip"},
    {"topic": "Criminal past catching up", "category": "Drama", "tone": "Suspenseful"},
    {"topic": "Identity theft ruining your life", "category": "Drama", "tone": "Stressful"},
    {"topic": "Revenge plot years in the making", "category": "Drama", "tone": "Calculated"},
    {"topic": "Witness protection lifestyle change", "category": "Drama", "tone": "Dangerous"},

    // Fantasy
    {"topic": "Waking up with superpowers", "category": "Fantasy", "tone": "Adventurous"},
    {"topic": "Magical object that changes your life", "category": "Fantasy", "tone": "Mysterious"},
    {"topic": "Parallel universe version of you", "category": "Fantasy", "tone": "Otherworldly"},
    {"topic": "Alien contact or abduction", "category": "Fantasy", "tone": "Surreal"},
    {"topic": "Living in a post-apocalyptic world", "category": "Fantasy", "tone": "Epic"},
    {"topic": "Time travel mission to save the future", "category": "Fantasy", "tone": "Heroic"},
    {"topic": "Dragon bond and ancient prophecy", "category": "Fantasy", "tone": "Legendary"},
    {"topic": "Portal to another dimension in your basement", "category": "Fantasy", "tone": "Discovery"},
    {"topic": "Reincarnation with past life memories", "category": "Fantasy", "tone": "Spiritual"},
    {"topic": "Shapeshifter hiding in plain sight", "category": "Fantasy", "tone": "Secret"},
    {"topic": "Guardian angel assignment", "category": "Fantasy", "tone": "Divine"},
    {"topic": "Curse that skips generations", "category": "Fantasy", "tone": "Ancestral"}
  ]

  // Get unique categories
  const categories = [...new Set(videoTopics.map(item => item.category))]
  
  // Get topics for selected category
  const topicsForCategory = selectedCategory 
    ? videoTopics.filter(item => item.category === selectedCategory)
    : []

  // Category icons
  const categoryIcons = {
    "Relationship": Heart,
    "Motivational": Zap,
    "Horror": Ghost,
    "Funny": Laugh,
    "Tech": Target,
    "Psychological": AlertCircle,
    "Drama": Skull,
    "Fantasy": Star
  }


  const generateScript = async () => {
    if (mode === "generate" && (!selectedTopic && !(selectedCategory === "custom" && prompt.trim()))) return
    if (mode === "optimize" && !customScript.trim()) return

    setIsGenerating(true)
    setError(null)
    try {
      const finalPrompt = selectedCategory === "custom" ? prompt : selectedTopic

      const endpoint = type === "short" ? "/api/generate-script/short" : "/api/generate-script/long"
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          prompt: finalPrompt,
          scriptLength: scriptLength,
          targetCharacters: targetCharacters,
          instructions: instructions,
          mode: mode,
          customScript: customScript
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate script")
      }

      const data: ScriptResponse = await response.json()
      
      
      setScripts(data.scripts || [])
      if (data.scripts && data.scripts.length === 0) {
        setError("No scripts were generated. Please try a different topic or try again later.")
      } else if (data.scripts && data.scripts.length > 0) {
        onScriptGenerated?.(data.scripts)
      }
    } catch (error) {
      console.error("Error generating script:", error)
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
      
      if (errorMessage.includes("empty response")) {
        setError("The AI service is currently experiencing high demand. Please wait a few minutes and try again.")
      } else if (errorMessage.includes("Failed to fetch")) {
        setError("Network error. Please check your internet connection and try again.")
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsGenerating(false)
    }
  }


  const startEditing = (index: number, script: string) => {
    setEditingIndex(index)
    setEditedScript(script)
  }

  const cancelEditing = () => {
    setEditingIndex(null)
    setEditedScript("")
  }

  const saveEditedScript = () => {
    if (editingIndex !== null) {
      const updatedScripts = [...scripts]
      updatedScripts[editingIndex] = editedScript
      setScripts(updatedScripts)
      setEditingIndex(null)
      setEditedScript("")
    }
  }

  const highlightTags = (script: string) => {
    // Regex to match Fish Audio tags: (tag), (tag content), (break), etc.
    const tagRegex = /(\([^)]+\))/g
    
    return script.split(tagRegex).map((part, index) => {
      if (tagRegex.test(part)) {
        // Check if it's a pause tag (break or long-break)
        const isPauseTag = part === "(break)" || part === "(long-break)"
        return (
          <span key={index} className={`font-medium ${isPauseTag ? 'text-blue-500' : 'text-red-500'}`}>
            {part}
          </span>
        )
      }
      return part
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 w-full">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            {type === "short" ? "Short Video" : "Long Video"} Script Generator
          </CardTitle>
          <CardDescription>
            {type === "short" 
              ? "Generate engaging short-form video scripts with voiceover tags, perfect for TikTok, Instagram Reels, and YouTube Shorts"
              : "Create comprehensive long-form video scripts with voiceover tags, ideal for YouTube and educational content"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Selection */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={mode === "generate" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("generate")}
              className="flex-1"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate New
            </Button>
            <Button
              variant={mode === "optimize" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("optimize")}
              className="flex-1"
            >
              <FileText className="w-4 h-4 mr-2" />
              Custom Script
            </Button>
          </div>

          {mode === "generate" ? (
            <>
              {/* Category Selection */}
              <div className="space-y-2">
                <Label htmlFor="category">Video Category</Label>
                <Select value={selectedCategory} onValueChange={(value) => {
                  setSelectedCategory(value)
                  setSelectedTopic("") // Reset topic when category changes
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => {
                      const IconComponent = categoryIcons[category as keyof typeof categoryIcons]
                      return (
                        <SelectItem key={category} value={category}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4" />
                            {category}
                          </div>
                        </SelectItem>
                      )
                    })}
                    <SelectItem value="custom">
                      <div className="flex items-center gap-2">
                        <Edit className="w-4 h-4" />
                        Custom Topic
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Topic Selection */}
              {selectedCategory && selectedCategory !== "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="topic">Video Topic</Label>
                  <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose topic..." />
                    </SelectTrigger>
                    <SelectContent>
                      {topicsForCategory.map((topicItem, index) => (
                        <SelectItem key={index} value={topicItem.topic}>
                          <div className="flex flex-col">
                            <span className="font-medium">{topicItem.topic}</span>
                            <span className="text-xs text-muted-foreground">{topicItem.tone}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Custom Topic Input */}
              {selectedCategory === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="prompt">Custom Topic or Idea</Label>
                  <Textarea
                    id="prompt"
                    placeholder={
                      "e.g., 'A scary story about a haunted house', 'A funny story from school', 'Motivational speech like Andrew Tate or David Goggins'"
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              )}

              {/* Optional Instructions */}
              {(selectedTopic || (selectedCategory === "custom" && prompt.trim())) && (
                <div className="space-y-2">
                  <Label htmlFor="instructions">Additional Instructions (Optional)</Label>
                  <Textarea
                    id="instructions"
                    placeholder="e.g., 'Make it more dramatic', 'Focus on humor', 'Add personal anecdotes', 'Keep it suspenseful'..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide specific guidance for tone, style, or content preferences
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Custom Script Input */
            <div className="space-y-2">
              <Label htmlFor="customScript">Write Your Custom Script</Label>
              <Textarea
                id="customScript"
                placeholder="Write your script here... We'll automatically add voiceover tags like (excited), (pause), (serious) to make it perfect for AI voice generation."
                value={customScript}
                onChange={(e) => setCustomScript(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll add emotion tags, timing cues, and optimize the flow for natural AI voiceover
              </p>
            </div>
          )}
          
          {mode === "generate" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <Label>Video Duration</Label>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{type === "short" ? "30 seconds" : "1 minute"}</span>
                  <span className="font-medium text-foreground">
                    {Math.floor(scriptLength / 60) > 0 ? `${Math.floor(scriptLength / 60)}m ` : ""}
                    {scriptLength % 60}s
                  </span>
                  <span>{type === "short" ? "3 minutes" : "15 minutes"}</span>
                </div>
                <Slider
                  value={[scriptLength]}
                  onValueChange={(value) => setScriptLength(value[0])}
                  min={type === "short" ? 30 : 60}
                  max={type === "short" ? 180 : 900}
                  step={type === "short" ? 15 : 30}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground text-center">
                  Approximately {targetCharacters.toLocaleString()} characters
                </div>
              </div>
            </div>
          )}
          <Button 
            onClick={generateScript}
            disabled={
              (mode === "generate" && (!selectedTopic && !(selectedCategory === "custom" && prompt.trim()))) ||
              (mode === "optimize" && !customScript.trim()) ||
              isGenerating
            }
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {mode === "generate" ? "Generating Scripts..." : "Processing Script..."}
              </>
            ) : (
              <>
                {mode === "generate" ? (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    {type === "short" ? "Generate 3 Script Variations" : "Generate Script"}
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Enhance Script with Voiceover Tags
                  </>
                )}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm font-medium">Error</p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Generated Scripts */}
      {scripts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-foreground">Generated Scripts</h3>
            <div className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
              ✨ Optimized for AI voiceover
            </div>
          </div>
          {scripts.map((script, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Script Version {index + 1}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(index, script)}
                      className="flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span>{script.length.toLocaleString()} characters</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editingIndex === index ? (
                  <div className="space-y-4">
                    <Textarea
                      value={editedScript}
                      onChange={(e) => setEditedScript(e.target.value)}
                      rows={12}
                      className="resize-none font-mono text-sm"
                      placeholder="Edit your script here..."
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={saveEditedScript}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save Changes
                      </Button>
                      <Button
                        onClick={cancelEditing}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-sm text-foreground font-sans bg-muted p-4 rounded-lg">
                      {highlightTags(script)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}