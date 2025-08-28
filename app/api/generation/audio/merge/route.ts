import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadImageToR2 } from "@/lib/r2";

// Vercel/Serverless config: ensure Node.js runtime and allow longer processing
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // seconds (increase on Pro if needed)
import path from "path";
import os from "os";
import fs from "fs/promises";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";

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

      const workerHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (process.env.MERGE_WORKER_TOKEN) {
        workerHeaders["Authorization"] = `Bearer ${process.env.MERGE_WORKER_TOKEN}`;
      }
      if (process.env.MERGE_WORKER_API_KEY) {
        workerHeaders["X-API-Key"] = process.env.MERGE_WORKER_API_KEY;
      }

      const resp = await fetch(workerUrl, {
        method: "POST",
        headers: workerHeaders,
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

    // Use ffmpeg concat demuxer with stream copy and a small silent gap
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "merge-"));
    const cleanup: string[] = [];
    try {
      // Download each chapter to temp files
      const partFiles: string[] = [];
      for (let i = 0; i < chapterAudios.length; i++) {
        const url = chapterAudios[i].audioUrl!;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const p = path.join(tmpDir, `part_${i + 1}.mp3`);
        await fs.writeFile(p, buf);
        cleanup.push(p);
        partFiles.push(p);
      }

      // Probe first chapter to align gap params (sample rate/channels/bitrate)
      const first = await probeAudio(partFiles[0]);
      const sr = first.sample_rate || 44100;
      const ch = first.channels || 2;
      const br = first.bit_rate_k || 192;

      // Generate short silent mp3 matching input params
      const gapMs = Number(process.env.MERGE_GAP_MS || 350);
      const gapFile = path.join(tmpDir, "gap.mp3");
      await runFfmpeg([
        "-f",
        "lavfi",
        "-t",
        (gapMs / 1000).toString(),
        "-i",
        `anullsrc=channel_layout=${ch === 1 ? "mono" : "stereo"}:sample_rate=${sr}`,
        "-ar",
        String(sr),
        "-ac",
        String(ch),
        "-b:a",
        `${br}k",
        gapFile,
      ]);
      cleanup.push(gapFile);

      // Optionally strip metadata from parts to avoid mid-stream ID3 frames (copy-only)
      const cleaned: string[] = [];
      for (const p of partFiles) {
        const c = p.replace(/\.mp3$/i, ".clean.mp3");
        await runFfmpeg(["-i", p, "-vn", "-map_metadata", "-1", "-c:a", "copy", "-write_xing", "1", c]);
        cleanup.push(c);
        cleaned.push(c);
      }

      // Build concat list with gaps between chapters
      const listPath = path.join(tmpDir, "list.txt");
      const lines: string[] = [];
      cleaned.forEach((p, idx) => {
        lines.push(`file '${p.replace(/'/g, "'\\''")}'`);
        if (idx !== partFiles.length - 1) lines.push(`file '${gapFile.replace(/'/g, "'\\''")}'`);
      });
      await fs.writeFile(listPath, lines.join("\n"), "utf8");
      cleanup.push(listPath);

      // Concat via demuxer with stream copy
      const outPath = path.join(tmpDir, "out.mp3");
      await runFfmpeg([
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listPath,
        "-c",
        "copy",
        "-write_xing",
        "1",
        outPath,
      ]);
      cleanup.push(outPath);

      const merged = await fs.readFile(outPath);

      // Upload merged file
      const sanitizedTitle = (book.title || "audiobook")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 50);
      const timestamp = Date.now();
      const fileName = `audio/${sanitizedTitle}-merged-${timestamp}.mp3`;
      const audioUrl = await uploadImageToR2("sellaudiobooks", fileName, merged, "audio/mpeg");

      // Upsert FULL_BOOK AudioGeneration
      const existing = await prisma.audioGeneration.findFirst({ where: { bookId: book.id, contentType: "FULL_BOOK" } });
      if (existing) {
        await prisma.audioGeneration.update({
          where: { id: existing.id },
          data: { status: "COMPLETED", audioUrl, voiceId: existing.voiceId, voiceName: existing.voiceName },
        });
      } else {
        await prisma.audioGeneration.create({
          data: { status: "COMPLETED", audioUrl, voiceId: "merged", voiceName: "Merged Chapters", contentType: "FULL_BOOK", textLength: 0, bookId: book.id },
        });
      }

      return NextResponse.json({ success: true, audioUrl });
    } finally {
      // best effort cleanup
      for (const p of cleanup) {
        try { await fs.unlink(p); } catch {}
      }
      try { await fs.rmdir(tmpDir); } catch {}
    }
  } catch (error) {
    console.error("Merge audio error:", error);
    return NextResponse.json(
      { error: "Failed to merge audio" },
      { status: 500 }
    );
  }
}

function resolveFfmpegBin() {
  // ffmpeg-static should export the absolute path to the binary.
  // In some bundling contexts, it may resolve to index.js; fall back to env or system ffmpeg.
  let bin = (ffmpegPath as unknown as string) || "";
  if (!bin || /index\.js/.test(bin) || /\[app-route\]/.test(bin)) {
    bin = process.env.FFMPEG_PATH || "ffmpeg";
  }
  return bin;
}

async function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = resolveFfmpegBin();
    const cp = spawn(bin, args, { stdio: "inherit" });
    cp.on("error", reject);
    cp.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

function resolveFfprobeBin() {
  let bin = (ffprobePath.path as unknown as string) || "";
  if (!bin || /index\.js/.test(bin) || /\[app-route\]/.test(bin)) {
    bin = process.env.FFPROBE_PATH || "ffprobe";
  }
  return bin;
}

async function probeAudio(file: string): Promise<{ sample_rate: number; channels: number; bit_rate_k: number }> {
  return new Promise((resolve) => {
    const bin = resolveFfprobeBin();
    const args = [
      "-v",
      "error",
      "-of",
      "json",
      "-show_entries",
      "stream=sample_rate,channels,bit_rate",
      "-select_streams",
      "a:0",
      file,
    ];
    let out = "";
    const cp = spawn(bin, args);
    cp.stdout.on("data", (d) => (out += d.toString()));
    cp.on("close", () => {
      try {
        const j = JSON.parse(out);
        const s = (j.streams && j.streams[0]) || {};
        const sr = Number(s.sample_rate) || 44100;
        const ch = Number(s.channels) || 2;
        const br = Math.max(32, Math.min(320, Math.round((Number(s.bit_rate) || 192000) / 1000)));
        resolve({ sample_rate: sr, channels: ch, bit_rate_k: br });
      } catch {
        resolve({ sample_rate: 44100, channels: 2, bit_rate_k: 192 });
      }
    });
    cp.on("error", () => resolve({ sample_rate: 44100, channels: 2, bit_rate_k: 192 }));
  });
}
