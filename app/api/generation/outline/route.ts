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

interface OutlineRequest {
  title: string
  genre: string
  targetAudience: string
  customization?: string
  description?: string
  chapterCount?: number
}

interface ChapterOutline {
  title: string
  description: string
  keyPoints: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { title, genre, targetAudience, customization, description, chapterCount }: OutlineRequest = await request.json()

    if (!title || !genre || !targetAudience) {
      return NextResponse.json(
        { error: 'Title, genre, and target audience are required' },
        { status: 400 }
      )
    }

    const prompt = `Generate a complete book outline for "${title}".

Book Details:
- Genre: ${genre}
- Target Audience: ${targetAudience}
${customization ? `- Customization: ${customization}` : ''}
${description ? `- Description: ${description}` : ''}

Create a structured outline with Introduction, numbered chapters, and Conclusion.
Generate 6-10 total chapters (including Introduction and Conclusion).

Respond with ONLY a JSON object in this exact format:
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
- Generate specific chapter titles related to the book content
- Include 3-5 key points per chapter
- Add 2-3 writing suggestions

Respond with ONLY the JSON - no explanations or markdown formatting.`

    try {
      const completion = await comet.chat.completions.create({
        model: "gpt-5-chat-latest",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 2000,
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
      if (!response.outline || !Array.isArray(response.outline.chapters) || response.outline.chapters.length === 0) {
        throw new Error('Invalid response structure')
      }

      for (const chapter of response.outline.chapters) {
        if (!chapter.title || !chapter.description || !Array.isArray(chapter.keyPoints)) {
          throw new Error('Invalid chapter structure')
        }
      }

      return NextResponse.json(response)

    } catch (aiError) {
      console.error('AI API error, using fallback:', aiError)
      
      // Fallback: generate a well-structured outline using templates
      const fallbackOutline = generateFallbackOutline(title, genre, targetAudience, 8)
      return NextResponse.json({
        outline: {
          chapters: fallbackOutline,
          suggestions: getGenreSpecificSuggestions(genre)
        }
      })
    }

  } catch (error) {
    console.error('Error generating outline:', error)
    return NextResponse.json(
      { error: 'Failed to generate outline' },
      { status: 500 }
    )
  }
}

function getRecommendedChapterCount(genre: string): number {
  const chapterCounts: Record<string, number> = {
    'Romance': 12,
    'Mystery & Thriller': 15,
    'Fantasy': 20,
    'Science Fiction': 18,
    'Historical Fiction': 16,
    'Literary Fiction': 14,
    'Horror': 13,
    'Adventure': 15,
    'Western': 12,
    'Young Adult Fiction': 12,
    'Children\'s Fiction': 8,
    'Biography': 16,
    'Self-Help': 10,
    'Business': 12,
    'Health & Wellness': 10,
    'Technology': 14,
    'History': 16,
    'Science': 12,
    'Philosophy': 14,
    'Travel': 10,
    'Cooking': 8,
    'Politics': 14,
    'Religion': 12,
    'Education': 10,
    'Memoir': 14,
    'True Crime': 16
  }
  
  return chapterCounts[genre] || 12
}

function getGenreSpecificSuggestions(genre: string): string[] {
  const suggestions: Record<string, string[]> = {
    'Self-Help': [
      'Start with a personal story or case study',
      'Include practical exercises at the end of each chapter',
      'Use clear, actionable language',
      'Provide real-world examples'
    ],
    'Business': [
      'Include case studies and real company examples',
      'Add data and statistics to support your points',
      'Provide actionable frameworks and strategies',
      'Consider adding templates or worksheets'
    ],
    'Fiction': [
      'Ensure each chapter ends with a hook or cliffhanger',
      'Develop character arcs throughout the chapters',
      'Balance action with character development',
      'Consider varying chapter lengths for pacing'
    ],
    'Biography': [
      'Organize chronologically or thematically',
      'Include pivotal moments and turning points',
      'Provide historical context where relevant',
      'Balance personal details with broader impact'
    ]
  }
  
  // Return genre-specific suggestions or general fiction/non-fiction advice
  if (suggestions[genre]) {
    return suggestions[genre]
  }
  
  const isFiction = ['Romance', 'Mystery & Thriller', 'Fantasy', 'Science Fiction', 'Historical Fiction', 'Literary Fiction', 'Horror', 'Adventure', 'Western', 'Young Adult Fiction', 'Children\'s Fiction'].includes(genre)
  
  return isFiction ? suggestions['Fiction'] || [] : [
    'Start each chapter with a clear objective',
    'Use headings and subheadings for easy navigation',
    'Include examples and case studies',
    'End chapters with key takeaways'
  ]
}

function generateFallbackOutline(title: string, genre: string, targetAudience: string, chapterCount: number): ChapterOutline[] {
  const chapters: ChapterOutline[] = []
  
  // Always start with Introduction
  chapters.push({
    title: `Introduction: Welcome to ${title}`,
    description: `This opening chapter introduces the main concepts and themes that will be explored throughout ${title}, setting the foundation for ${targetAudience}.`,
    keyPoints: ["Overview of main topics", "What readers will learn", "How to use this book", "Setting expectations"]
  })
  
  // Add middle chapters
  const middleChapterCount = chapterCount - 2 // Subtract intro and conclusion
  for (let i = 0; i < middleChapterCount; i++) {
    chapters.push({
      title: `Chapter ${i + 1}: Core Topic ${i + 1}`,
      description: `This chapter delves into essential concepts and practical applications related to ${title}, providing valuable insights for ${targetAudience}.`,
      keyPoints: ["Key concept introduction", "Practical examples", "Implementation strategies", "Common challenges"]
    })
  }
  
  // Always end with Conclusion
  chapters.push({
    title: `Conclusion: Moving Forward`,
    description: `This final chapter summarizes the key takeaways from ${title} and provides guidance for ${targetAudience} to continue their journey.`,
    keyPoints: ["Summary of key points", "Next steps", "Additional resources", "Final thoughts"]
  })
  
  return chapters
}

function getChapterTemplates(genre: string, title: string, targetAudience: string) {
  const templates: Record<string, Array<{title: string, description: string, keyPoints: string[]}>> = {
    'Self-Help': [
      {
        title: 'Chapter [NUMBER]: Understanding the Foundation',
        description: 'This opening chapter introduces the core concepts and sets the stage for personal transformation.',
        keyPoints: ['Identifying current challenges', 'Understanding the change process', 'Setting realistic expectations', 'Building motivation']
      },
      {
        title: 'Chapter [NUMBER]: Assessing Your Starting Point',
        description: 'Readers learn to evaluate their current situation and identify areas for improvement.',
        keyPoints: ['Self-assessment tools', 'Recognizing patterns', 'Identifying strengths and weaknesses', 'Creating a baseline']
      },
      {
        title: 'Chapter [NUMBER]: Creating Your Vision',
        description: 'This chapter focuses on defining clear goals and creating a compelling vision for the future.',
        keyPoints: ['Goal setting techniques', 'Visualization exercises', 'Creating actionable plans', 'Maintaining motivation']
      },
      {
        title: 'Chapter [NUMBER]: Building Essential Skills',
        description: 'Practical skills and strategies that form the foundation of lasting change.',
        keyPoints: ['Core skill development', 'Practice techniques', 'Overcoming obstacles', 'Building confidence']
      },
      {
        title: 'Chapter [NUMBER]: Implementing Daily Practices',
        description: 'How to integrate new habits and practices into everyday life for sustained progress.',
        keyPoints: ['Habit formation', 'Daily routines', 'Consistency strategies', 'Tracking progress']
      },
      {
        title: 'Chapter [NUMBER]: Overcoming Obstacles',
        description: 'Strategies for dealing with setbacks and maintaining momentum during difficult times.',
        keyPoints: ['Identifying common obstacles', 'Building resilience', 'Problem-solving strategies', 'Maintaining motivation']
      },
      {
        title: 'Chapter [NUMBER]: Building Support Systems',
        description: 'Creating and maintaining relationships that support your growth and development.',
        keyPoints: ['Identifying supportive people', 'Communication skills', 'Setting boundaries', 'Building community']
      },
      {
        title: 'Chapter [NUMBER]: Measuring Progress',
        description: 'Tools and techniques for tracking your development and celebrating achievements.',
        keyPoints: ['Setting milestones', 'Tracking methods', 'Celebrating wins', 'Adjusting strategies']
      },
      {
        title: 'Chapter [NUMBER]: Sustaining Change',
        description: 'Long-term strategies for maintaining the positive changes you have made.',
        keyPoints: ['Creating lasting habits', 'Preventing backslides', 'Continuous improvement', 'Life-long learning']
      },
      {
        title: 'Chapter [NUMBER]: Moving Forward',
        description: 'Planning your continued journey and setting new goals for the future.',
        keyPoints: ['Setting new goals', 'Planning next steps', 'Sharing your journey', 'Inspiring others']
      }
    ],
    'Business': [
      {
        title: 'Chapter 1: Market Fundamentals',
        description: 'Understanding the business landscape and identifying opportunities in your field.',
        keyPoints: ['Market analysis', 'Competitive research', 'Opportunity identification', 'Industry trends']
      },
      {
        title: 'Chapter 2: Strategic Planning',
        description: 'Developing a comprehensive strategy to achieve your business objectives.',
        keyPoints: ['Strategic frameworks', 'Business planning', 'Resource allocation', 'Risk assessment']
      },
      {
        title: 'Chapter 3: Execution Excellence',
        description: 'Turning plans into action with proven implementation strategies.',
        keyPoints: ['Implementation frameworks', 'Team building', 'Process optimization', 'Performance metrics']
      }
    ],
    'Fiction': [
      {
        title: 'Chapter 1: The Beginning',
        description: 'Setting the stage and introducing key characters in an engaging opening.',
        keyPoints: ['Character introduction', 'Setting establishment', 'Conflict setup', 'Hook creation']
      },
      {
        title: 'Chapter 2: Rising Action',
        description: 'Building tension and developing the central conflict of the story.',
        keyPoints: ['Conflict development', 'Character growth', 'Plot advancement', 'Tension building']
      },
      {
        title: 'Chapter 3: Complications',
        description: 'Introducing obstacles and challenges that complicate the journey.',
        keyPoints: ['New challenges', 'Character testing', 'Plot twists', 'Emotional stakes']
      }
    ]
  }
  
  // Default template for unknown genres
  const defaultTemplate = [
    {
      title: 'Chapter [NUMBER]: Introduction to [TITLE]',
      description: 'This chapter introduces the main concepts and themes that will be explored throughout [TITLE].',
      keyPoints: ['Core concepts introduction', 'Key themes overview', 'Chapter roadmap', 'Reader expectations']
    },
    {
      title: 'Chapter [NUMBER]: Building Understanding',
      description: 'Deepening the reader\'s knowledge and providing foundational information.',
      keyPoints: ['Detailed explanations', 'Examples and illustrations', 'Common misconceptions', 'Practical applications']
    },
    {
      title: 'Chapter [NUMBER]: Advanced Concepts',
      description: 'Exploring more complex ideas and their practical implementations.',
      keyPoints: ['Advanced techniques', 'Real-world examples', 'Problem-solving approaches', 'Best practices']
    }
  ]
  
  return templates[genre] || defaultTemplate
}