import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// All available styles with appropriate prompts for each
const stylePrompts = [
  { style: '2d_art_poster', prompt: 'A vibrant movie poster featuring a hero standing on a cliff overlooking a futuristic city' },
  { style: '2d_art_poster_2', prompt: 'An epic fantasy adventure poster with a warrior wielding a magical sword' },
  { style: '3d', prompt: 'A modern 3D rendered character in a sleek environment with dramatic lighting' },
  { style: '80s', prompt: 'A retro synthwave scene with neon lights, palm trees and a classic sports car' },
  { style: 'antiquarian', prompt: 'An ancient library with old books, scrolls and mysterious artifacts' },
  { style: 'bold_fantasy', prompt: 'A mighty dragon soaring over a medieval castle with knights below' },
  { style: 'child_book', prompt: 'A friendly forest animal having a tea party in a magical woodland' },
  { style: 'cover', prompt: 'A mysterious book cover with an ornate key and swirling magical energy' },
  { style: 'crosshatch', prompt: 'A detailed portrait of an old wise man with intricate crosshatched shadows' },
  { style: 'digital_engraving', prompt: 'An elegant Victorian-era mansion with detailed architectural elements' },
  { style: 'engraving_color', prompt: 'A botanical illustration of exotic flowers with fine detailed linework' },
  { style: 'expressionism', prompt: 'An emotional portrait with bold brushstrokes and vivid colors' },
  { style: 'freehand_details', prompt: 'A sketchy urban street scene with loose, expressive linework' },
  { style: 'glow', prompt: 'A magical forest at night with glowing mushrooms and ethereal light' },
  { style: 'grain', prompt: 'A nostalgic photograph of a vintage coffee shop with film grain texture' },
  { style: 'grain_20', prompt: 'A moody black and white portrait with heavy film grain effect' },
  { style: 'graphic_intensity', prompt: 'A dynamic superhero in action with bold colors and sharp contrasts' },
  { style: 'hand_drawn', prompt: 'A charming hand-sketched landscape with rolling hills and a cottage' },
  { style: 'hand_drawn_outline', prompt: 'A simple line drawing of a cute cat sitting by a window' },
  { style: 'handmade_3d', prompt: 'A clay-like character in a whimsical miniature world' },
  { style: 'hard_comics', prompt: 'A gritty comic book hero in a dark urban environment' },
  { style: 'infantile_sketch', prompt: 'A childlike drawing of a family house with a rainbow and sun' },
  { style: 'kawaii', prompt: 'Adorable anime-style characters having a picnic in a cherry blossom garden' },
  { style: 'long_shadow', prompt: 'A minimalist cityscape with long geometric shadows at sunset' },
  { style: 'modern_folk', prompt: 'A contemporary folk art scene with geometric patterns and nature motifs' },
  { style: 'multicolor', prompt: 'A vibrant abstract composition with flowing rainbow colors' },
  { style: 'neon_calm', prompt: 'A serene meditation scene with soft neon accents and peaceful energy' },
  { style: 'noir', prompt: 'A detective in a 1940s city street with dramatic shadows and rain' },
  { style: 'nostalgic_pastel', prompt: 'A dreamy vintage carousel with soft pastel colors and gentle lighting' },
  { style: 'outline_details', prompt: 'A detailed architectural sketch of a Gothic cathedral with fine outlines' },
  { style: 'pastel_gradient', prompt: 'A peaceful sunset landscape with soft gradient colors blending beautifully' },
  { style: 'pastel_sketch', prompt: 'A gentle portrait of a young woman in soft pastel tones' },
  { style: 'pixel_art', prompt: 'A retro 8-bit style adventure scene with a brave knight and pixelated castle' },
  { style: 'plastic', prompt: 'A toy-like scene with colorful plastic figurines in a miniature world' },
  { style: 'pop_art', prompt: 'A bold pop art portrait with bright colors and Ben-Day dots pattern' },
  { style: 'pop_renaissance', prompt: 'A classical Renaissance painting reimagined with modern pop art elements' },
  { style: 'psychedelic', prompt: 'A trippy 1960s scene with swirling patterns, bright colors and surreal imagery' },
  { style: 'seamless', prompt: 'A repeating pattern design with geometric shapes and natural elements' },
  { style: 'street_art', prompt: 'A vibrant graffiti mural on a brick wall depicting urban life' },
  { style: 'tablet_sketch', prompt: 'A digital sketch of a mountain landscape done on a drawing tablet' },
  { style: 'urban_glow', prompt: 'A futuristic city at night with neon signs and glowing advertisements' },
  { style: 'urban_sketching', prompt: 'A quick sketch of a busy city intersection with people and traffic' },
  { style: 'voxel', prompt: 'A blocky 3D voxel world with cubic trees, houses and characters' },
  { style: 'watercolor', prompt: 'A delicate watercolor painting of flowers with soft washes and bleeding colors' },
  { style: 'young_adult_book', prompt: 'A romantic fantasy book cover with two characters in an enchanted forest' },
  { style: 'young_adult_book_2', prompt: 'A dystopian YA novel cover featuring a brave teenager in a futuristic setting' }
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
  
  console.log(`[${index + 1}/${total}] Generating reference for: ${style}`);
  
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
    
    // Create directory if it doesn't exist
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    await downloadImage(imageUrl, filepath);
    console.log(`✅ Saved: ${filename}`);
    
    return { style, filename, success: true };
    
  } catch (error) {
    console.error(`❌ Failed to generate ${style}:`, error.message);
    return { style, error: error.message, success: false };
  }
}

// Main function
async function generateAllStyleReferences() {
  console.log('🎨 Starting style reference generation...');
  console.log(`Total styles to generate: ${stylePrompts.length}`);
  
  // Check if API key is available
  if (!process.env.RECRAFT_API_KEY) {
    console.error('❌ RECRAFT_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  const results = [];
  
  // Generate images sequentially to avoid rate limits
  for (let i = 0; i < stylePrompts.length; i++) {
    const result = await generateStyleReference(stylePrompts[i], i, stylePrompts.length);
    results.push(result);
    
    // Add delay between requests to respect rate limits
    if (i < stylePrompts.length - 1) {
      console.log('⏳ Waiting 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('\n📊 Generation Summary:');
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed styles:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.style}: ${r.error}`);
    });
  }
  
  // Save metadata
  const metadata = {
    generated: new Date().toISOString(),
    total: stylePrompts.length,
    successful,
    failed,
    styles: results.filter(r => r.success).map(r => ({
      style: r.style,
      filename: r.filename
    }))
  };
  
  const metadataPath = path.join(__dirname, '..', 'public', 'style-references', 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  
  console.log('\n🎉 Style reference generation complete!');
  console.log(`📁 Images saved in: public/style-references/`);
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAllStyleReferences().catch(console.error);
}

export { generateAllStyleReferences };