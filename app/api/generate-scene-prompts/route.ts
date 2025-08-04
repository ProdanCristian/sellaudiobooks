import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { script, numberOfScenes, aspectRatio } = await request.json()

    if (!script || !numberOfScenes) {
      return NextResponse.json(
        { error: 'Script and numberOfScenes are required' },
        { status: 400 }
      )
    }

    const AIML_API_KEY = process.env.AIML_API_KEY
    if (!AIML_API_KEY) {
      return NextResponse.json(
        { error: 'AI/ML API key not configured' },
        { status: 500 }
      )
    }

    // Define visual style based on aspect ratio
    const visualStyle = aspectRatio === "9:16" 
      ? "mobile-friendly vertical composition, portrait orientation, close-up focus suitable for social media"
      : "cinematic horizontal composition, wide landscape format, professional video production style"

    // Create AI prompt for generating scene descriptions
    const aiPrompt = `You are an expert visual content creator and prompt engineer. Analyze the following script and create ${numberOfScenes} distinct, visually compelling image prompts that represent key moments or concepts from the script.

SCRIPT:
"${script}"

REQUIREMENTS:
- Create exactly ${numberOfScenes} unique image prompts
- Each prompt should be visually distinct and represent different parts/concepts from the script
- Use ${visualStyle}
- Focus on visual storytelling that supports the narrative
- Include relevant settings, objects, people, or metaphors that relate to the script content
- Each prompt should be 2-3 sentences long
- Avoid any text, words, or writing in the images
- Make prompts suitable for high-quality image generation
- Progress logically through the script content
- Use professional, cinematic language

Format your response as a JSON object with this structure:
{
  "prompts": [
    "First scene prompt here...",
    "Second scene prompt here...",
    ...
  ]
}

Focus on creating visually engaging prompts that will result in professional, high-quality images that enhance the viewer's understanding of the script content.`

    // Call AI API
    const response = await fetch('https://api.aimlapi.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIML_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert visual content creator specializing in creating compelling image prompts for video content. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`)
    }

    const aiResult = await response.json()
    const aiContent = aiResult.choices?.[0]?.message?.content

    if (!aiContent) {
      throw new Error('No content received from AI API')
    }

    // Parse AI response
    let parsedPrompts
    try {
      // Try to parse the JSON response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedPrompts = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in AI response')
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      throw new Error('Failed to parse AI response')
    }

    if (!parsedPrompts.prompts || !Array.isArray(parsedPrompts.prompts)) {
      throw new Error('Invalid prompts format from AI')
    }

    // Ensure we have the right number of prompts
    let finalPrompts = parsedPrompts.prompts.slice(0, numberOfScenes)
    
    // If we don't have enough prompts, duplicate and modify the last ones
    while (finalPrompts.length < numberOfScenes) {
      const lastPrompt = finalPrompts[finalPrompts.length - 1]
      const modifiedPrompt = `${lastPrompt} - Alternative perspective with different composition and lighting.`
      finalPrompts.push(modifiedPrompt)
    }

    // Enhance each prompt with technical specifications
    const enhancedPrompts = finalPrompts.map((prompt, index) => {
      const sceneNumber = index + 1
      const totalScenes = numberOfScenes
      
      let enhancedPrompt = prompt
      
      // Add scene progression context
      if (sceneNumber === 1) {
        enhancedPrompt += " Opening scene with strong visual impact and introduction energy."
      } else if (sceneNumber === totalScenes) {
        enhancedPrompt += " Concluding scene with resolution and strong final impression."
      } else {
        enhancedPrompt += ` Mid-sequence scene ${sceneNumber} of ${totalScenes} maintaining narrative flow.`
      }
      
      // Add technical quality specifications
      enhancedPrompt += " Professional photography, perfect lighting, high resolution, detailed, crisp focus, engaging composition, no text or writing visible."
      
      return enhancedPrompt
    })

    return NextResponse.json({
      success: true,
      prompts: enhancedPrompts,
      metadata: {
        script_length: script.length,
        scenes_generated: enhancedPrompts.length,
        aspect_ratio: aspectRatio
      }
    })

  } catch (error) {
    console.error('Error generating scene prompts:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate scene prompts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}