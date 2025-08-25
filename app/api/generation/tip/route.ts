import { NextRequest } from 'next/server'
import OpenAI from 'openai'

const comet = new OpenAI({
  apiKey: process.env.COMET_API_KEY,
  baseURL: "https://api.cometapi.com/v1",
})

export async function POST(request: NextRequest) {
  try {
    const { title, genre, targetAudience, existingTips, chapters } = await request.json()

    const context = [
      `Book: "${title}" (${genre} for ${targetAudience})`,
      chapters.length > 0 ? `Chapters: ${chapters.map((ch: any) => `${ch.title}${ch.description ? ` - ${ch.description}` : ''}`).join(' | ')}` : '',
      existingTips.length > 0 ? `Avoid: ${existingTips.join('; ')}` : ''
    ].filter(Boolean).join('\n')

    const prompt = `Writing tip for this book context:\n${context}\n\nGenerate ONE specific, actionable book writing tip (max 15 words):`

    const completion = await comet.chat.completions.create({
      model: 'gpt-5-chat-latest',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      max_tokens: 40,
    })

    const tip = completion.choices[0]?.message?.content?.trim()
    if (!tip) throw new Error('No tip generated')

    return Response.json({ tip })
  } catch (error) {
    console.error('Error generating tip:', error)
    return Response.json({ error: 'Failed to generate writing tip' }, { status: 500 })
  }
}