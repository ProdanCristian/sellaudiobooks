import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only the failed V2 styles
const failedStylePrompts = [
  { style: '3d', prompt: 'A modern 3D rendered character in a sleek environment with dramatic lighting' },
  { style: '80s', prompt: 'A retro synthwave scene with neon lights, palm trees and a classic sports car' },
  { style: 'glow', prompt: 'A magical forest at night with glowing mushrooms and ethereal light' },
  { style: 'kawaii', prompt: 'Adorable anime-style characters having a picnic in a cherry blossom garden' },
  { style: 'psychedelic', prompt: 'A trippy 1960s scene with swirling patterns, bright colors and surreal imagery' },
  { style: 'voxel', prompt: 'A blocky 3D voxel world with cubic trees, houses and characters' },
  { style: 'watercolor', prompt: 'A delicate watercolor painting of flowers with soft washes and bleeding colors' }
];

// Function to get style config (copied from API route)
function getStyleConfig(inputStyle) {
  const v2OnlySubstyles = [
    '3d', '80s', 'glow', 'kawaii', 'psychedelic', 'voxel', 'watercolor'
  ];
  
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
  
  return { style: 'digital_illustration', substyle: '2d_art_poster', model: 'recraftv3' };
}

// Function to download image
async function downloadImage(url, filepath) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(filepath, buffer);
}

// Function to generate image for a style
async function generateStyleReference(styleData, index, total) {
  const { style, prompt } = styleData;
  
  console.log(`[${index + 1}/${total}] Regenerating failed style: ${style}`);
  
  try {
    const styleConfig = getStyleConfig(style);
    const requestBody = {
      prompt: `${prompt}, without any text or writing, high quality, detailed`,
      style: styleConfig.style,
      size: '1024x1024',
      model: styleConfig.model,
      negative_prompt: 'text, words, letters, writing, typography, fonts, captions, titles, labels, signs, symbols, numbers, alphabets, characters, inscriptions, annotations, watermarks, logos, brand names, headlines, subtitles, quotes, dialogue, speech bubbles',
      n: 1,
      response_format: 'url',
      controls: {
        no_text: true
      }
    };
    
    // Only add artistic_level for V3 models
    if (styleConfig.model === 'recraftv3') {
      requestBody.controls.artistic_level = 2;
    }
    
    if (styleConfig.substyle) {
      requestBody.substyle = styleConfig.substyle;
    }

    const response = await fetch('https://external.api.recraft.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RECRAFT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.data || result.data.length === 0) {
      throw new Error('No image generated');
    }

    const imageUrl = result.data[0].url;
    const filename = `style-${style}.jpg`;
    const filepath = path.join(__dirname, '..', 'public', 'style-references', filename);
    
    await downloadImage(imageUrl, filepath);
    console.log(`✅ Saved: ${filename}`);
    
    return { style, filename, success: true };
    
  } catch (error) {
    console.error(`❌ Failed to generate ${style}:`, error.message);
    return { style, error: error.message, success: false };
  }
}

// Main function
async function generateFailedStyleReferences() {
  console.log('🔄 Regenerating failed V2 style references...');
  console.log(`Failed styles to regenerate: ${failedStylePrompts.length}`);
  
  // Check if API key is available
  if (!process.env.RECRAFT_API_KEY) {
    console.error('❌ RECRAFT_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  const results = [];
  
  // Generate images sequentially to avoid rate limits
  for (let i = 0; i < failedStylePrompts.length; i++) {
    const result = await generateStyleReference(failedStylePrompts[i], i, failedStylePrompts.length);
    results.push(result);
    
    // Add delay between requests to respect rate limits
    if (i < failedStylePrompts.length - 1) {
      console.log('⏳ Waiting 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('\n📊 Regeneration Summary:');
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ Still failed styles:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.style}: ${r.error}`);
    });
  }
  
  console.log('\n🎉 Failed style regeneration complete!');
  if (successful === failedStylePrompts.length) {
    console.log('🎊 All failed styles have been successfully generated!');
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  generateFailedStyleReferences().catch(console.error);
}

export { generateFailedStyleReferences };