"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TextShimmer } from '@/components/motion-primitives/text-shimmer'
import { AIResponse } from '@/components/ai-response'
import {
  Send,
  Bot,
  User,
  Sparkles,
  Mic,
  MicOff,
  Paperclip,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: {
    isStreaming?: boolean
    wordCount?: number
    suggestions?: string[]
    topic?: WritingTopic
    hidden?: boolean
  }
}

enum WritingTopic {
  INTRODUCTION = 'introduction',
  CHAPTER_WRITING = 'chapter_writing',
  STYLE_IMPROVEMENT = 'style_improvement',
  STRUCTURE_GUIDANCE = 'structure_guidance',
  CREATIVE_IDEAS = 'creative_ideas'
}

interface AIBranch {
  conversationId: string
  context: WritingChatProps['bookContext']
  history: Message[]
  currentTopic: WritingTopic
}

interface WritingChatProps {
  bookContext: {
    title: string
    genre?: string
    targetAudience?: string
    customInstructions?: string
    currentContent?: string
    fullIntroduction?: string
    fullConclusion?: string
    chapters?: Array<{
      id: string
      title: string
      content: string
      order: number
      wordCount: number
    }>
  }
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  isLoading: boolean
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  streamingMessageId: string | null
  setStreamingMessageId: React.Dispatch<React.SetStateAction<string | null>>
  onContentGenerated?: (content: string) => void
  hasExistingContent?: boolean
  collapsed?: boolean
  onCollapsedChange?: (value: boolean) => void
  mode?: 'intro' | 'chapter' | 'conclusion'
  headerContext?: string
}

