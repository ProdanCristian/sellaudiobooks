import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadImageToR2 } from "@/lib/r2";

// Note: Simple MP3 concatenation. This assumes all MP3 chapter files share compatible codec params.
// For production-safe merging, a proper audio processing service (ffmpeg) should be used.

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookId } = await request.json();
    if (!bookId) {
      return NextResponse.json(
        { error: "bookId is required" },
        { status: 400 }
      );
    }

    const book = await prisma.book.findFirst({
      where: { id: bookId, user: { email: session.user.email } },
      include: {
        chapters: { orderBy: { order: "asc" } },
        audioGenerations: true,
      },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Collect chapter MP3 urls in order
    const chapterById = new Map(book.chapters.map((c) => [c.id, c]));
    const chapterAudios = book.audioGenerations
      .filter(
        (ag) =>
          ag.contentType === "CHAPTER" &&
          ag.status === "COMPLETED" &&
          ag.audioUrl &&
          ag.chapterId
      )
      .filter((ag) => chapterById.has(ag.chapterId!))
      .sort(
        (a, b) =>
          chapterById.get(a.chapterId!)!.order -
          chapterById.get(b.chapterId!)!.order
      );

    if (chapterAudios.length === 0) {
      return NextResponse.json(
        { error: "No completed chapter audios to merge" },
        { status: 400 }
      );
    }

    // Remote worker path
    const workerUrl = process.env.MERGE_WORKER_URL;
    if (workerUrl) {
      const chapterAudioUrls = chapterAudios.map((ag) => ag.audioUrl!);

      // Mark/ensure FULL_BOOK generation as PROCESSING to reflect job state
      const existingFull = await prisma.audioGeneration.findFirst({
        where: { bookId: book.id, contentType: "FULL_BOOK" },
      });
      if (existingFull) {
        await prisma.audioGeneration.update({
          where: { id: existingFull.id },
          data: { status: "PROCESSING", audioUrl: null, errorMessage: null },
        });
      } else {
        await prisma.audioGeneration.create({
          data: {
            status: "PROCESSING",
            voiceId: "merged",
            voiceName: "Merged Chapters",
            contentType: "FULL_BOOK",
            textLength: 0,
            bookId: book.id,
          },
        });
      }

      // Build callback URL from request headers
      const proto = request.headers.get("x-forwarded-proto") || "https";
      const host =
        request.headers.get("x-forwarded-host") || request.headers.get("host");
      const baseUrl = `${proto}://${host}`;
      const callbackUrl = `${baseUrl}/api/generation/audio/merge/callback`;

      const resp = await fetch(workerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: book.id,
          chapterAudioUrls,
          callbackUrl,
        }),
      });

      if (resp.ok) {
        return NextResponse.json({ success: true, queued: true });
      } else {
        console.warn(
          "Remote merge worker returned non-OK, falling back to local merge:",
          resp.status
        );
      }
    }

    // Fetch and concatenate MP3 binaries
    const buffers: Uint8Array[] = [];
    for (const ag of chapterAudios) {
      try {
        const res = await fetch(ag.audioUrl!);
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const arr = new Uint8Array(await res.arrayBuffer());
        buffers.push(arr);
      } catch (e) {
        console.error("Failed to fetch chapter audio:", ag.audioUrl, e);
      }
    }

    if (buffers.length === 0) {
      return NextResponse.json(
        { error: "Failed to download chapter audios" },
        { status: 500 }
      );
    }

    // Naive concatenation (works for many simple MP3s; not sample-accurate)
    const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const b of buffers) {
      merged.set(b, offset);
      offset += b.length;
    }

    // Upload merged MP3 to R2
    const sanitizedTitle = (book.title || "audiobook")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 50);
    const timestamp = Date.now();
    const fileName = `audio/${sanitizedTitle}-merged-${timestamp}.mp3`;
    const audioUrl = await uploadImageToR2(
      "sellaudiobooks",
      fileName,
      Buffer.from(merged),
      "audio/mpeg"
    );

    // Upsert FULL_BOOK AudioGeneration
    const existing = await prisma.audioGeneration.findFirst({
      where: { bookId: book.id, contentType: "FULL_BOOK" },
    });

    if (existing) {
      await prisma.audioGeneration.update({
        where: { id: existing.id },
        data: {
          status: "COMPLETED",
          audioUrl,
          voiceId: existing.voiceId,
          voiceName: existing.voiceName,
        },
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
          bookId: book.id,
        },
      });
    }

    return NextResponse.json({ success: true, audioUrl });
  } catch (error) {
    console.error("Merge audio error:", error);
    return NextResponse.json(
      { error: "Failed to merge audio" },
      { status: 500 }
    );
  }
}
