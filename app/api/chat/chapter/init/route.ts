import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { chapterTitle } = await request.json();

    const welcomeMessage = {
      id: 'welcome',
      role: 'assistant' as const,
      content: `## 👋 Welcome!\nI'm here to help you write this chapter${chapterTitle ? ` (${chapterTitle})` : ''}.`,
      timestamp: new Date()
    };

    return NextResponse.json({ message: welcomeMessage });
  } catch (error) {
    console.error('Error initializing chapter chat:', error);
    return NextResponse.json(
      { error: "Failed to initialize chapter chat" },
      { status: 500 }
    );
  }
}