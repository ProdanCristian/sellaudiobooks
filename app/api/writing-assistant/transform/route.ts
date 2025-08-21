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

type TransformAction = "expand" | "shorten" | "fix_grammar" | "simplify" | "formal" | "casual" | "creative" | "persuasive" | "concise" | "dramatic" | "technical" | "friendly" | "tone";

interface TransformRequestBody {
  action: TransformAction;
  text: string;
  tone?: string;
}

function buildUserInstruction(action: TransformAction, tone?: string) {
  switch (action) {
    case "expand":
      return "Expand the text by 20-40% with richer detail and smoother flow.";
    case "shorten":
      return "Make the text more concise and clear while preserving meaning.";
    case "fix_grammar":
      return "Correct grammar, spelling, and punctuation without changing meaning or tone.";
    case "simplify":
      return "Rewrite the text using simpler words and shorter sentences while keeping the same meaning.";
    case "formal":
      return "Rewrite the text in a formal, professional tone suitable for business or academic writing.";
    case "casual":
      return "Rewrite the text in a casual, conversational tone as if speaking to a friend.";
    case "creative":
      return "Rewrite the text with more creative language, vivid imagery, and engaging expressions while preserving the core message.";
    case "persuasive":
      return "Rewrite the text to be more convincing and compelling, using persuasive language and stronger arguments.";
    case "concise":
      return "Make the text as brief and direct as possible while retaining all essential information.";
    case "dramatic":
      return "Rewrite the text with dramatic flair, emotional intensity, and powerful language to create impact.";
    case "technical":
      return "Rewrite the text using precise, technical language suitable for expert or professional audiences.";
    case "friendly":
      return "Rewrite the text in a warm, approachable, and friendly tone that feels welcoming and personal.";
    case "tone":
      return `Rewrite the text in a ${
        tone || "neutral"
      } tone while keeping meaning.`;
    default:
      return "Improve the text for clarity and flow.";
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TransformRequestBody;
    const { action, text, tone } = body;

    if (!action || !text || !text.trim()) {
      return NextResponse.json(
        { error: "action and text are required" },
        { status: 400 }
      );
    }

    const system = `You are a precise writing editor. Apply the requested transformation to the user's selection.

Requirements:
- Preserve factual meaning
- Keep author voice unless tone change is requested
- Return HTML paragraphs only using <p> for paragraphs and <br/> for line breaks
- Do not include any headings, introductions, explanations, or labels
- Do not wrap output in markdown
- Avoid extra whitespace at start/end`;

    const instruction = buildUserInstruction(action, tone);

    const messages = [
      { role: "system" as const, content: system },
      {
        role: "user" as const,
        content: `Instruction: ${instruction}\n\nSelected Text:\n${text}`,
      },
    ];

    const completion = await aiml.chat.completions.create({
      model: "gpt-5-chat-latest",
      messages,
      temperature: 0.4,
      max_tokens: 800,
      stream: false,
    });

    const html = completion.choices?.[0]?.message?.content?.trim() || "";
    if (!html) {
      return NextResponse.json(
        { error: "Empty response from model" },
        { status: 502 }
      );
    }

    return NextResponse.json({ html });
  } catch (error) {
    console.error("Transform error:", error);
    return NextResponse.json(
      { error: "Failed to transform text" },
      { status: 500 }
    );
  }
}
