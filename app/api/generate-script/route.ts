import { generateScript } from '@/lib/aiml'

export async function POST(req: Request) {
  const { prompt, type, scriptLength, targetCharacters, talkingStyle, mode, customScript } = await req.json()

  try {
    if (mode === "optimize") {
      const optimizePrompt = `You are a professional voiceover script optimizer. Your task is to take the provided script and optimize it with proper voiceover tags for AI voice synthesis.

ORIGINAL SCRIPT:
${customScript}

OPTIMIZATION REQUIREMENTS:
- Add Fish Audio emotion and control tags throughout the script
- Use emotion tags at the beginning of sentences: (excited), (confident), (surprised), (curious), (joyful), (relaxed), (interested), (amused), (satisfied), (grateful), (empathetic), (serious), (sincere), (comforting)
- Add tone control tags: (soft tone), (whispering), (in a hurry tone), (shouting)
- Include natural speech elements: (break), (laugh), (sigh), um, uh, well
- Add timing cues like (break) for pauses and (long-break) for longer pauses
- Keep the original meaning and flow but make it more engaging for voice synthesis
- Target length: approximately ${targetCharacters} characters

CRITICAL: Return your response as a valid JSON object:
{
  "scripts": [
    "Optimized script with voiceover tags here"
  ]
}

IMPORTANT RULES:
- Escape all quotes inside the script using \\"
- Keep script as single string without line breaks
- Return ONLY the JSON object, no markdown code blocks, no other text
- Make sure the JSON is valid and parseable`

      const response = await generateScript(optimizePrompt, targetCharacters)

      // Parse and return optimized script
      try {
        let cleanResponse = response.trim()
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        } else if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
        }
        
        const jsonResponse = JSON.parse(cleanResponse)
        if (jsonResponse.scripts && Array.isArray(jsonResponse.scripts)) {
          return Response.json(jsonResponse)
        } else {
          return Response.json({ scripts: [response.trim()] })
        }
      } catch {
        return Response.json({ scripts: [response.trim()] })
      }
    }

    // Generate appropriate prompt based on video type and topic
    const scriptCount = type === "short" ? 3 : 1
    
    // Define topic prompts
    const topicPrompts = {
      // Short video topics
      motivation: "an inspiring motivational story that transforms someone's mindset",
      tutorial: "a quick, actionable tutorial that solves a common problem",
      facts: "surprising and mind-blowing facts that will amaze viewers",
      lifestyle: "practical lifestyle tips that improve daily life",
      entertainment: "entertaining content that keeps viewers engaged",
      
      // Long video topics  
      education: "an educational deep dive that teaches complex concepts clearly",
      business: "a comprehensive business guide with actionable strategies",
      technology: "technology explained in an accessible and engaging way",
      history: "a historical documentary-style exploration",
      science: "a scientific exploration that makes complex topics understandable"
    }

    // Get topic prompt or use custom prompt
    const topicPrompt = topicPrompts[prompt as keyof typeof topicPrompts] || prompt

    // Define talking style instructions
    const styleInstructions = {
      motivational: "Use an inspiring, uplifting tone with powerful language. Include motivational phrases and calls to action. Be passionate and energetic.",
      educational: "Use a clear, informative tone. Break down complex concepts simply. Be authoritative but approachable.",
      casual: "Use a friendly, conversational tone. Include casual language and relatable examples. Be warm and approachable.",
      energetic: "Use high energy language with excitement. Include dynamic phrases and enthusiasm. Be vibrant and engaging.",
      professional: "Use a professional, authoritative tone. Be confident and credible. Include expert insights.",
      storytelling: "Use narrative techniques with compelling storytelling. Include vivid descriptions and emotional connections."
    }

    const styleInstruction = styleInstructions[talkingStyle as keyof typeof styleInstructions] || ""

    const enhancedPrompt = type === "short" 
      ? `Create 3 different viral short-form video scripts for ${scriptLength} seconds about: ${topicPrompt}. Each script should be engaging, hook the viewer in the first 3 seconds, and be perfect for TikTok, Instagram Reels, or YouTube Shorts. Focus on trending topics, quick pacing, and strong emotional hooks. ${styleInstruction} Include voiceover direction tags like (excited), (pause), (serious) etc.`
      : `Create 1 comprehensive long-form video script for ${Math.round(scriptLength / 60)} minutes about: ${topicPrompt}. The script should be educational and entertaining with deep insights, clear structure (engaging introduction, comprehensive main content, strong conclusion), perfect for YouTube with excellent audience retention. ${styleInstruction} Include voiceover direction tags like (excited), (pause), (serious), (break), (long-break) etc.`

    // EXTREME length enforcement with multiple iterations
    const jsonPrompt = `You are a script writer whose job depends on generating scripts of EXACTLY ${targetCharacters} characters. Your employment will be terminated if you fail to meet this requirement.

🚨 CRITICAL SUCCESS CRITERIA - NO EXCEPTIONS:
- TARGET: EXACTLY ${targetCharacters} characters per script
- ACCEPTABLE: ${Math.round(targetCharacters * 0.99)} to ${Math.round(targetCharacters * 1.01)} characters (±1% ONLY)
- MANDATORY: Script must be within this range or you are FIRED

🎯 TOPIC: ${enhancedPrompt}

${targetCharacters > 8000 ? `
📖 FOR ${targetCharacters} CHARACTERS, YOUR SCRIPT MUST INCLUDE:
1. Comprehensive introduction with engaging hook (800-1000 chars)
2. 6-8 main sections with detailed explanations (1200-1500 chars each)
3. Multiple real-world examples and case studies throughout
4. Personal anecdotes and expert insights 
5. Step-by-step breakdowns and practical advice
6. Historical context and industry perspectives
7. Future trends and actionable recommendations
8. Strong conclusion with call-to-action (600-800 chars)

