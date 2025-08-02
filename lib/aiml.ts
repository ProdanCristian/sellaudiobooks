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
      model: 'google/gemini-2.5-flash',
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

export async function generateScript(prompt: string) {
  try {
    const response = await aiml.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2048,
      temperature: 0.9,
    })

    return response.choices[0]?.message?.content || ''
  } catch (error) {
    throw error
  }
} 