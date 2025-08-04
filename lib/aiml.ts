import OpenAI from 'openai'

const apiKey = process.env.AIML_API_KEY
if (!apiKey) {
  throw new Error('AIML_API_KEY is not set in the environment variables.')
}

const aiml = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://api.aimlapi.com/v1',
})

export { aiml }

export async function generateScriptStream(prompt: string) {
  try {
    const stream = await aiml.chat.completions.create({
      model: 'openai/gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2048,
      temperature: 0.9,
      stream: true,
    })
    return stream
  } catch (error) {
    throw error
  }
}

export async function generateScript(prompt: string, targetCharacters?: number) {
  try {
    // Calculate appropriate max_tokens based on target length
    // Extremely generous token estimation to ensure full content generation
    const estimatedTokens = targetCharacters 
      ? Math.round((targetCharacters * 3) / 2) + 5000 // Much more generous + huge buffer
      : 4000
    
    // Maximum token limits to ensure no truncation for any video length
    let maxTokenLimit = 4000
    if (targetCharacters && targetCharacters > 8000) {
      maxTokenLimit = 50000 // For very long content (10+ minutes)
    } else if (targetCharacters && targetCharacters > 4000) {
      maxTokenLimit = 30000 // For long content (4-10 minutes)
    } else if (targetCharacters && targetCharacters > 1500) {
      maxTokenLimit = 20000 // For medium content (1.5-4 minutes)
    }
    
    const response = await aiml.chat.completions.create({
      model: 'openai/gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: Math.min(estimatedTokens, maxTokenLimit),
      temperature: 0.7, // Lower temperature for more consistent length following
    })

    return response.choices[0]?.message?.content || ''
  } catch (error) {
    throw error
  }
} 