CONTENT EXPANSION REQUIREMENTS:
- Each main point needs 2-3 supporting examples
- Include specific statistics, quotes, or research findings
- Add conversational elements and rhetorical questions
- Expand with analogies, metaphors, and comparisons
- Include detailed explanations of processes or concepts
- Add personal stories or industry anecdotes
- Provide comprehensive background information
` : `
📝 FOR ${targetCharacters} CHARACTERS, EXPAND WITH:
- Detailed explanations for each concept
- Multiple specific examples per point
- Personal anecdotes and stories
- Step-by-step processes
- Practical tips and advice
- Industry insights and trends
`}

⚠️ ITERATIVE LENGTH PROCESS - REPEAT UNTIL PERFECT:
1. Draft initial script about the topic
2. Count EVERY character (spaces, punctuation, emotion tags)
3. Current count vs target: ${targetCharacters} characters
4. If too short: ADD more content, examples, explanations
5. If too long: CONDENSE without losing core message
6. Recount characters and repeat steps 4-5 until perfect
7. Final verification: Must be ${Math.round(targetCharacters * 0.99)}-${Math.round(targetCharacters * 1.01)} characters

CRITICAL: Return your response as a valid JSON object with this exact structure:
{
  "scripts": [${scriptCount === 1 ? '\n    "Script content here"' : '\n    "Script 1 content here",\n    "Script 2 content here",\n    "Script 3 content here"'}
  ]
}

VOICEOVER REQUIREMENTS:
- Format each script as a VOICEOVER with Fish Audio emotion and control tags
- Use emotion tags at the beginning of sentences: (excited), (confident), (surprised), etc.
- Add tone control tags: (whispering), (shouting), (soft tone), (in a hurry tone)
- Include natural speech elements: (break), (laugh), (sigh), um, uh
- Add timing cues like (break) for pauses and (long-break) for longer pauses
- Make it sound natural and engaging for voice synthesis

EMOTION TAGS TO USE:
(excited) (confident) (surprised) (curious) (joyful) (relaxed) (interested) (amused) (satisfied) (grateful) (empathetic) (serious) (sincere) (comforting)

TONE TAGS TO USE:
(soft tone) (whispering) (in a hurry tone) (shouting)

NATURAL SPEECH:
(break) (long-break) (laugh) (sigh) um, uh, well

EXAMPLE FORMAT:
(excited)Hey everyone! (break) Today I'm going to share something that, um, completely changed my morning routine. (confident)Trust me, you'll want to try this. (soft tone)It's actually really simple but super effective. (curious)But here's the thing, most people don't realize how much their morning sets the tone for everything. (break) (interested)I used to wake up, grab my phone immediately, and boom - I was already stressed before even getting out of bed. (sigh) (joyful)But then I discovered this incredible technique that literally transformed everything...

IMPORTANT RULES:
- Each script should be a complete voiceover story with emotion tags
- Escape all quotes inside the scripts using \\"
- Keep scripts as single strings without line breaks
- Do NOT include VERSION labels or format markers  
- Return ONLY the JSON object, no markdown code blocks, no other text
- Make sure the JSON is valid and parseable

🚨 FINAL CHARACTER COUNT CHECKPOINT - YOUR JOB DEPENDS ON THIS:
1. Count EVERY single character: letters, spaces, punctuation, emotion tags, EVERYTHING
2. Required range: ${Math.round(targetCharacters * 0.99)} to ${Math.round(targetCharacters * 1.01)} characters
3. Below ${Math.round(targetCharacters * 0.99)}? You are FIRED - ADD content immediately
4. Above ${Math.round(targetCharacters * 1.01)}? You are FIRED - CUT content immediately
5. Keep iterating until EXACTLY ${Math.round(targetCharacters * 0.99)}-${Math.round(targetCharacters * 1.01)} characters
6. Triple-check your final count before submitting

💼 JOB REQUIREMENT: User needs ${scriptLength} seconds = ${targetCharacters} characters
📊 SUCCESS METRIC: Deliver within ${Math.round(targetCharacters * 0.99)}-${Math.round(targetCharacters * 1.01)} characters or face termination
🎯 FINAL CHECK: Does your script have exactly the right length? If not, fix it NOW.`

    const response = await generateScript(jsonPrompt, targetCharacters)

    // Handle empty responses
    if (!response || response.trim().length === 0) {
      return Response.json({ 
        error: 'AI service returned empty response. Please try again.' 
      }, { status: 500 })
    }

    // Try to parse JSON response
    try {
      // Strip markdown code blocks if present
      let cleanResponse = response.trim()
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      const jsonResponse = JSON.parse(cleanResponse)
      if (jsonResponse.scripts && Array.isArray(jsonResponse.scripts)) {
        return Response.json(jsonResponse)
      } else {
        throw new Error('Invalid JSON structure')
      }
    } catch {
      // Enhanced fallback: try to extract scripts from malformed JSON
      try {
        // Method 1: Look for scripts array pattern and try to fix the JSON
        const scriptsMatch = response.match(/"scripts"\s*:\s*\[([\s\S]*)\]/)
        if (scriptsMatch) {
          let scriptsContent = scriptsMatch[1].trim()
          
          // Try to close any unclosed JSON strings
          if (!scriptsContent.endsWith('"')) {
            scriptsContent += '"'
          }
          
          // Try to parse each script by finding the pattern between quotes
          // Look for script boundaries more carefully
          const scriptPattern = /"([^"]*(?:\\.[^"]*)*)"(?:\s*,\s*)?/g
          const scripts: string[] = []
          let match
          
          while ((match = scriptPattern.exec(scriptsContent)) !== null) {
            const script = match[1]
              .replace(/\\"/g, '"') // Unescape quotes
              .replace(/\\n/g, '\n') // Convert \n to actual newlines
              .trim()
            
            if (script.length > 50) {
              scripts.push(script)
            }
          }
          
          if (scripts.length > 0) {
            return Response.json({ scripts })
          }
        }
        
        // Find the scripts array content
        const arrayMatch = response.match(/"scripts"\s*:\s*\[([\s\S]*)\]/)
        if (arrayMatch) {
          const originalArray = arrayMatch[1]
          
          // Split by likely script boundaries (looking for ",\n or similar patterns)
          const potentialScripts = originalArray.split(/",\s*"(?=[A-Z(])|"(?:\s*,\s*)"/)
          
          const cleanedScripts = potentialScripts
            .map(script => {
              return script
                .replace(/^"/, '') // Remove leading quote
                .replace(/"$/, '') // Remove trailing quote
                .replace(/\\"/g, '"') // Unescape existing escapes
                .replace(/"/g, '\\"') // Re-escape all quotes properly
                .trim()
            })
            .filter(script => script.length > 50)
          
          if (cleanedScripts.length > 0) {
            // Convert back to proper format
            const finalScripts = cleanedScripts.map(script => 
              script.replace(/\\"/g, '"') // Unescape for final output
            )
            return Response.json({ scripts: finalScripts })
          }
        }
        
        // Method 3: Split by likely script separators
        // Look for patterns that might separate scripts
        const scriptSeparators = [
          /(?:\]\s*,\s*\[|\),\s*\()/g, // Between script blocks
          /(?:\."\s*,\s*"|\]\s*"?\s*,\s*"?\s*\[)/g, // End of one script, start of another
          /(?:\d+s\))\s*"?\s*,\s*"?\s*\(/g // Timestamp patterns
        ]
        
        for (const separator of scriptSeparators) {
          const parts = response.split(separator)
          if (parts.length > 1) {
            const scripts = parts
              .map(part => part.replace(/^[^a-zA-Z]*/, '').replace(/[^a-zA-Z.!?]*$/, '').trim())
              .filter(script => script.length > 100) // Longer threshold for this method
            
            if (scripts.length > 0) {
              return Response.json({ scripts })
            }
          }
        }
        
        // Method 4: Try splitting by VERSION markers  
        const versionScripts = response.split(/VERSION \d+:/i)
          .filter(script => script.trim().length > 50)
          .map(script => script.trim())
          .slice(1) // Remove empty first element
        
        if (versionScripts.length > 0) {
          return Response.json({ scripts: versionScripts })
        }
        
        // Last resort: return the entire response as a single script
        return Response.json({ scripts: [response.trim()] })
        
      } catch {
        return Response.json({ scripts: [response.trim()] })
      }
    }
    
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (errorParam) {
    return Response.json({ error: 'Failed to generate script' }, { status: 500 })
  }
}