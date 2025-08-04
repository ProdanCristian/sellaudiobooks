import { NextRequest, NextResponse } from 'next/server'

type RecraftStyle = 
  | '2d_art_poster'
  | '2d_art_poster_2'
  | '3d'
  | '80s'
  | 'antiquarian'
  | 'bold_fantasy'
  | 'child_book'
  | 'cover'
  | 'crosshatch'
  | 'digital_engraving'
  | 'engraving_color'
  | 'expressionism'
  | 'freehand_details'
  | 'glow'
  | 'grain'
  | 'grain_20'
  | 'graphic_intensity'
  | 'hand_drawn'
  | 'hand_drawn_outline'
  | 'handmade_3d'
  | 'hard_comics'
  | 'infantile_sketch'
  | 'kawaii'
  | 'long_shadow'
  | 'modern_folk'
  | 'multicolor'
  | 'neon_calm'
  | 'noir'
  | 'nostalgic_pastel'
  | 'outline_details'
  | 'pastel_gradient'
  | 'pastel_sketch'
  | 'pixel_art'
  | 'plastic'
  | 'pop_art'
  | 'pop_renaissance'
  | 'psychedelic'
  | 'seamless'
  | 'street_art'
  | 'tablet_sketch'
  | 'urban_glow'
  | 'urban_sketching'
  | 'voxel'
  | 'watercolor'
  | 'young_adult_book'
  | 'young_adult_book_2'

interface ImageGenerationRequest {
  prompts: string[]
  style?: RecraftStyle
  aspectRatio?: string
}

interface RecraftResponse {
  created: number
  credits: number
  data: Array<{
    image_id: string
    url: string
    b64_json?: string
  }>
}

// Function to map style to base style and substyle (all are digital illustration substyles)
function getStyleConfig(inputStyle: string) {
  // Recraft V2 specific substyles
  const v2OnlySubstyles = [
    '3d', '80s', 'glow', 'kawaii', 'psychedelic', 'voxel', 'watercolor'
  ];
  
  // All digital illustration substyles (V2 & V3)
  const digitalIllustrationSubstyles = [
    '2d_art_poster', '2d_art_poster_2', '3d', '80s', 'antiquarian', 'bold_fantasy', 
    'child_book', 'cover', 'crosshatch', 'digital_engraving', 'engraving_color', 
    'expressionism', 'freehand_details', 'glow', 'grain', 'grain_20', 
    'graphic_intensity', 'hand_drawn', 'hand_drawn_outline', 'handmade_3d', 
    'hard_comics', 'infantile_sketch', 'kawaii', 'long_shadow', 'modern_folk', 
    'multicolor', 'neon_calm', 'noir', 'nostalgic_pastel', 'outline_details', 
    'pastel_gradient', 'pastel_sketch', 'pixel_art', 'plastic', 'pop_art', 
    'pop_renaissance', 'psychedelic', 'seamless', 'street_art', 'tablet_sketch', 
    'urban_glow', 'urban_sketching', 'voxel', 'watercolor', 'young_adult_book', 
    'young_adult_book_2'
  ];
  
  if (digitalIllustrationSubstyles.includes(inputStyle)) {
    const model = v2OnlySubstyles.includes(inputStyle) ? 'recraftv2' : 'recraftv3';
    return { style: 'digital_illustration', substyle: inputStyle, model };
  }
  
  // Default fallback to first substyle
  return { style: 'digital_illustration', substyle: '2d_art_poster', model: 'recraftv3' };
}

export async function POST(request: NextRequest) {
  try {
    const { prompts, style = '2d_art_poster', aspectRatio = '16:9' }: ImageGenerationRequest = await request.json()

    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json(
        { error: 'Prompts array is required' },
        { status: 400 }
      )
    }

    const RECRAFT_API_KEY = process.env.RECRAFT_API_KEY
    if (!RECRAFT_API_KEY) {
      return NextResponse.json(
        { error: 'Recraft API key not configured' },
        { status: 500 }
      )
    }

    // Generate images for each prompt
    const imageGenerationPromises = prompts.map(async (prompt, index) => {
      try {
        // Convert aspectRatio to supported Recraft sizes
        let size = '1024x1024'
        if (aspectRatio === '16:9') size = '1820x1024'  // 16:9 supported size
        else if (aspectRatio === '9:16') size = '1024x1820'  // 9:16 supported size
        else if (aspectRatio === '4:3') size = '1280x1024'  // Close to 4:3
        else if (aspectRatio === '3:4') size = '1024x1280'  // Close to 3:4

        const styleConfig = getStyleConfig(style)
        const requestBody: {
          prompt: string;
          style: string;
          size: string;
          model: string;
          negative_prompt: string;
          n: number;
          response_format: string;
          substyle?: string;
          controls?: {
            no_text: boolean;
            artistic_level?: number;
          };
        } = {
          prompt: `${prompt.length > 1000 ? prompt.substring(0, 900) : prompt}, without any text or writing`,
          style: styleConfig.style,
          size: size,
          model: styleConfig.model,
          negative_prompt: 'text, words, letters, writing, typography, fonts, captions, titles, labels, signs, symbols, numbers, alphabets, characters, inscriptions, annotations, watermarks, logos, brand names, headlines, subtitles, quotes, dialogue, speech bubbles',
          n: 1,
          response_format: 'url',
          controls: {
            no_text: true
          }
        }
        
        // Only add artistic_level for V3 models
        if (styleConfig.model === 'recraftv3') {
          requestBody.controls!.artistic_level = 2;
        }
        
        // Add substyle if it exists
        if (styleConfig.substyle) {
          requestBody.substyle = styleConfig.substyle
        }

        const response = await fetch('https://external.api.recraft.ai/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RECRAFT_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`API Error ${response.status}:`, errorText)
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
        }

        const result: RecraftResponse = await response.json()
        
        if (!result.data || result.data.length === 0) {
          throw new Error('No image generated')
        }

        const imageUrl = result.data[0].url

        return {
          index,
          prompt,
          imageUrl,
          taskId: null
        }
      } catch (error) {
        console.error(`Error generating image ${index + 1}:`, error)
        return {
          index,
          prompt,
          error: error instanceof Error ? error.message : 'Unknown error',
          taskId: null,
          imageUrl: null
        }
      }
    })

    const results = await Promise.all(imageGenerationPromises)
    
    // Check if any images were successfully generated
    const successfulImages = results.filter(result => result.imageUrl)
    const failedImages = results.filter(result => result.error)

    return NextResponse.json({
      success: true,
      images: results,
      summary: {
        total: prompts.length,
        successful: successfulImages.length,
        failed: failedImages.length
      }
    })

  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate images',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}