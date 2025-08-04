import { generateScript } from '@/lib/aiml'

export async function POST(req: Request) {
  const { prompt, scriptLength, targetCharacters, talkingStyle, mode, customScript } = await req.json()

  try {
    if (mode === "optimize") {
      const optimizePrompt = `You are a professional voiceover script optimizer for LONG-FORMAT videos. Your task is to take the provided script and optimize it with proper voiceover tags for AI voice synthesis.

ORIGINAL SCRIPT:
${customScript}

CUSTOM SCRIPT OPTIMIZATION REQUIREMENTS (FISH AUDIO COMPLIANT):
- PRESERVE ALL ORIGINAL CONTENT - Do not change, add, or remove any words from the user's script
- STEP 1: Split the script into individual sentences (look for periods, exclamation marks, question marks)
- STEP 2: Put each sentence on its own line with \\n separators
- STEP 3: Add ONE emotion tag at the very beginning of each sentence
- STEP 4: Add (break) or (long-break) timing cues between sentences where natural pauses occur

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

    // Generate long-format specific prompt
    const scriptCount = 1 // Long format always generates 1 script
    
    // Define long-format topic prompts
    const topicPrompts = {
      education: "an educational deep dive that teaches complex concepts clearly with comprehensive examples",
      business: "a comprehensive business guide with actionable strategies and real-world case studies",
      technology: "technology explained in an accessible and engaging way with detailed explanations",
      history: "a historical documentary-style exploration with rich storytelling",
      science: "a scientific exploration that makes complex topics understandable with thorough analysis",
      lifestyle: "an in-depth lifestyle guide with practical tips and detailed implementation steps",
      motivation: "a comprehensive motivational journey with personal stories and actionable advice",
      tutorial: "a detailed tutorial with step-by-step instructions and troubleshooting tips"
    }

    // Get topic prompt or use custom prompt
    const topicPrompt = topicPrompts[prompt as keyof typeof topicPrompts] || prompt

    // Define talking style instructions for long-format
    const styleInstructions = {
      serious: "Use a professional, authoritative tone with deep analysis. Include expert insights and maintain credibility throughout.",
      funny: "Use humor strategically throughout the long-form content. Include amusing anecdotes and light-hearted observations while maintaining educational value.",
      scary: "Build tension gradually throughout the narrative. Use dramatic pauses and atmospheric descriptions for sustained engagement.",
      motivational: "Use an inspiring, uplifting tone with powerful language. Include personal stories, challenges overcome, and calls to action throughout.",
      "andrew-tate": "Use Andrew Tate's confident, direct style with bold statements and success-focused mindset. Include wealth and success themes.",
      "david-goggins": "Use David Goggins' intense, no-excuses mentality with mental toughness themes and overcoming adversity.",
      "sadhguru": "Use Sadhguru's wise, philosophical approach with spiritual insights and thought-provoking questions.",
      casual: "Use a friendly, conversational tone throughout. Include personal anecdotes and relatable examples for extended engagement.",
      energetic: "Maintain high energy throughout the extended content. Use dynamic language and enthusiasm while varying pace.",
      mysterious: "Build intrigue and suspense throughout the long narrative. Use atmospheric descriptions and gradual revelations.",
      educational: "Use a clear, informative tone with comprehensive explanations. Break down complex concepts systematically.",
      storytelling: "Use narrative techniques with compelling storytelling throughout. Include character development and plot progression.",
      podcaster: "Use a natural, conversational podcaster style with personal insights and audience engagement techniques."
    }

    const styleInstruction = styleInstructions[talkingStyle as keyof typeof styleInstructions] || ""

    const enhancedPrompt = `Create 1 comprehensive long-form video script for ${Math.round(scriptLength / 60)} minutes about: ${topicPrompt}. The script should be educational and entertaining with deep insights, clear structure (engaging introduction, comprehensive main content with multiple sections, strong conclusion), perfect for YouTube with excellent audience retention. ${styleInstruction} Include voiceover direction tags like (excited), (pause), (serious), (break), (long-break) etc. This is specifically for LONG-FORMAT content requiring detailed exploration of the topic.`

    // Enhanced prompt for long-format content
    const jsonPrompt = `You are an expert long-form video script writer whose job depends on creating comprehensive, engaging scripts of EXACTLY ${targetCharacters} characters for ${Math.round(scriptLength / 60)}-minute videos.

🚨 CRITICAL SUCCESS CRITERIA - NO EXCEPTIONS:
- TARGET: EXACTLY ${targetCharacters} characters per script
- ACCEPTABLE: ${Math.round(targetCharacters * 0.99)} to ${Math.round(targetCharacters * 1.01)} characters (±1% ONLY)
- MANDATORY: Script must be within this range for long-format success

🎯 LONG-FORMAT TOPIC: ${enhancedPrompt}

📖 FOR ${targetCharacters} CHARACTERS LONG-FORMAT, YOUR SCRIPT MUST INCLUDE:
1. Compelling hook and introduction (800-1200 characters)
2. 6-10 main sections with comprehensive explanations (1500-2000 characters each)
3. Multiple detailed examples, case studies, and real-world applications
4. Personal anecdotes, expert insights, and industry perspectives
5. Step-by-step breakdowns and practical implementation guides
6. Historical context, current trends, and future predictions
7. Audience engagement elements (questions, challenges, interactive moments)
8. Strong conclusion with comprehensive recap and clear call-to-action (800-1200 characters)

LONG-FORMAT CONTENT EXPANSION REQUIREMENTS:
- Each main point needs 3-5 supporting examples with detailed explanations
- Include specific statistics, research findings, and expert quotes
- Add comprehensive background information and context
- Expand with detailed analogies, metaphors, and comparisons
- Include extensive practical applications and real-world scenarios
- Add multiple personal stories and industry case studies
- Provide thorough explanations of processes, concepts, and methodologies
- Include audience retention hooks throughout (every 30-60 seconds of content)

⚠️ ITERATIVE LENGTH PROCESS FOR LONG-FORMAT - REPEAT UNTIL PERFECT:
1. Draft comprehensive script covering all required sections
2. Count EVERY character (spaces, punctuation, emotion tags)
3. Current count vs target: ${targetCharacters} characters
4. If too short: ADD more detailed explanations, examples, case studies
5. If too long: CONDENSE without losing educational value or engagement
6. Recount characters and repeat steps 4-5 until perfect
7. Final verification: Must be ${Math.round(targetCharacters * 0.99)}-${Math.round(targetCharacters * 1.01)} characters

CRITICAL: Return your response as a valid JSON object with this exact structure:
{
  "scripts": [
    "Long-format script content here"
  ]
}

FISH AUDIO LONG-FORMAT VOICEOVER REQUIREMENTS:
- Format script as individual sentences, each on a new line for readability
- CRITICAL RULE: Emotion tags MUST be placed at the very beginning of sentences ONLY
- Use ONE emotion tag per sentence from: (angry), (sad), (disdainful), (excited), (surprised), (satisfied), (unhappy), (anxious), (hysterical), (delighted), (scared), (worried), (indifferent), (upset), (impatient), (nervous), (guilty), (scornful), (frustrated), (depressed), (panicked), (furious), (empathetic), (embarrassed), (reluctant), (disgusted), (keen), (moved), (proud), (relaxed), (grateful), (confident), (interested), (curious), (confused), (joyful), (disapproving), (negative), (denying), (astonished), (serious), (sarcastic), (conciliative), (comforting), (sincere), (sneering), (hesitating), (yielding), (painful), (awkward), (amused)
- Tone control tags (can be placed anywhere in sentence): (in a hurry tone), (shouting), (screaming), (whispering), (soft tone)
- Special markers with onomatopoeia (can be anywhere): (laughing) Ha,ha,ha, (chuckling) Hmm,hmm, (sobbing), (crying loudly) waah waah, (sighing) sigh, (panting), (groaning), (crowd laughing), (background laughter), (audience laughing)
- Timing cues: (break), (long-break) for section transitions
- Strategic pacing for ${Math.round(scriptLength / 60)}-minute duration

CRITICAL FORMATTING REQUIREMENTS:
- EACH SENTENCE must be on its OWN LINE
- NO multiple sentences in the same line
- SEPARATE emotion tags and timing cues on their own lines
- Use \\n (newline characters) to separate each sentence

FISH AUDIO COMPLIANT STRUCTURE EXAMPLE:
(excited)Welcome everyone!
\\n(break)
\\n(confident)Today we're diving deep into something that will completely transform your understanding of this topic.
\\n(serious)I'm going to share everything I've learned over the years, including the mistakes I made so you don't have to.
\\n(long-break)
\\n(curious)But first, let me ask you something important.
\\n(break)
\\n(interested)If you've ever wondered about this concept, you're in for a treat because we're covering that and so much more.
\\n(delighted)This is going to be amazing! (laughing) Ha,ha,ha!
\\n(long-break)

FISH AUDIO RULES:
- Emotion tags ONLY at sentence beginnings
- Special markers can be anywhere with proper onomatopoeia
- Tone tags can be placed anywhere in sentence
- MANDATORY: Each sentence must be separated by \\n characters

IMPORTANT RULES FOR LONG-FORMAT:
- MANDATORY: Format script with \\n between EVERY sentence
- MANDATORY: Each sentence starts with ONE emotion tag
- MANDATORY: (break) and (long-break) go on separate lines with \\n
- Script should sustain interest for full ${Math.round(scriptLength / 60)}-minute duration
- Include audience retention elements every 30-60 seconds
- Escape all quotes inside the script using \\"
- Use \\n characters to create proper line breaks in the JSON string
- Return ONLY the JSON object, no markdown code blocks, no other text
- Make sure the JSON is valid and parseable

FISH AUDIO COMPLIANT JSON FORMAT:
"(excited)Welcome everyone!\\n(break)\\n(confident)Today I'm sharing something amazing.\\n(curious)Have you ever wondered about this?\\n(delighted)This is incredible! (laughing) Ha,ha,ha!"

CRITICAL FISH AUDIO RULES:
- Emotion tags MUST be at the very beginning of sentences
- Never place emotion tags in the middle of sentences
- Use proper onomatopoeia with special markers
- Follow strict English placement rules

🚨 FINAL CHARACTER COUNT CHECKPOINT FOR LONG-FORMAT:
1. Count EVERY single character: letters, spaces, punctuation, emotion tags, EVERYTHING
2. Required range: ${Math.round(targetCharacters * 0.99)} to ${Math.round(targetCharacters * 1.01)} characters
3. Below ${Math.round(targetCharacters * 0.99)}? ADD more comprehensive content immediately
4. Above ${Math.round(targetCharacters * 1.01)}? CONDENSE content while maintaining quality
5. Keep iterating until EXACTLY ${Math.round(targetCharacters * 0.99)}-${Math.round(targetCharacters * 1.01)} characters
6. Triple-check your final count before submitting

💼 LONG-FORMAT REQUIREMENT: User needs ${scriptLength} seconds = ${targetCharacters} characters of comprehensive content
📊 SUCCESS METRIC: Deliver within ${Math.round(targetCharacters * 0.99)}-${Math.round(targetCharacters * 1.01)} characters for perfect long-format pacing`

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
      // Fallback for malformed JSON
      return Response.json({ scripts: [response.trim()] })
    }
    
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (errorParam) {
    return Response.json({ error: 'Failed to generate long-format script' }, { status: 500 })
  }
}