export default function WritingChat({
  bookContext,
  messages,
  setMessages,
  isLoading,
  setIsLoading,
  streamingMessageId,
  setStreamingMessageId,
  onContentGenerated,
  hasExistingContent = false,
  collapsed: collapsedProp,
  onCollapsedChange,
  mode = 'intro',
  headerContext
}: WritingChatProps) {
  const [inputMessage, setInputMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [searchMode, setSearchMode] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [createButtonClicked, setCreateButtonClicked] = useState(false)

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const chatCardRef = useRef<HTMLDivElement>(null)

  // Support controlled collapsed state from parent
  const collapsed = (typeof collapsedProp === 'boolean') ? collapsedProp : isCollapsed
  const updateCollapsed = (next: boolean) => {
    if (typeof onCollapsedChange === 'function') {
      onCollapsedChange(next)
    } else {
      setIsCollapsed(next)
    }
  }

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-expand when generating/streaming
  const isStreaming = Boolean(streamingMessageId)
  const isActive = isLoading || isStreaming
  useEffect(() => {
    if (isActive) {
      updateCollapsed(false)
    }
  }, [isActive])

  // Auto-collapse when there's existing content in the editor (only on initial load, not after chat interactions)
  useEffect(() => {
    if (hasExistingContent && !isActive && messages.length <= 1) {
      updateCollapsed(true)
    }
  }, [hasExistingContent, isActive])

  // Auto-collapse when switching to a chapter with existing content (only on initial load, not after chat interactions)
  useEffect(() => {
    if (mode === 'chapter' && hasExistingContent && !isActive && messages.length <= 1) {
      updateCollapsed(true)
    }
  }, [mode, headerContext, hasExistingContent, isActive])


  // Expose reserved bottom space via CSS variable so the page can add padding-bottom (measured for accuracy)
  useEffect(() => {
    const updateReserved = () => {
      const el = chatCardRef.current
      if (el) {
        const rect = el.getBoundingClientRect()
        const reservedPx = `${Math.ceil(rect.height + 48)}px` // extra buffer
        document.documentElement.style.setProperty('--writing-chat-reserved', reservedPx)
      } else {
        const fallback = (collapsed && !isActive) ? '260px' : '80vh'
        document.documentElement.style.setProperty('--writing-chat-reserved', fallback)
      }
    }
    updateReserved()
    let ro: ResizeObserver | null = null
    if (chatCardRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateReserved())
      ro.observe(chatCardRef.current)
    }
    window.addEventListener('resize', updateReserved)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', updateReserved)
      document.documentElement.style.removeProperty('--writing-chat-reserved')
    }
  }, [collapsed, isActive])

  // Click outside to collapse chat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatCardRef.current && !chatCardRef.current.contains(event.target as Node)) {
        // Only auto-collapse if not loading/streaming and not already collapsed
        if (!isActive && !collapsed) {
          updateCollapsed(true)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isActive, collapsed, updateCollapsed])

  // Initialize speech recognition
  useEffect(() => {
    let recognitionInstance: SpeechRecognition | null = null

    const initializeRecognition = () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognition) {
        recognitionInstance = new SpeechRecognition()
        recognitionInstance.continuous = true
        recognitionInstance.interimResults = true
        recognitionInstance.lang = 'en-US'
        recognitionInstance.maxAlternatives = 1

        recognitionInstance.onstart = () => {
          setIsListening(true)
          setIsRecording(true)
        }

        recognitionInstance.onresult = (event) => {
          let transcript = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript
          }
          setInputMessage(transcript)
        }

        recognitionInstance.onerror = (event) => {
          console.log('Speech recognition error:', event.error)
          setIsListening(false)
          setIsRecording(false)

          if (event.error === 'not-allowed') {
            alert('Microphone access denied. Please allow microphone permissions and try again.')
          } else if (event.error === 'network') {
            console.log('Network error - speech recognition may not work offline')
          }
        }

        recognitionInstance.onend = () => {
          console.log('Speech recognition ended')
          // Only stop if user manually stopped it, otherwise restart
          if (isListening) {
            console.log('Attempting to restart recognition...')
            setTimeout(() => {
              if (recognitionInstance && isListening) {
                try {
                  recognitionInstance.start()
                } catch (error) {
                  console.log('Failed to restart recognition:', error)
                  setIsListening(false)
                  setIsRecording(false)
                }
              }
            }, 100)
          } else {
            setIsListening(false)
            setIsRecording(false)
          }
        }

        setRecognition(recognitionInstance)
      }
    }

    // Only initialize on client side
    if (typeof window !== 'undefined') {
      initializeRecognition()
    }

    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop()
      }
    }
  }, [])


  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    // Detect writing topic and update AI branch
    const detectedTopic = detectWritingTopic(inputMessage)

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
      metadata: {
        topic: detectedTopic,
      }
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    // Create a placeholder assistant message for streaming
    const assistantMessageId = `assistant_${Date.now()}`
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      metadata: {
        isStreaming: true,
        topic: detectedTopic,
      }
    }


    setMessages(prev => [...prev, assistantMessage])
    setStreamingMessageId(assistantMessageId)

    try {
      const response = await fetch('/api/writing-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          bookContext: {
            ...bookContext,
            currentSection: mode,
            currentSectionTitle: headerContext
          },
          conversationHistory: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          enableWebSearch: searchMode
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      if (!response.body) {
        throw new Error('No response body')
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
              setStreamingMessageId(null)

              // Update message metadata when streaming is complete
              setMessages(prev => {
                const updatedMessages = prev.map(msg =>
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


                return updatedMessages
              })


              break
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: msg.content + parsed.content }
                      : msg
                  )
                )
              }
            } catch {
              // Skip invalid JSON chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)

      // Replace the placeholder message with error message
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: "Sorry, I'm having trouble responding right now. Please try again." }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
      setStreamingMessageId(null)
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Voice recognition functionality
  const toggleRecording = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.')
      return
    }

    if (isListening) {
      // User wants to stop recording
      console.log('User stopping recording')
      setIsListening(false)
      setIsRecording(false)
      recognition.stop()
    } else {
      // User wants to start recording
      console.log('User starting recording')
      try {
        setInputMessage('') // Clear input before starting
        setIsListening(true) // Set this before starting
        recognition.start()
      } catch (error) {
        console.error('Error starting speech recognition:', error)
        setIsListening(false)
        setIsRecording(false)
        alert('Could not start speech recognition. Please try again.')
      }
    }
  }

  // Search functionality
  const toggleSearchMode = () => {
    setSearchMode(!searchMode)
  }

  // Attachment functionality
  const handleAttachment = () => {
    // Create file input element
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/*,text/*,.pdf,.doc,.docx'
    fileInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        // For now, just add the file name to input
        setInputMessage(prev => prev + `[Attached: ${file.name}]`)
      }
    }
    fileInput.click()
  }



  // AI Reasoning Functions
  const analyzeWritingContext = () => {
    const analysis = {
      genre: bookContext.genre || 'General',
      targetAudience: bookContext.targetAudience || 'General audience'
    }
    return analysis
  }


  // Helper function to convert markdown to plain text for editing
  const markdownToPlainText = (markdown: string): string => {
    return markdown
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .trim()
  }

  // Helper function to preserve basic markdown formatting
  const preserveBasicMarkdown = (text: string): string => {
    // This keeps the text as-is since users might want to edit markdown directly
    return text
  }

  const detectWritingTopic = (message: string): WritingTopic => {
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('introduction') || lowerMessage.includes('intro')) {
      return WritingTopic.INTRODUCTION
    } else if (lowerMessage.includes('style') || lowerMessage.includes('improve')) {
      return WritingTopic.STYLE_IMPROVEMENT
    } else if (lowerMessage.includes('structure') || lowerMessage.includes('organize')) {
      return WritingTopic.STRUCTURE_GUIDANCE
    } else if (lowerMessage.includes('idea') || lowerMessage.includes('creative')) {
      return WritingTopic.CREATIVE_IDEAS
    }

    return WritingTopic.INTRODUCTION
  }

  // Minimal Markdown -> HTML conversion for rich editor
  const markdownToHtmlBasic = (md: string): string => {
    if (!md) return ''
    let text = md.replace(/\r\n/g, '\n')

    // Code blocks (fenced)
    const codeBlocks: string[] = []
    text = text.replace(/```([\s\S]*?)```/g, (_m, code) => {
      const idx = codeBlocks.push(`<pre><code>${escapeHtml(code)}</code></pre>`) - 1
      return `{{CODE_BLOCK_${idx}}}`
    })

    // Horizontal rule --- on its own line
    text = text.replace(/^\s*---\s*$/gm, '<hr />')

    // Headings
    text = text.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
    text = text.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
    text = text.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')

    // Blockquotes
    text = text.replace(/^(>\s?.+)$/gm, (_m, line) => `<blockquote><p>${line.replace(/^>\s?/, '')}</p></blockquote>`)

    // Ordered lists
    text = text.replace(/(?:^|\n)(\d+\.\s+.*(?:\n\d+\.\s+.*)*)/g, (_m, block) => {
      const items = block
        .split('\n')
        .map((l: string) => l.trim())
        .filter(Boolean)
        .map((l: string) => l.replace(/^\d+\.\s+/, ''))
        .map((i: string) => `<li>${i}</li>`)
        .join('')
      return `\n<ol>${items}</ol>`
    })

    // Unordered lists
    text = text.replace(/(?:^|\n)([-*]\s+.*(?:\n[-*]\s+.*)*)/g, (_m, block) => {
      const items = block
        .split('\n')
        .map((l: string) => l.trim())
        .filter(Boolean)
        .map((l: string) => l.replace(/^[-*]\s+/, ''))
        .map((i: string) => `<li>${i}</li>`)
        .join('')
      return `\n<ul>${items}</ul>`
    })

    // Bold (** or __)
    text = text.replace(/(\*\*|__)(.+?)\1/g, '<strong>$2</strong>')
    
    // Italic (* or _ but not ** or __)
    text = text.replace(/(^|[^*_])(\*|_)([^*_\s](?:[^*_]*[^*_\s])?)\2(?![*_])/g, '$1<em>$3</em>')

    // Inline code
    text = text.replace(/`([^`]+)`/g, (_m, code) => `<code>${escapeHtml(code)}</code>`)

    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')

    // Paragraphs
    const blocks = text.split(/\n{2,}/)
    const html = blocks
      .map(block => {
        const trimmed = block.trim()
        if (!trimmed) return ''
        if (/^<h[1-3]>/.test(trimmed) || /^<ul>/.test(trimmed) || /^<ol>/.test(trimmed) || /^<pre>/.test(trimmed) || /^<blockquote>/.test(trimmed) || /^<hr\s*\/>$/.test(trimmed)) {
          return trimmed
        }
        return `<p>${trimmed.replace(/\n/g, ' ')}</p>`
      })
      .join('')

    // Restore code blocks
    return html.replace(/\{\{CODE_BLOCK_(\d+)\}\}/g, (_m, idx) => codeBlocks[Number(idx)])
  }

  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  const looksLikeMarkdown = (value: string): boolean => {
    if (!value) return false
    if (/<\w+[\s\S]*>/.test(value)) return false // already HTML
    // Check for common markdown patterns: headers, bold, italic, lists, blockquotes, code blocks, horizontal rules
    return /(^|\n)#{1,6}\s|\*\*.*\*\*|\*[^*\s].*[^*\s]\*|^[-*]\s|^\d+\.\s|^>\s|```|---|__.*__|_[^_\s].*[^_\s]_/m.test(value)
  }

  const convertToHtmlParagraphs = (content: string): string => {
    console.log('Original content:', JSON.stringify(content))

    // If content already has HTML tags, return as is
    if (/<\/?[a-z][\s\S]*>/i.test(content)) {
      console.log('Content already has HTML tags, returning as is')
      return content
    }

    // Always try to convert markdown to HTML first (since AI responses should be in markdown now)
    console.log('Converting content as markdown to HTML')
    const htmlContent = markdownToHtmlBasic(content)
    console.log('Converted HTML:', htmlContent)
    
    // If the conversion didn't produce any HTML tags, fall back to paragraph splitting
    if (!/<\/?[a-z][\s\S]*>/i.test(htmlContent)) {
      console.log('No HTML tags found after conversion, using paragraph fallback')
      const paragraphs = content
        .trim()
        .split(/\n\s*\n/) // Split on double line breaks (paragraph breaks)
        .filter(p => p.trim().length > 0) // Remove empty paragraphs
        .map(p => `<p>${p.trim().replace(/\n/g, ' ')}</p>`) // Convert to HTML paragraphs, replace single line breaks with spaces

      console.log('Split into paragraphs:', paragraphs)
      const result = paragraphs.join('')
      console.log('Final HTML result:', result)
      return result
    }
    
    return htmlContent
  }



  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex items-end justify-center p-4 sm:p-6 pointer-events-none">
      <div className="w-full max-w-3xl pointer-events-auto">

        <div ref={chatCardRef} className={`flex flex-col ${(collapsed && !isActive) ? 'h-auto' : 'h-[75vh] max-h-[820px]'} transition-all duration-300 backdrop-blur-md border border-border rounded-lg shadow-lg`}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/70 bg-muted/30 rounded-t-lg">
            <div className="text-sm font-medium text-foreground flex items-center gap-2">
              <span>Writing Assistant</span>
              {mode === 'intro' && (
                <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded-full">Introduction</span>
              )}
              {mode === 'conclusion' && (
                <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded-full">Conclusion</span>
              )}
              {mode === 'chapter' && headerContext && (
                <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded-full">{headerContext}</span>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => updateCollapsed(!collapsed)}
              disabled={isActive}
              title={
                isActive 
                  ? 'Cannot collapse while generating response' 
                  : collapsed 
                    ? 'Expand chat' 
                    : 'Collapse chat'
              }
            >
              {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {/* Messages */}
          {!collapsed && (
            <div ref={scrollAreaRef} className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-6">
                {messages.filter(message => !message.metadata?.hidden).map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 backdrop-blur-sm border border-border flex-shrink-0">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                    )}

                    <div
                      className={`max-w-[75%] rounded-lg p-4 border bot backdrop-blur-sm group ${message.role === 'user'
                        ? 'bg-primary/40 ml-14'
                        : 'bg-muted/80 '
                        }`}
                    >
                      <div className="space-y-2">
                        {message.role === 'assistant' ? (
                          message.content ? (
                            <AIResponse className="text-base leading-relaxed">
                              {message.content}
                            </AIResponse>
                          ) : (
                            <TextShimmer className="text-sm leading-relaxed text-muted-foreground/70">
                              AI thinking...
                            </TextShimmer>
                          )
                        ) : (
                          <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">{message.content}</p>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            if (!message.timestamp) {
                              return 'No timestamp'
                            }
                            try {
                              const date = typeof message.timestamp === 'string' ? new Date(message.timestamp) : message.timestamp
                              return date.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            } catch (error) {
                              return 'Invalid time'
                            }
                          })()}
                        </div>
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 backdrop-blur-sm border border-border flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </div>
                ))}

              </div>
            </div>
          )}


          {/* Suggestion (Intro/Chapter) */}
          {!collapsed && !isLoading && !hasExistingContent && !createButtonClicked && (messages.length <= 1 || (bookContext.currentContent === '' || !bookContext.currentContent)) && (
            <div className="p-6 border-t border-border backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm text-foreground font-medium">{mode === 'intro' ? 'Get started:' : mode === 'conclusion' ? 'Start your conclusion:' : 'Start your chapter:'}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-sm backdrop-blur-sm border-border text-foreground hover:bg-muted transition-all duration-300 rounded-full px-4"
                onClick={() => {
                  // Mark create button as clicked
                  setCreateButtonClicked(true)

                  const message = mode === 'intro'
                    ? 'Write ONLY the book introduction. Start with an "Introduction" heading using ## markdown syntax, then write the introduction content. Format your response in markdown using **bold** for emphasis, *italic* for emphasis, and proper paragraph breaks. Do not add any commentary before or after.'
                    : mode === 'conclusion'
                      ? 'Write ONLY the book conclusion. Start with a "Conclusion" heading using ## markdown syntax, then write the conclusion content. Format your response in markdown using **bold** for emphasis, *italic* for emphasis, and proper paragraph breaks. Do not add any commentary before or after.'
                      : `Write ONLY the chapter content for the chapter titled "${headerContext || 'Untitled Chapter'}". Start with a "${headerContext || 'Untitled Chapter'}" heading using ## markdown syntax, then write the chapter content. Format your response in markdown using **bold** for emphasis, *italic* for emphasis, and proper paragraph breaks. Do not add any commentary before or after.`
                  setInputMessage('')

                  // Create a hidden user message that won't be displayed
                  const userMessage: Message = {
                    id: `user_${Date.now()}`,
                    role: 'user',
                    content: message,
                    timestamp: new Date(),
                    metadata: {
                      hidden: true // Add hidden flag
                    }
                  }

                  setMessages(prev => [...prev, userMessage])
                  setInputMessage('')
                  setIsLoading(true)

                  // Create assistant message placeholder
                  const assistantMessageId = `assistant_${Date.now()}`
                  const assistantMessage: Message = {
                    id: assistantMessageId,
                    role: 'assistant',
                    content: '',
                    timestamp: new Date(),
                    metadata: {
                      isStreaming: true
                    }
                  }

                  setMessages(prev => [...prev, assistantMessage])
                  setStreamingMessageId(assistantMessageId)

                  // Send to API
                  fetch('/api/writing-assistant', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      message: message,
                      bookContext: {
                        ...bookContext,
                        currentSection: mode,
                        currentSectionTitle: headerContext
                      },
                      conversationHistory: messages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                      })),
                      enableWebSearch: searchMode
                    }),
                  }).then(async response => {
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
                            setStreamingMessageId(null)

                            // Update message metadata when streaming is complete
                            setMessages(prev => {
                              const updatedMessages = prev.map(msg =>
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
                              return updatedMessages
                            })

                            break
                          }

                          try {
                            const parsed = JSON.parse(data)
                            if (parsed.content) {
                              setMessages(prev =>
                                prev.map(msg =>
                                  msg.id === assistantMessageId
                                    ? { ...msg, content: msg.content + parsed.content }
                                    : msg
                                )
                              )
                            }
                          } catch {
                            // Skip invalid JSON chunks
                          }
                        }
                      }
                    }
                  }).catch(error => {
                    console.error('Error sending message:', error)
                    setMessages(prev =>
                      prev.map(msg =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: "Sorry, I'm having trouble responding right now. Please try again." }
                          : msg
                      )
                    )
                  }).finally(() => {
                    setIsLoading(false)
                    setStreamingMessageId(null)

                  })
                }}
                disabled={isLoading}
              >
                {mode === 'intro' ? 'Create Introduction' : mode === 'conclusion' ? 'Create Conclusion' : 'Create Chapter'}
              </Button>
            </div>
          )}

          {/* Save (Intro/Chapter) button after content is generated */}
          {!collapsed && (() => {
            const assistantMessages = messages.filter(m => m.role === 'assistant');
            const hasGeneratedContent = messages.some(m =>
              m.role === 'assistant' &&
              m.content &&
              m.content.trim().length > 10 && // Has substantial content
              m.id !== 'welcome'
            );

            // Check if user used the "Create Introduction" button (hidden message exists)
            const usedCreateButton = messages.some(m =>
              m.role === 'user' &&
              m.metadata?.hidden === true
            );

            const showSaveButton = !isLoading && !streamingMessageId && hasGeneratedContent;

            return showSaveButton;
          })() && (
              <div className="px-6 py-4 border-t border-border bg-muted/30">
                <div className="flex items-center justify-between gap-2">
                  {(() => {
                    // Determine if the LAST assistant response originated from the hidden create prompt
                    let lastAssistantIndex = -1;
                    for (let i = messages.length - 1; i >= 0; i--) {
                      const m = messages[i]
                      if (m.role === 'assistant' && m.content && !m.metadata?.isStreaming && m.id !== 'welcome') {
                        lastAssistantIndex = i
                        break
                      }
                    }
                    let usedCreateForLastAssistant = false
                    if (lastAssistantIndex !== -1) {
                      for (let j = lastAssistantIndex - 1; j >= 0; j--) {
                        const mu = messages[j]
                        if (mu.role === 'user') {
                          usedCreateForLastAssistant = mu.metadata?.hidden === true
                          break
                        }
                      }
                    }

                    if (usedCreateForLastAssistant) {
                      return <p className="text-sm text-muted-foreground">{mode === 'intro' ? 'Ready to save your introduction?' : mode === 'conclusion' ? 'Ready to save your conclusion?' : 'Ready to save this chapter?'}</p>;
                    } else {
                      return <p className="text-sm text-muted-foreground">{mode === 'intro' ? 'Save this response as introduction?' : mode === 'conclusion' ? 'Save this response as conclusion?' : 'Save this response as chapter?'}</p>;
                    }
                  })()}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs hover:bg-muted/50"
                    onClick={async () => {
                      // Find the last actual response (not the welcome message)
                      const lastAssistant = [...messages].reverse().find(m =>
                        m.role === 'assistant' &&
                        m.content &&
                        !m.metadata?.isStreaming &&
                        m.id !== 'welcome' // Exclude welcome message
                      )

                      if (lastAssistant && onContentGenerated) {
                        // Convert content to proper HTML with paragraphs for the editor
                        const htmlContent = convertToHtmlParagraphs(lastAssistant.content)
                        onContentGenerated(htmlContent)
                      }
                    }}
                  >
                    {(() => {
                      // Decide button label based on whether the last assistant message came from the hidden create flow
                      let lastAssistantIndex = -1;
                      for (let i = messages.length - 1; i >= 0; i--) {
                        const m = messages[i]
                        if (m.role === 'assistant' && m.content && !m.metadata?.isStreaming && m.id !== 'welcome') {
                          lastAssistantIndex = i
                          break
                        }
                      }
                      let usedCreateForLastAssistant = false
                      if (lastAssistantIndex !== -1) {
                        for (let j = lastAssistantIndex - 1; j >= 0; j--) {
                          const mu = messages[j]
                          if (mu.role === 'user') {
                            usedCreateForLastAssistant = mu.metadata?.hidden === true
                            break
                          }
                        }
                      }

                      if (usedCreateForLastAssistant) {
                        return mode === 'intro' ? 'Save Introduction' : mode === 'conclusion' ? 'Save Conclusion' : 'Save Chapter'
                      } else {
                        return mode === 'intro' ? 'Save as Introduction' : mode === 'conclusion' ? 'Save as Conclusion' : 'Save as Chapter'
                      }
                    })()}
                  </Button>
                </div>
              </div>
            )}


          {/* Input */}
          <div className="p-6 border-t border-border backdrop-blur-sm">
            {searchMode && (
              <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <Search className="h-4 w-4" />
                  <span>Search mode enabled - AI will search the internet for information</span>
                </div>
              </div>
            )}
            <div className="relative max-w-2xl mx-auto">
              {/* Left side buttons */}
              <div className="absolute left-2 top-1/2 -translate-y-1/2 flex gap-1 z-10">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAttachment}
                  disabled={isLoading}
                  className="w-9 h-9 rounded-full hover:bg-muted"
                  title="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleRecording}
                  disabled={isLoading}
                  className={`w-9 h-9 rounded-full hover:bg-muted transition-all duration-200 ${isListening
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse hover:bg-red-600'
                    : 'hover:bg-muted'
                    }`}
                  title={isListening ? "Stop recording - Click to stop" : "Start voice recording"}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleSearchMode}
                  disabled={isLoading}
                  className={`w-9 h-9 rounded-full hover:bg-muted ${searchMode ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : ''}`}
                  title={searchMode ? "Disable web search" : "Enable web search"}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              <Input
                ref={inputRef}
                value={isLoading ? "" : inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  isLoading ? "" :
                    isListening ? "Listening..." :
                      searchMode ? "Ask me anything - I'll search the web..." :
                        "Ask me anything about your book..."
                }
                disabled={isLoading}
                className={`h-14 pl-32 pr-16 rounded-full backdrop-blur-sm focus:border-primary placeholder:text-muted-foreground text-base transition-all duration-200 ${isListening
                  ? 'border-red-500 border-2 shadow-lg shadow-red-500/20 bg-red-50/50 dark:bg-red-950/20'
                  : 'border-border'
                  }`}
              />
              {isLoading && (
                <div className="pointer-events-none absolute inset-y-0 left-32 flex items-center pr-16 max-w-[60%] overflow-hidden">
                  <TextShimmer className="text-base text-muted-foreground/70">
                    {searchMode ? "Searching and generating response..." : "Generating response..."}
                  </TextShimmer>
                </div>
              )}


              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full transition-all duration-300"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Powered by footer */}
          <div className="px-6 py-2 border-t border-border/50 bg-muted/20">
            <div className="flex items-center justify-center gap-2">
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
        </div>
      </div>
    </div>
  )
}
