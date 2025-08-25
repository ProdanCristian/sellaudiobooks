import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const apiKey = process.env.COMET_API_KEY;
if (!apiKey) {
  throw new Error("COMET_API_KEY is not set in the environment variables.");
}

const comet = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://api.cometapi.com/v1",
});

interface ChapterRequest {
  title: string
  genre: string
  targetAudience: string
  chapterTitle: string
  chapterType: 'introduction' | 'middle' | 'conclusion'
  chapterPosition: number
  totalChapters: number
  allChapters: Array<{
    title: string
    description: string
    isCurrentChapter: boolean
  }>
}

export async function POST(request: NextRequest) {
  try {
    const { title, genre, targetAudience, chapterTitle, chapterType, chapterPosition, totalChapters, allChapters }: ChapterRequest = await request.json()

    if (!title || !genre || !targetAudience || !chapterTitle) {
      return NextResponse.json(
        { error: 'Title, genre, target audience, and chapter title are required' },
        { status: 400 }
      )
    }

    // Build concise context
    const bookContext = `"${title}" (${genre} for ${targetAudience})`
    const positionContext = `${chapterType} (${chapterPosition}/${totalChapters})`
    const chaptersContext = allChapters?.length 
      ? `\nBook structure: ${allChapters.map(ch => ch.isCurrentChapter ? `>> ${ch.title} <<` : ch.title).join(' → ')}`
      : ''

    const prompt = `Improve this ${chapterType} chapter for ${bookContext}:

"${chapterTitle}" - Position: ${positionContext}${chaptersContext}

Generate improved chapter outline (keep concise):
{
  "chapter": {
    "title": "Enhanced custom title only (no prefix)",
    "description": "Brief description (1-2 sentences max)",
    "keyPoints": ["Point 1", "Point 2", "Point 3"]
  }
}

Make it specific to ${chapterType} requirements and book flow. JSON only:`

    try {
      const completion = await comet.chat.completions.create({
        model: "gpt-5-chat-latest",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 400,
      })

      const text = completion.choices[0]?.message?.content || ''

      // Clean the response - remove markdown code blocks if present
      let cleanedText = text.trim()
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      const response = JSON.parse(cleanedText)
      
      // Validate the response structure
      if (!response.chapter || !response.chapter.title || !response.chapter.description || !Array.isArray(response.chapter.keyPoints)) {
        throw new Error('Invalid response structure')
      }

      return NextResponse.json(response)

    } catch (aiError) {
      console.error('AI API error, using fallback:', aiError)
      
      // Fallback: generate contextual chapter based on type
      const getFallbackContent = (type: string) => {
        switch(type) {
          case 'introduction':
            return {
              title: 'Setting the Foundation',
              description: `Introduces key concepts and sets expectations for ${targetAudience}.`,
              keyPoints: ['Overview of main themes', 'What readers will learn', 'How to approach this book']
            }
          case 'conclusion':
            return {
              title: 'Moving Forward',
              description: `Summarizes key insights and provides guidance for continued growth.`,
              keyPoints: ['Key takeaways recap', 'Next steps', 'Additional resources']
            }
          default:
            return {
              title: 'Core Concepts',
              description: `Explores essential ideas relevant to ${title} for ${targetAudience}.`,
              keyPoints: ['Main concepts introduction', 'Practical examples', 'Real-world applications']
            }
        }
      }
      
      const fallbackChapter = getFallbackContent(chapterType || 'middle')
      
      return NextResponse.json({
        chapter: fallbackChapter
      })
    }

  } catch (error) {
    console.error('Error generating chapter:', error)
    return NextResponse.json(
      { error: 'Failed to generate chapter' },
      { status: 500 }
    )
  }
}