import { NextRequest, NextResponse } from "next/server";
import { FishAudioClient } from "@/lib/fish-audio";
import { uploadImageToR2, deleteFileFromR2ByUrl } from "@/lib/r2";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Background job processing function
async function processAudioJob(audioJobId: string, client: FishAudioClient, text: string, voiceId: string) {
  try {
    // Update job status to processing
    await prisma.audioJob.update({
      where: { id: audioJobId },
      data: { status: 'PROCESSING' }
    });

    // Generate the speech
    const audioBuffer = await client.generateSpeech(voiceId, text);

    // Get job details for file naming
    const audioJob = await prisma.audioJob.findUnique({
      where: { id: audioJobId },
      include: {
        book: true,
        chapter: true
      }
    });

    if (!audioJob) {
      throw new Error('Audio job not found');
    }

    // Note: Old audio deletion now happens immediately when starting generation
    // No need to delete here since it's already been deleted

    // Create filename
    const sanitizedTitle = (audioJob.book?.title || 'audiobook')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50);
    
    const sanitizedChapter = (audioJob.chapterId ? 'chapter' : 'introduction')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 30);

    const timestamp = Date.now();
    const fileName = `audio/${sanitizedTitle}-${sanitizedChapter}-${timestamp}.wav`;

    // Upload to R2
    const audioUrl = await uploadImageToR2(
      'sellaudiobooks',
      fileName,
      Buffer.from(audioBuffer),
      'audio/wav'
    );

    // Update job with success
    await prisma.audioJob.update({
      where: { id: audioJobId },
      data: {
        status: 'COMPLETED',
        audioUrl
      }
    });

    // Update AudioGeneration record
    await prisma.audioGeneration.updateMany({
      where: { jobId: audioJob.jobId },
      data: {
        status: 'COMPLETED',
        audioUrl
      }
    });

    console.log(`Audio generation completed for job ${audioJob.jobId}`);

  } catch (error) {
    console.error('Background job processing failed:', error);
    
    // Update job with error
    await prisma.audioJob.update({
      where: { id: audioJobId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    // Update AudioGeneration record
    const audioJob = await prisma.audioJob.findUnique({
      where: { id: audioJobId }
    });

    if (audioJob) {
      await prisma.audioGeneration.updateMany({
        where: { jobId: audioJob.jobId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { voiceId, voiceName, text, chapterTitle, bookTitle, bookId, chapterId, contentType } = await request.json();

    if (!voiceId || !text || !bookId || !contentType) {
      return NextResponse.json({ 
        error: "Voice ID, text, book ID, and content type are required" 
      }, { status: 400 });
    }

    // Verify the user owns the book
    const book = await prisma.book.findFirst({
      where: {
        id: bookId,
        user: { email: session.user.email }
      }
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const apiKey = process.env.FISHAUDIO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: "Fish Audio API key not configured"
      }, { status: 500 });
    }

    // Initialize Fish Audio client
    const client = new FishAudioClient(apiKey);

    // Use provided voice name or fall back to 'Unknown Voice'
    const finalVoiceName = voiceName || 'Unknown Voice';

    try {
      // Create background job for audio generation
      const jobId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create AudioJob record to track the background job
      const audioJob = await prisma.audioJob.create({
        data: {
          jobId,
          status: 'PENDING',
          voiceId,
          voiceName: finalVoiceName,
          text,
          contentType: contentType.toUpperCase() as 'INTRODUCTION' | 'CHAPTER' | 'FULL_BOOK',
          bookId,
          chapterId: chapterId || null,
        }
      });

      // Check for existing AudioGeneration and delete old audio from R2 immediately
      const existing = await prisma.audioGeneration.findFirst({
        where: {
          bookId,
          chapterId: chapterId || null,
          contentType: contentType.toUpperCase() as 'INTRODUCTION' | 'CHAPTER' | 'FULL_BOOK'
        }
      });

      // Delete old audio from R2 immediately if one exists
      if (existing?.audioUrl) {
        try {
          console.log("Deleting old audio from R2 immediately:", existing.audioUrl);
          await deleteFileFromR2ByUrl('sellaudiobooks', existing.audioUrl);
        } catch (error) {
          console.warn("Failed to delete old audio immediately, continuing with generation:", error);
        }
      }

      let audioGeneration;
      if (existing) {
        // Update existing to pending
        audioGeneration = await prisma.audioGeneration.update({
          where: { id: existing.id },
          data: {
            status: 'PROCESSING',
            voiceId,
            voiceName: finalVoiceName,
            textLength: text.length,
            jobId,
            audioUrl: null, // Clear previous URL
            errorMessage: null, // Clear previous errors
            updatedAt: new Date()
          }
        });
      } else {
        // Create new pending record
        audioGeneration = await prisma.audioGeneration.create({
          data: {
            status: 'PROCESSING',
            voiceId,
            voiceName: finalVoiceName,
            contentType: contentType.toUpperCase() as 'INTRODUCTION' | 'CHAPTER' | 'FULL_BOOK',
            textLength: text.length,
            jobId,
            bookId,
            chapterId: chapterId || null
          }
        });
      }

      // Start background job processing
      // Note: In a real production app, this would be handled by a job queue
      // For now, we'll use a simple async function with timeout
      processAudioJob(audioJob.id, client, text, voiceId).catch(error => {
        console.error('Background job processing error:', error);
      });

      return NextResponse.json({
        success: true,
        jobId,
        audioGeneration,
        message: "Audio generation started. You can navigate away from this page.",
        metadata: {
          voiceId,
          textLength: text.length,
          chapterTitle,
          bookTitle,
          startedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error creating background job:', error);
      return NextResponse.json({
        error: "Failed to start audio generation job",
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in generate-audio API:', error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}