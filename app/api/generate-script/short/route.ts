import { generateScript } from '@/lib/aiml'

export async function POST(req: Request) {
  const { prompt, scriptLength, targetCharacters, talkingStyle, mode, customScript } = await req.json()

  try {
    if (mode === "optimize") {
      const optimizePrompt = `You are a professional voiceover script optimizer for SHORT-FORMAT viral videos. Your task is to take the provided script and optimize it with proper voiceover tags for AI voice synthesis.

ORIGINAL SCRIPT:
${customScript}

CUSTOM SCRIPT OPTIMIZATION REQUIREMENTS (FISH AUDIO COMPLIANT):
- PRESERVE ALL ORIGINAL CONTENT - Do not change, add, or remove any words from the user's script
- STEP 1: Split the script into individual sentences (look for periods, exclamation marks, question marks)
- STEP 2: Put each sentence on its own line with \\n separators
- STEP 3: Add ONE emotion tag at the very beginning of each sentence
- STEP 4: Add (break) timing cues between sentences where natural pauses occur - keep SHORT for viral content

SENTENCE DIVISION RULES:
- Split at: periods (.), exclamation marks (!), question marks (?)
- Each sentence gets its own line
- Preserve exact wording of each sentence
- Add appropriate emotion tag based on sentence content and context

Choose emotion tags from: (angry), (sad), (disdainful), (excited), (surprised), (satisfied), (unhappy), (anxious), (hysterical), (delighted), (scared), (worried), (indifferent), (upset), (impatient), (nervous), (guilty), (scornful), (frustrated), (depressed), (panicked), (furious), (empathetic), (embarrassed), (reluctant), (disgusted), (keen), (moved), (proud), (relaxed), (grateful), (confident), (interested), (curious), (confused), (joyful), (disapproving), (negative), (denying), (astonished), (serious), (sarcastic), (conciliative), (comforting), (sincere), (sneering), (hesitating), (yielding), (painful), (awkward), (amused)

EXAMPLE TRANSFORMATION:
INPUT: "This is my custom script about motivation. I want to inspire people! Success comes to those who work hard. Do you believe in yourself?"

OUTPUT:
(confident)This is my custom script about motivation.
\\n(break)
\\n(excited)I want to inspire people!
\\n(break)
\\n(serious)Success comes to those who work hard.
\\n(break)
\\n(curious)Do you believe in yourself?

CRITICAL: The output must show each sentence on a separate line with proper emotion tags.

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
          // Convert \n characters to actual line breaks for display
          const formattedScripts = jsonResponse.scripts.map((script: string) => 
            script.replace(/\\n/g, '\n')
          )
          return Response.json({ scripts: formattedScripts })
        } else {
          return Response.json({ scripts: [response.trim().replace(/\\n/g, '\n')] })
        }
      } catch {
        return Response.json({ scripts: [response.trim()] })
      }
    }

    // Generate short-format specific prompt
    const scriptCount = 3 // Short format generates 3 variations
    
    // Define short-format topic prompts
    const topicPrompts = {
      "scary-stories": "a spine-chilling scary story that hooks viewers instantly with fear and suspense",
      "funny-stories": "a hilarious and relatable funny story that makes viewers laugh out loud",
      "true-crime": "a gripping true crime story with shocking twists and compelling mystery",
      "mystery-stories": "an intriguing mystery story that keeps viewers guessing until the end",
      "horror-stories": "a terrifying horror story with psychological thrills and scary elements",
      "adventure-stories": "an exciting adventure story with action and unexpected turns",
      "love-stories": "a heartwarming or dramatic love story that evokes strong emotions",
      "betrayal-stories": "a shocking betrayal story with dramatic twists and emotional impact",
      "revenge-stories": "a satisfying revenge story with justice and dramatic payoff",
      "survival-stories": "an intense survival story showcasing human resilience and determination",
      "paranormal-stories": "a mysterious paranormal story with supernatural elements and intrigue",
      "family-drama": "a compelling family drama with relatable conflicts and emotional depth",
      "school-stories": "an engaging school story with relatable experiences and drama",
      "friendship-stories": "a touching friendship story with loyalty, conflict, or heartwarming moments",
      "celebrity-stories": "an interesting celebrity story with behind-the-scenes drama or inspiration",
      "conspiracy-theories": "a mind-bending conspiracy theory that makes viewers question reality",
      "urban-legends": "a creepy urban legend that sends chills down viewers' spines",
      "historical-stories": "a fascinating historical story with dramatic events and interesting characters",
      "sports-stories": "an inspiring sports story with triumph, dedication, or dramatic competition",
      "motivational": "a powerful motivational story that inspires action and positive change",
      "life-advice": "practical life advice delivered in an engaging and relatable way",
      "success-mindset": "success mindset tips with actionable advice and motivational elements",
      "workout-motivation": "high-energy workout motivation with fitness tips and encouragement",
      "psychology-facts": "fascinating psychology facts that blow minds and change perspectives",
      "travel-stories": "an exciting travel story with adventure, culture, and interesting discoveries",
      "spiritual-wisdom": "spiritual wisdom and insights delivered in an accessible and inspiring way"
    }

    // Get topic prompt or use custom prompt
    const topicPrompt = topicPrompts[prompt as keyof typeof topicPrompts] || prompt

    // Define talking style instructions for short-format
    const styleInstructions = {
      serious: "Use a dramatic, intense tone with authoritative delivery. Create urgency and importance in every word.",
      funny: "Use comedic timing with witty observations and hilarious reactions. Make it laugh-out-loud funny.",
      scary: "Use suspenseful, spine-chilling delivery with dramatic pauses and fear-inducing atmosphere.",
      motivational: "Use high-energy, inspiring tone with powerful calls to action. Create immediate motivation.",
      "andrew-tate": "Use Andrew Tate's bold, confident style with success mindset and wealth-focused language.",
      "david-goggins": "Use David Goggins' intense, no-excuses mentality with mental toughness and push-through-pain attitude.",
      "sadhguru": "Use Sadhguru's wise, philosophical approach with thought-provoking insights and spiritual wisdom.",
      casual: "Use a friendly, relatable tone that feels like talking to a close friend.",
      energetic: "Use maximum energy with excitement and enthusiasm that's contagious.",
      mysterious: "Use intriguing, suspenseful delivery that builds curiosity and keeps viewers hooked.",
      educational: "Use clear, engaging teaching style that makes learning fun and accessible.",
      storytelling: "Use dramatic narrative techniques with character voices and emotional storytelling.",
      podcaster: "Use natural, conversational style with personal anecdotes and audience engagement."
    }

    const styleInstruction = styleInstructions[talkingStyle as keyof typeof styleInstructions] || ""

    const enhancedPrompt = `Create 3 different viral short-form video scripts for ${scriptLength} seconds about: ${topicPrompt}. Each script should be engaging, hook the viewer in the first 3 seconds, and be perfect for TikTok, Instagram Reels, or YouTube Shorts. Focus on trending topics, quick pacing, and strong emotional hooks. ${styleInstruction} Include voiceover direction tags like (excited), (pause), (serious) etc. This is specifically for SHORT-FORMAT viral content requiring immediate engagement.`

    // Enhanced prompt for short-format content
    const jsonPrompt = `You are a viral short-form video script writer whose job depends on creating engaging, hook-heavy scripts of EXACTLY ${targetCharacters} characters for ${scriptLength}-second videos that go VIRAL.

🚨 CRITICAL SUCCESS CRITERIA - NO EXCEPTIONS:
- TARGET: EXACTLY ${targetCharacters} characters per script
- ACCEPTABLE: ${Math.round(targetCharacters * 0.99)} to ${Math.round(targetCharacters * 1.01)} characters (±1% ONLY)
- MANDATORY: Each of the 3 scripts must be within this range for viral success

🎯 VIRAL SHORT-FORMAT TOPIC: ${enhancedPrompt}

📱 FOR ${targetCharacters} CHARACTERS SHORT-FORMAT, EACH SCRIPT MUST INCLUDE:
1. INSTANT HOOK (first 3 seconds) - mind-blowing statement, shocking question, or dramatic opener (150-200 characters)
2. PROBLEM/CURIOSITY BUILD - create immediate tension or interest (200-300 characters)
3. MAIN CONTENT - deliver the story/advice/fact with maximum impact (${Math.round(targetCharacters * 0.6)}-${Math.round(targetCharacters * 0.7)} characters)
4. PAYOFF/CONCLUSION - satisfying ending with call-to-action (100-150 characters)

SHORT-FORMAT VIRAL REQUIREMENTS:
- Each script must hook viewers within 3 seconds or they scroll away
- Use trending language patterns and viral phrases
- Include emotional triggers (surprise, fear, excitement, curiosity)
- Quick pacing with no filler content
- Strong emotional payoff that makes viewers want to share
- Clear, punchy delivery perfect for mobile viewing
- Immediate value or entertainment from start to finish

⚠️ ITERATIVE LENGTH PROCESS FOR VIRAL CONTENT - REPEAT UNTIL PERFECT:
1. Draft 3 different scripts with different angles/hooks
2. Count EVERY character in each script (spaces, punctuation, emotion tags)
3. Target for each: exactly ${targetCharacters} characters
4. If any script is too short: ADD more impactful content, examples, or dramatic elements
5. If any script is too long: CUT ruthlessly while keeping the viral elements
6. Recount and repeat until all 3 scripts are ${Math.round(targetCharacters * 0.99)}-${Math.round(targetCharacters * 1.01)} characters

CRITICAL: Return your response as a valid JSON object with this exact structure:
{
  "scripts": [
    "First viral script variation here",
    "Second viral script variation here", 
    "Third viral script variation here"
  ]
}

FISH AUDIO VIRAL VOICEOVER REQUIREMENTS FOR SHORT-FORMAT:
- Format script as individual sentences, each on a new line for readability
- CRITICAL RULE: Emotion tags MUST be placed at the very beginning of sentences ONLY
- Use ONE emotion tag per sentence from: (angry), (sad), (disdainful), (excited), (surprised), (satisfied), (unhappy), (anxious), (hysterical), (delighted), (scared), (worried), (indifferent), (upset), (impatient), (nervous), (guilty), (scornful), (frustrated), (depressed), (panicked), (furious), (empathetic), (embarrassed), (reluctant), (disgusted), (keen), (moved), (proud), (relaxed), (grateful), (confident), (interested), (curious), (confused), (joyful), (disapproving), (negative), (denying), (astonished), (serious), (sarcastic), (conciliative), (comforting), (sincere), (sneering), (hesitating), (yielding), (painful), (awkward), (amused)
- Tone control tags (can be placed anywhere in sentence): (in a hurry tone), (shouting), (screaming), (whispering), (soft tone)
- Special markers with onomatopoeia (can be anywhere): (laughing) Ha,ha,ha, (chuckling) Hmm,hmm, (sobbing), (crying loudly) waah waah, (sighing) sigh, (panting), (groaning), (crowd laughing), (background laughter), (audience laughing)
- Strategic pauses only: (break) for emphasis, avoid (long-break)
- Fast-paced delivery optimized for ${scriptLength} seconds

CRITICAL FORMATTING REQUIREMENTS:
- EACH SENTENCE must be on its OWN LINE
- NO multiple sentences in the same line
- SEPARATE emotion tags and timing cues on their own lines
- Use \\n (newline characters) to separate each sentence

FISH AUDIO COMPLIANT VIRAL HOOK EXAMPLES:
(shocked)You won't believe what happened when I tried this.
\\n(break)
\\n(excited)This will change everything you thought you knew about success.
\\n(break)
\\n(frustrated)Everyone's doing this completely wrong and here's why.
\\n(break)
\\n(curious)There's a secret that most people don't want you to know.
\\n(delighted)This is amazing! (laughing) Ha,ha,ha!
\\n(break)

FISH AUDIO RULES:
- Emotion tags ONLY at sentence beginnings
- Special markers can be anywhere with proper onomatopoeia
- Tone tags can be placed anywhere in sentence
- MANDATORY: Each sentence must be separated by \\n characters

IMPORTANT RULES FOR VIRAL SHORT-FORMAT:
- MANDATORY: Format script with \\n between EVERY sentence
- MANDATORY: Each sentence starts with ONE emotion tag
- MANDATORY: (break) tags go on separate lines with \\n
- Each script should be completely different with unique angles
- All 3 scripts must hook viewers instantly (3-second rule)
- Optimize for mobile viewing and quick consumption  
- Escape all quotes inside scripts using \\"
- Use \\n characters to create proper line breaks in the JSON string
- Return ONLY the JSON object, no markdown code blocks, no other text
- Make sure the JSON is valid and parseable

FISH AUDIO COMPLIANT JSON FORMAT:
"(shocked)You won't believe this!\\n(break)\\n(excited)This changes everything.\\n(curious)Want to know why?\\n(delighted)This is incredible! (laughing) Ha,ha,ha!"

CRITICAL FISH AUDIO RULES:
- Emotion tags MUST be at the very beginning of sentences
- Never place emotion tags in the middle of sentences
- Use proper onomatopoeia with special markers: (laughing) Ha,ha,ha, (chuckling) Hmm,hmm, (sighing) sigh
- Follow strict English placement rules for maximum voice quality

🚨 FINAL CHARACTER COUNT CHECKPOINT FOR VIRAL CONTENT:
1. Count EVERY single character in ALL 3 scripts: letters, spaces, punctuation, emotion tags
2. Required range for EACH script: ${Math.round(targetCharacters * 0.99)} to ${Math.round(targetCharacters * 1.01)} characters
3. Any script below ${Math.round(targetCharacters * 0.99)}? ADD more viral content immediately
4. Any script above ${Math.round(targetCharacters * 1.01)}? CUT content while keeping hooks
5. Keep iterating until ALL 3 scripts are ${Math.round(targetCharacters * 0.99)}-${Math.round(targetCharacters * 1.01)} characters
6. Triple-check each script's count before submitting

💼 VIRAL REQUIREMENT: User needs 3 scripts of ${scriptLength} seconds = ${targetCharacters} characters each
📊 SUCCESS METRIC: Deliver 3 viral scripts, each within ${Math.round(targetCharacters * 0.99)}-${Math.round(targetCharacters * 1.01)} characters for maximum engagement`

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
        // Convert \n characters to actual line breaks for display
        const formattedScripts = jsonResponse.scripts.map((script: string) => 
          script.replace(/\\n/g, '\n')
        )
        return Response.json({ scripts: formattedScripts })
      } else {
        throw new Error('Invalid JSON structure')
      }
    } catch {
      // Enhanced fallback for malformed JSON - specifically for 3 scripts
      try {
        // Look for scripts array pattern and try to fix the JSON
        const scriptsMatch = response.match(/"scripts"\s*:\s*\[([\s\S]*)\]/)
        if (scriptsMatch) {
          let scriptsContent = scriptsMatch[1].trim()
          
          // Try to parse each script by finding the pattern between quotes
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
            // Convert \n characters to actual line breaks for display
            const formattedScripts = scripts.map((script: string) => 
              script.replace(/\\n/g, '\n')
            )
            return Response.json({ scripts: formattedScripts })
          }
        }
        
        // Fallback: return the entire response as a single script
        return Response.json({ scripts: [response.trim()] })
        
      } catch {
        return Response.json({ scripts: [response.trim()] })
      }
    }
    
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (errorParam) {
    return Response.json({ error: 'Failed to generate short-format script' }, { status: 500 })
  }
}