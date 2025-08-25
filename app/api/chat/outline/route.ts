import { NextRequest } from 'next/server'
import OpenAI from 'openai'

const comet = new OpenAI({
  apiKey: process.env.COMET_API_KEY,
  baseURL: "https://api.cometapi.com/v1",
})

export async function POST(request: NextRequest) {
  try {
    const { title, genre, targetAudience, message, chatHistory, currentChapters } = await request.json()

    // Build conversation context
    const systemPrompt = `You are a professional book outline assistant. You help authors create detailed, well-structured outlines for their books.

Book Details:
- Title: "${title}"
- Genre: ${genre}
- Target Audience: ${targetAudience}

Your role is to:
1. Help authors think through their book structure
2. Provide suggestions for chapter organization
3. Offer insights specific to the genre and audience
4. Answer questions about book planning and structure
5. When appropriate, generate complete outlines in JSON format

Current outline status: ${currentChapters.length > 0 ? `${currentChapters.length} chapters exist` : 'No chapters yet'}

IMPORTANT GUIDELINES FOR BOOK STRUCTURE:
- ALWAYS start with "Introduction:" as the first chapter
- Follow with numbered chapters: "Chapter 1:", "Chapter 2:", "Chapter 3:", etc.
- ALWAYS end with "Conclusion:" as the final chapter
- Use clear, descriptive content after the colon that indicates what the chapter covers
- For non-fiction: Structure content logically from basic to advanced concepts
- For fiction: Structure chapters to follow story progression and character development

FORMATTING: Use markdown formatting:
- Use **bold** for emphasis
- Use *italic* for light emphasis  
- Use bullet points with - or *
- Use numbered lists when appropriate
- Use ## for section headings
- Use > for blockquotes when giving tips

Be conversational, helpful, and encourage the author's creative process. Ask clarifying questions when needed.

If the user asks for a complete outline (phrases like "generate a complete outline", "create an outline", "make an outline"), immediately create it without asking for permission. Respond with a brief message like "Creating your outline..." followed by the JSON object in this exact format (DO NOT wrap in code blocks or \`\`\`json tags):
{
  "outline": {
    "chapters": [
      {
        "title": "Introduction: Setting the Stage",
        "description": "Chapter description focusing on introductory content", 
        "keyPoints": ["Key point 1", "Key point 2", "Key point 3"]
      },
      {
        "title": "Chapter 1: Main Topic Begins",
        "description": "Chapter description focusing on first main topic", 
        "keyPoints": ["Key point 1", "Key point 2", "Key point 3"]
      },
      {
        "title": "Chapter 2: Building on Concepts",
        "description": "Chapter description focusing on second main topic", 
        "keyPoints": ["Key point 1", "Key point 2", "Key point 3"]
      },
      {
        "title": "Conclusion: Wrapping Up",
        "description": "Chapter description focusing on concluding thoughts", 
        "keyPoints": ["Key point 1", "Key point 2", "Key point 3"]
      }
    ],
    "suggestions": ["Writing tip 1", "Writing tip 2"]
  }
}

CRITICAL REQUIREMENTS:
- MUST start with "Introduction:" 
- MUST use "Chapter 1:", "Chapter 2:", etc. format
- MUST end with "Conclusion:"
- Generate 6-10 total chapters (including Introduction and Conclusion)
- Do NOT use generic chapter titles - be specific to the book's content

IMPORTANT: When generating a complete outline, do NOT:
- Ask for permission or confirmation
- Offer to create an outline - just create it
- Include detailed explanations or verbose descriptions
- Say things like "If you'd like, I can..." or "Do you want me to..."
- Wrap the JSON in \`\`\`json code blocks or any markdown formatting
- Use any code block syntax around the JSON

Simply say "Creating your outline..." and immediately provide the raw JSON object. The user interface will handle showing appropriate feedback.

Only include the JSON if generating a complete outline. Otherwise, just respond conversationally in markdown.`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.map((msg: any) => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: message }
    ]

    // Create streaming response
    const stream = await comet.chat.completions.create({
      model: 'gpt-5-chat-latest',
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    })

    // Create a ReadableStream for the response
    const encoder = new TextEncoder()
    let fullResponse = ''

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let isInJsonBlock = false
          let jsonBuffer = ''
          let hasSignaled = false
          
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              fullResponse += content
              
              // Check if we're entering outline generation mode - detect the specific trigger phrase
              if (fullResponse.includes('Creating your outline') || 
                  content.includes('"outline"') || 
                  content.includes('"chapters"') ||
                  content.includes('"suggestions"') ||
                  (isInJsonBlock)) {
                
                if (!hasSignaled) {
                  // Send ONLY the creating signal, nothing else
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ createOutline: true })}\n\n`))
                  hasSignaled = true
                }
                isInJsonBlock = true
                jsonBuffer += content
                continue // Skip all content after detection
              }
              
              // If we haven't signaled yet, stream normal content
              if (!isInJsonBlock && !hasSignaled) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
              }
            }
          }

          // Try to extract JSON outline if present in the full response
          let outline = null
          try {
            const jsonMatch = fullResponse.match(/\{[\s\S]*"outline"[\s\S]*\}/g)
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0])
              outline = parsed.outline
              // Send the outline data
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ outline })}\n\n`))
            }
          } catch (error) {
            // No outline in response, that's okay
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('Error in streaming:', error)
          controller.error(error)
        }
      }
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Error in outline chat:', error)
    
    // Return streaming error response
    const encoder = new TextEncoder()
    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: "I apologize, but I'm having trouble processing your request right now. Could you try again?" })}\n\n`))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    })

    return new Response(errorStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }
}