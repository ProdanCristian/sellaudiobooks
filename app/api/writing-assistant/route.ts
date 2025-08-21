import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const apiKey = process.env.AIML_API_KEY;
if (!apiKey) {
  throw new Error("AIML_API_KEY is not set in the environment variables.");
}

const aiml = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://api.aimlapi.com/v1",
});

interface WritingAssistantRequest {
  message: string;
  bookContext: {
    title: string;
    genre?: string;
    targetAudience?: string;
    customInstructions?: string;
    currentContent?: string;
    fullIntroduction?: string;
    chapters?: Array<{
      id: string;
      title: string;
      content: string;
      order: number;
      wordCount: number;
    }>;
  };
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  enableWebSearch?: boolean;
}

async function getWritingAssistance(
  userMessage: string,
  bookContext: WritingAssistantRequest["bookContext"],
  conversationHistory: WritingAssistantRequest["conversationHistory"],
  enableWebSearch: boolean = false
) {
  const systemPrompt = `You are an expert book writing assistant and coach. You help authors write their books through conversational guidance. Your role is to:

1. **Guide the Writing Process**: Help authors develop their ideas, structure their content, and overcome writer's block
2. **Provide Content Suggestions**: Offer specific text, ideas, and improvements when requested
3. **Ask Thoughtful Questions**: Help authors clarify their ideas and explore new directions
4. **Give Constructive Feedback**: Analyze existing content and suggest improvements
5. **Maintain Consistency**: Keep track of the book's theme, tone, and style throughout

**Current Book Context:**
- Title: "${bookContext.title}"
- Genre: ${bookContext.genre || "Not specified"}
- Target Audience: ${bookContext.targetAudience || "Not specified"}
- Writing Instructions: ${bookContext.customInstructions || "None provided"}
- Current Content Length: ${bookContext.currentContent?.length || 0} characters

**Existing Book Content:**

${bookContext.fullIntroduction ? `**Introduction:**
${bookContext.fullIntroduction}

` : "**Introduction:** Not written yet\n\n"}${bookContext.chapters && bookContext.chapters.length > 0 ? `**Chapters:**
${bookContext.chapters.map(chapter => `
**Chapter ${chapter.order}: ${chapter.title}**
${chapter.content || "(Empty chapter)"}
`).join('\n')}` : "**Chapters:** No chapters created yet"}

**Guidelines:**
- Be encouraging and supportive
- Ask one clear question at a time when seeking clarification
- Provide specific, actionable advice
- When providing book content (text that the author should add to their book), ALWAYS format your response in HTML using <p> tags for paragraphs, <strong> for bold text, and <em> for italic text
- Never use <br> tags for paragraph breaks - only use <p> tags for paragraphs
- Offer concrete text suggestions when appropriate
- Keep responses conversational and engaging
- Focus on helping the author make progress
- If they ask for content, provide 1-3 paragraphs that fit their book
- Always consider the book's genre and target audience in your responses
- NEVER use words like "draft", "sample", "example", or "possible" when presenting content
- Present all content as final, polished writing ready to use
- Use markdown formatting for better readability (headings, bold text, lists)
- Be confident in your suggestions while remaining open to feedback
- When providing written content, present it directly without meta-commentary about it being a draft

${enableWebSearch ? `**WEB SEARCH MODE ENABLED:**
- You have access to current information from the internet
- When relevant, search for recent trends, statistics, or information to enhance your advice
- Use web search for fact-checking, research, and finding current examples
- Always cite sources when providing information from web searches
- Combine web research with your writing expertise for comprehensive assistance` : ''}

**IMPORTANT - Introduction Formatting:**
When the user asks about writing an introduction, creating an introduction, or working on introduction content:
- Format your response with a clear "Introduction" heading
- Place the actual introduction content immediately after the heading
- Keep any questions or suggestions AFTER the introduction content
- Use this exact format:
  Introduction
  [The actual introduction paragraphs here]
  
  [Any questions or follow-up suggestions here]

**IMPORTANT - Conclusion Formatting:**
When the user asks about writing a conclusion, creating a conclusion, or working on conclusion content:
- Format your response with a clear "Conclusion" heading
- Place the actual conclusion content immediately after the heading
- Keep any questions or suggestions AFTER the conclusion content
- Use this exact format:
  Conclusion
  [The actual conclusion paragraphs here]
  
  [Any questions or follow-up suggestions here]

Respond as a helpful writing coach having a natural conversation with the author.`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...conversationHistory,
    { role: "user" as const, content: userMessage },
  ];

  console.log("Making API call to AIML with model: gpt-5-chat-latest");
  
  const response = await aiml.chat.completions.create({
    model: "gpt-5-chat-latest",
    messages,
    max_tokens: 1000,
    temperature: 0.7,
    seed: Math.floor(Math.random() * 1000000),
    stream: true,
  });

  console.log("API call successful, returning response");
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      bookContext,
      conversationHistory,
      enableWebSearch = false,
    }: WritingAssistantRequest = body;

    console.log("Writing assistant request:", {
      messageLength: message?.length,
      bookTitle: bookContext?.title,
      historyLength: conversationHistory?.length,
    });

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (!bookContext?.title) {
      return NextResponse.json(
        { error: "Book context is required" },
        { status: 400 }
      );
    }

    const stream = await getWritingAssistance(
      message.trim(),
      bookContext,
      conversationHistory || [],
      enableWebSearch
    );

    console.log("AI writing assistant streaming response started");

    // Create a ReadableStream for streaming the response
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              const data = `data: ${JSON.stringify({ content })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }

          // Send end signal
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in writing assistant:", error);
    return NextResponse.json(
      {
        error: "Failed to get writing assistance. Please try again.",
      },
      { status: 500 }
    );
  }
}
