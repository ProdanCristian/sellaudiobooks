import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const apiKey = process.env.COMET_API_KEY;
if (!apiKey) {
  throw new Error("COMET_API_KEY is not set in the environment variables.");
}

const comet = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://api.cometapi.com/v1",
});

async function generateBookTitles(prompt: string) {
  const titlePrompt = `You are an elite book title strategist.

Based on this concept: "${prompt}"

Create 5 standout, market-ready titles with real shelf appeal. Mix lengths and styles:
- Include 1–2 short punchy titles (1–3 words)
- Include 2–3 medium titles (4–7 words)
- Include exactly 1 longer title with a compelling subtitle, formatted as "Title: Subtitle" or "Title — Subtitle"

Quality rules:
- Use Title Case
- Each title on its own line (no bullets, no numbering, no quotes)
- Be specific, vivid, and benefit-oriented; avoid vague or generic phrasing
- Avoid clichéd words unless they are uniquely contextual: Guide, Handbook, The Ultimate, Complete, Mastering
- Incorporate the strongest hook(s) from the concept (outcome, transformation, audience, tension, or unique angle)
- Return ONLY the 5 titles and nothing else`;

  const response = await comet.chat.completions.create({
    model: "gpt-5-chat-latest",
    messages: [
      {
        role: "user",
        content: titlePrompt,
      },
    ],
    max_tokens: 500,
    temperature: 0.9,
    presence_penalty: 0.3,
    frequency_penalty: 0.2,
    seed: Math.floor(Math.random() * 1000000),
  });

  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const response = await generateBookTitles(prompt.trim());

    // Extract content from the API response
    const content = response.choices[0]?.message?.content || "";

    // Parse and normalize the content to extract titles
    const rawLines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => !line.toLowerCase().includes("titles:"))
      .filter((line) => !/^\d+[\.|\)]\s*/.test(line))
      .filter((line) => !line.startsWith("-"));

    const normalized = rawLines
      // strip surrounding quotes
      .map((t) => t.replace(/^[\"“”'‘’]+|[\"“”'‘’]+$/g, ""))
      // collapse whitespace
      .map((t) => t.replace(/\s+/g, " ").trim())
      // remove trailing punctuation that sometimes gets added
      .map((t) => t.replace(/[\s—-]+$/g, "").trim())
      .filter((t) => t.length > 0);

    // dedupe while preserving order
    const seen = new Set<string>();
    const titles: string[] = [];
    for (const t of normalized) {
      if (!seen.has(t.toLowerCase())) {
        seen.add(t.toLowerCase());
        titles.push(t);
      }
      if (titles.length === 5) break;
    }


    // Fallback if no titles extracted
    if (titles.length === 0) {
      return NextResponse.json({
        titles: [
          "Bold Beginnings",
          "Hidden Currents",
          "Beyond the Map",
          "Signals in the Noise: Finding Clarity in a Distracted World",
          "Edge of Tomorrow",
        ],
      });
    }

    // Ensure exactly 5 titles
    while (titles.length < 5) {
      titles.push(`Title Idea ${titles.length + 1}`);
    }

    return NextResponse.json({ titles: titles.slice(0, 5) });
  } catch (error) {
    console.error("Error generating titles:", error);
    return NextResponse.json(
      {
        error: "Failed to generate titles. Please try again.",
      },
      { status: 500 }
    );
  }
}
