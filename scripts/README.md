# Style Reference Generator

This script generates reference images for all available Recraft styles to be used as previews in the image generator component.

## Usage

### Prerequisites

1. Set your Recraft API key in the environment:
   ```bash
   export RECRAFT_API_KEY="your_recraft_api_key_here"
   ```

2. Make sure you have credits in your Recraft account (the script will generate 46 images)

### Running the Script

```bash
# From the project root
npm run generate-style-references
```

Or directly:
```bash
node scripts/generate-style-references.js
```

### What it does

1. **Generates 46 reference images** - one for each available Recraft style
2. **Uses unique prompts** - each style gets a prompt that showcases its characteristics
3. **Saves to public folder** - images are saved as `public/style-references/style-{style-name}.jpg`
4. **Creates metadata** - saves generation info in `public/style-references/metadata.json`
5. **Handles rate limits** - adds 2-second delays between requests
6. **Error handling** - continues generation even if some styles fail

### Output

The script creates:
- `public/style-references/style-{style-name}.jpg` for each style
- `public/style-references/metadata.json` with generation summary

### Style Categories

The script generates images for these style categories:

- **Artistic**: 2d_art_poster, 3d, 80s, psychedelic, watercolor, etc.
- **Sketch**: hand_drawn, kawaii, infantile_sketch, etc.
- **Effects**: glow, grain, pixel_art, voxel, etc.
- **Color**: modern_folk, multicolor, nostalgic_pastel, etc.
- **Book**: young_adult_book, young_adult_book_2
- **Special**: seamless

### Model Selection

The script automatically uses:
- **Recraft V2** for: 3d, 80s, glow, kawaii, psychedelic, voxel, watercolor
- **Recraft V3** for all other styles

### Cost Estimation

- V2 styles: $0.022 per image × 7 styles = ~$0.15
- V3 styles: $0.04 per image × 39 styles = ~$1.56
- **Total cost**: ~$1.71

### Troubleshooting

1. **API Key Error**: Make sure `RECRAFT_API_KEY` is set in your environment
2. **Rate Limit**: The script includes delays, but if you hit limits, increase the delay
3. **Missing Images**: Check the console output for specific error messages
4. **Permissions**: Make sure the script can write to the `public/style-references/` directory

### Integration

The generated images are automatically used by the `ImageGenerator` component to show style previews when users select different options.