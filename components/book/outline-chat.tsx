'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bot, User, Send, CheckCircle2, Lightbulb } from "lucide-react"
import { AIResponse } from "@/components/shared/ai-response"
import { TextShimmer } from "@/components/motion-primitives/text-shimmer"

interface Book {
  id: string
  title: string
  genre?: string
  targetAudience?: string
  customInstructions?: string
}

interface OutlineChatProps {
  book: Book
  onOutlineCreated: () => void
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: {
    isStreaming?: boolean
    wordCount?: number
    outlineGenerated?: boolean
  }
}

export function OutlineChat({ book, onOutlineCreated }: OutlineChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [isCreatingOutline, setIsCreatingOutline] = useState(false)

  // Initialize with enhanced welcome message only once
  useEffect(() => {
    // Only initialize if messages is empty to prevent flickering
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'outline-welcome',
        role: 'assistant',
        content: `I'll help you create a structured outline for **"${book.title}"**! 📖

## About Your Book:
${book.genre ? `**Genre:** ${book.genre}` : ''}
${book.targetAudience ? `**Target Audience:** ${book.targetAudience}` : ''}
${book.customInstructions ? `**Special Instructions:** ${book.customInstructions}` : ''}

## What I Can Help With:
- 🎯 **Generate Complete Outline** - Full chapter-by-chapter structure
- 💡 **Brainstorm Ideas** - Discuss themes, structure, and flow  
- 📝 **Refine Content** - Adjust chapters and key points
- ✨ **Writing Tips** - Genre-specific guidance and best practices

I focus on creating meaningful chapters that build your story or content progressively. The new format will follow: **Introduction → Chapter 1, 2, 3... → Conclusion** structure.

**Quick Start:** Just say *"generate a complete outline"* or tell me your ideas!`,
        timestamp: new Date(),
      }
      setMessages([welcomeMessage])
    }
  }, []) // Remove dependencies to prevent re-initialization

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)
    setIsCreatingOutline(false)

    const assistantMessageId = `assistant_${Date.now()}`
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      metadata: { isStreaming: true }
    }

    setMessages(prev => [...prev, assistantMessage])

    try {
      const response = await fetch('/api/chat/outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: book.title,
          genre: book.genre || '',
          targetAudience: book.targetAudience || '',
          message: inputMessage.trim(),
          chatHistory: messages.slice(1).map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          currentChapters: []
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)

            if (data === '[DONE]') {
              setIsLoading(false)
              setIsCreatingOutline(false)

              // Update message metadata when streaming is complete
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantMessageId
                    ? {
                      ...msg,
                      metadata: {
                        ...msg.metadata,
                        isStreaming: false,
                        wordCount: msg.content.split(/\s+/).filter(w => w.length > 0).length
                      }
                    }
                    : msg
                )
              )
              break
            }

            try {
              const parsed = JSON.parse(data)

              // Check for create outline signal
              if (parsed.createOutline) {
                setIsCreatingOutline(true)
                // Clear any "Creating your" text that might have been added
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: msg.content.replace(/Creating your.*$/i, '').trim() }
                      : msg
                  )
                )
              } else if (parsed.content && !isCreatingOutline) {
                // Only add regular content before outline creation starts
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: msg.content + parsed.content }
                      : msg
                  )
                )
              }

              // Handle outline JSON if present
              if (parsed.outline) {
                setIsCreatingOutline(true)
                // Update message to show outline was generated
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, metadata: { ...msg.metadata, outlineGenerated: true } }
                      : msg
                  )
                )
                // Save the outline and create chapters automatically
                await saveOutlineAndCreateChapters(parsed.outline)
                setIsCreatingOutline(false)
              }
            } catch {
              // Skip invalid JSON chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: "I'm having trouble connecting right now. Please try again in a moment! 🔄" }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
      setIsCreatingOutline(false)
    }
  }

  const saveOutlineAndCreateChapters = async (outlineData: any) => {
    try {
      console.log('Starting to save outline and create chapters for:', book.title)
      console.log('Outline data:', outlineData)
      
      // First save the outline
      const outlineResponse = await fetch(`/api/books/${book.id}/outline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(outlineData),
      })

      if (!outlineResponse.ok) {
        const errorData = await outlineResponse.text()
        console.error('Failed to save outline:', errorData)
        throw new Error('Failed to save outline')
      }
      
      console.log('Outline saved successfully')

      // Then create chapters from the outline
      if (outlineData.chapters && Array.isArray(outlineData.chapters)) {
        const chapterPromises = []
        
        for (let i = 0; i < outlineData.chapters.length; i++) {
          const outlineChapter = outlineData.chapters[i]
          
          // Generate initial chapter content based on outline
          const initialContent = generateInitialChapterContent(outlineChapter)
          
          // Create chapter with explicit order to avoid conflicts
          chapterPromises.push(
            fetch(`/api/books/${book.id}/chapters`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: outlineChapter.title,
                content: initialContent,
                order: i + 1  // Add explicit order back
              }),
            }).then(async (response) => {
              if (!response.ok) {
                const errorData = await response.text().catch(() => 'Unknown error')
                console.error(`Failed to create chapter ${i + 1}:`, outlineChapter.title, errorData)
                return null
              } else {
                const chapterData = await response.json()
                console.log(`Successfully created chapter ${i + 1}:`, chapterData.title)
                return chapterData
              }
            }).catch((error) => {
              console.error(`Error creating chapter ${i + 1}:`, outlineChapter.title, error)
              return null
            })
          )
        }
        
        // Wait for all chapters to be created
        const results = await Promise.all(chapterPromises)
        const successfulChapters = results.filter(Boolean)
        console.log(`Created ${successfulChapters.length} out of ${outlineData.chapters.length} chapters`)
      }

      // Notify parent that outline and chapters were created
      onOutlineCreated()
    } catch (error) {
      console.error('Error saving outline and creating chapters:', error)
    }
  }

  // Helper function to generate initial chapter content based on outline
  const generateInitialChapterContent = (outlineChapter: any): string => {
    const keyPointsList = outlineChapter.keyPoints
      ?.map((point: string) => `<li>${point}</li>`)
      .join('') || ''

    return `<p><strong>Chapter Overview:</strong> ${outlineChapter.description || 'This chapter needs content.'}</p>

<h2>Key Topics to Cover:</h2>
<ul>
${keyPointsList}
</ul>

<p><em>This chapter is ready for writing. Click here to start adding your content...</em></p>`
  }


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const quickPrompts = [
    "Generate a complete outline",
    "What structure works best for my genre?",
    "Help me brainstorm chapter ideas",
    "How many chapters should I have?"
  ]

  return (
    <div className="w-full mx-auto px-4 space-y-6">
      {/* Simple Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold">Create Your Book Outline</h1>
        <p className="text-muted-foreground">
          Let's build a structured outline for <span className="font-semibold text-primary">"{book.title}"</span> that will guide your writing journey.
        </p>
      </div>

      {/* Quick Start Prompts */}
      {messages.length === 1 && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">Get started with these quick options:</p>
          </div>
          <div className="space-y-3">
            {quickPrompts.map((prompt, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={async () => {
                  setInputMessage('')

                  const userMessage: Message = {
                    id: `user_${Date.now()}`,
                    role: 'user',
                    content: prompt,
                    timestamp: new Date(),
                  }

                  setMessages(prev => [...prev, userMessage])
                  setIsLoading(true)
                  setIsCreatingOutline(false)

                  const assistantMessageId = `assistant_${Date.now()}`
                  const assistantMessage: Message = {
                    id: assistantMessageId,
                    role: 'assistant',
                    content: '',
                    timestamp: new Date(),
                    metadata: { isStreaming: true }
                  }

                  setMessages(prev => [...prev, assistantMessage])

                  try {
                    const response = await fetch('/api/chat/outline', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        title: book.title,
                        genre: book.genre || '',
                        targetAudience: book.targetAudience || '',
                        message: prompt,
                        chatHistory: messages.slice(1).map(msg => ({
                          role: msg.role,
                          content: msg.content
                        })),
                        currentChapters: []
                      }),
                    })

                    if (!response.ok || !response.body) {
                      throw new Error('Failed to get response')
                    }

                    const reader = response.body.getReader()
                    const decoder = new TextDecoder()

                    while (true) {
                      const { done, value } = await reader.read()
                      if (done) break

                      const chunk = decoder.decode(value)
                      const lines = chunk.split('\n')

                      for (const line of lines) {
                        if (line.startsWith('data: ')) {
                          const data = line.slice(6)

                          if (data === '[DONE]') {
                            setIsLoading(false)
                            setIsCreatingOutline(false)

                            setMessages(prev =>
                              prev.map(msg =>
                                msg.id === assistantMessageId
                                  ? {
                                    ...msg,
                                    metadata: {
                                      ...msg.metadata,
                                      isStreaming: false,
                                      wordCount: msg.content.split(/\s+/).filter(w => w.length > 0).length
                                    }
                                  }
                                  : msg
                              )
                            )
                            break
                          }

                          try {
                            const parsed = JSON.parse(data)

                            // Check for create outline signal
                            if (parsed.createOutline) {
                              setIsCreatingOutline(true)
                              // Clear any "Creating your" text that might have been added
                              setMessages(prev =>
                                prev.map(msg =>
                                  msg.id === assistantMessageId
                                    ? { ...msg, content: msg.content.replace(/Creating your.*$/i, '').trim() }
                                    : msg
                                )
                              )
                            } else if (parsed.content && !isCreatingOutline) {
                              // Only add regular content before outline creation starts
                              setMessages(prev =>
                                prev.map(msg =>
                                  msg.id === assistantMessageId
                                    ? { ...msg, content: msg.content + parsed.content }
                                    : msg
                                )
                              )
                            }

                            if (parsed.outline) {
                              setIsCreatingOutline(true)
                              setMessages(prev =>
                                prev.map(msg =>
                                  msg.id === assistantMessageId
                                    ? { ...msg, metadata: { ...msg.metadata, outlineGenerated: true } }
                                    : msg
                                )
                              )
                              await saveOutlineAndCreateChapters(parsed.outline)
                              setIsCreatingOutline(false)
                            }
                          } catch {
                            // Skip invalid JSON chunks
                          }
                        }
                      }
                    }
                  } catch (error) {
                    console.error('Error sending message:', error)
                    setMessages(prev =>
                      prev.map(msg =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: "I'm having trouble connecting right now. Please try again in a moment! 🔄" }
                          : msg
                      )
                    )
                  } finally {
                    setIsLoading(false)
                    setIsCreatingOutline(false)
                  }
                }}
                className="w-full p-4 h-auto text-left justify-start hover:bg-primary/5 border-1 hover:border-primary/50 transition-all duration-300"
                disabled={isLoading}
              >
                <div className="text-sm font-medium">{prompt}</div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      {messages.length > 1 && (
        <div className="space-y-6">
          {messages.slice(1).map((message) => (
            <div key={message.id} className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && (
                <div className="flex items-start justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex-shrink-0 shadow-md">
                  <Bot className="h-5 w-5 text-white mt-2.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-6 py-4 shadow-sm ${message.role === 'user'
                  ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground ml-14'
                  : 'bg-gradient-to-br from-muted/60 to-muted border border-border/50'
                  }`}
              >
                {message.role === 'assistant' ? (
                  <>
                    {message.content ? (
                      <AIResponse className="text-sm leading-relaxed">
                        {message.content}
                      </AIResponse>
                    ) : isCreatingOutline ? (
                      <div className="flex items-center gap-3 py-4">
                        <Lightbulb className="h-5 w-5 text-primary animate-pulse" />
                        <TextShimmer className="text-sm font-medium text-muted-foreground">
                          Creating your outline...
                        </TextShimmer>
                      </div>
                    ) : (
                      <TextShimmer className="text-sm text-muted-foreground">
                        AI thinking...
                      </TextShimmer>
                    )}

                    {/* Message metadata */}
                    {message.metadata?.outlineGenerated && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <div className="flex items-center gap-2 text-xs text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="font-medium">Outline and chapters created successfully! You can now start writing.</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                )}
              </div>

              {message.role === 'user' && (
                <div className="flex items-start justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex-shrink-0 shadow-md">
                  <User className="h-5 w-5 text-white mt-2.5" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input Section */}
      <div className="relative">
        <Input
          type="text"
          value={isLoading ? "" : inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-12 sm:h-14 md:h-16 pl-6 pr-20 sm:pr-24 rounded-full border focus:border-primary transition-all duration-300 md:text-base"
          placeholder={isLoading ? "" : "Ask me to generate an outline, discuss structure, or share your ideas..."}
          disabled={isLoading}
        />
        {isLoading && (
          <div className="pointer-events-none absolute inset-y-0 left-6 flex items-center pr-16 sm:pr-20 md:pr-24 max-w-[75%] sm:max-w-[80%] md:max-w-[85%] overflow-hidden">
            <TextShimmer className="text-base text-muted-foreground/70">
              AI thinking...
            </TextShimmer>
          </div>
        )}
        <div className="absolute top-1/2 right-2 sm:right-3 -translate-y-1/2 flex gap-1">
          <Button
            type="submit"
            onClick={sendMessage}
            size="sm"
            variant={inputMessage.trim() ? "default" : "ghost"}
            className="rounded-full w-8 h-8 sm:w-9 sm:h-9"
            disabled={!inputMessage.trim() || isLoading}
          >
            <Send className="shrink-0 w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>
      </div>

      {/* Powered by footer */}
      <div className="flex items-center justify-center gap-2 pt-4">
        <img
          src="/Gpt.svg"
          alt="GPT Logo"
          className="w-4 h-4 opacity-70"
        />
        <span className="text-xs text-muted-foreground/70">
          Powered by GPT 5
        </span>
      </div>
    </div>
  )
}