import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Expected worker payload: { bookId: string, audioUrl: string, error?: string }
export async function POST(request: NextRequest) {
  try {
    const { bookId, audioUrl, error } = await request.json();
    if (!bookId) {
      return NextResponse.json({ error: "bookId required" }, { status: 400 });
    }

    const existing = await prisma.audioGeneration.findFirst({
      where: { bookId, contentType: "FULL_BOOK" },
    });

    if (error) {
      if (existing) {
        await prisma.audioGeneration.update({
          where: { id: existing.id },
          data: { status: "FAILED", errorMessage: error },
        });
      }
      return NextResponse.json({ success: true });
    }

    if (!audioUrl) {
      return NextResponse.json(
        { error: "audioUrl required when no error" },
        { status: 400 }
      );
    }

    if (existing) {
      await prisma.audioGeneration.update({
        where: { id: existing.id },
        data: { status: "COMPLETED", audioUrl },
      });
    } else {
      await prisma.audioGeneration.create({
        data: {
          status: "COMPLETED",
          audioUrl,
          voiceId: "merged",
          voiceName: "Merged Chapters",
          contentType: "FULL_BOOK",
          textLength: 0,
          bookId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to handle merge callback" },
      { status: 500 }
    );
  }
}
