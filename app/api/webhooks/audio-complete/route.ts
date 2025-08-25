import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const prisma = new PrismaClient()

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

interface FishAudioWebhookPayload {
  id: string
  status: 'completed' | 'failed'
  audio_url?: string
  error_message?: string
}

export async function POST(request: NextRequest) {
  try {
    const payload: FishAudioWebhookPayload = await request.json()
    
    // Find the job in our database
    const audioJob = await prisma.audioJob.findUnique({
      where: { jobId: payload.id }
    })

    if (!audioJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (payload.status === 'completed' && payload.audio_url) {
      // Download audio from Fish Audio
      const audioResponse = await fetch(payload.audio_url)
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: ${audioResponse.status}`)
      }

      const audioBuffer = await audioResponse.arrayBuffer()
      const audioKey = `audio/${audioJob.bookId}/${audioJob.chapterId || 'chapter'}-${Date.now()}.mp3`

      // Upload to R2
      await r2Client.send(new PutObjectCommand({
        Bucket: 'sellaudiobooks',
        Key: audioKey,
        Body: new Uint8Array(audioBuffer),
        ContentType: 'audio/mpeg',
      }))

      const audioUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${audioKey}`

      // Update job status
      await prisma.audioJob.update({
        where: { id: audioJob.id },
        data: {
          status: 'COMPLETED',
          audioUrl,
        }
      })

      // Update or create AudioGeneration record
      await prisma.audioGeneration.upsert({
        where: {
          bookId_chapterId_contentType: {
            bookId: audioJob.bookId,
            chapterId: audioJob.chapterId || '',
            contentType: audioJob.contentType,
          }
        },
        update: {
          audioUrl,
          status: 'COMPLETED',
          voiceId: audioJob.voiceId,
          voiceName: audioJob.voiceName,
          textLength: audioJob.text.length,
          jobId: audioJob.jobId,
        },
        create: {
          audioUrl,
          status: 'COMPLETED',
          voiceId: audioJob.voiceId,
          voiceName: audioJob.voiceName,
          contentType: audioJob.contentType,
          textLength: audioJob.text.length,
          jobId: audioJob.jobId,
          bookId: audioJob.bookId,
          chapterId: audioJob.chapterId,
        }
      })

    } else if (payload.status === 'failed') {
      // Update job with error
      await prisma.audioJob.update({
        where: { id: audioJob.id },
        data: {
          status: 'FAILED',
          errorMessage: payload.error_message || 'Audio generation failed',
        }
      })

      // Update AudioGeneration record
      await prisma.audioGeneration.upsert({
        where: {
          bookId_chapterId_contentType: {
            bookId: audioJob.bookId,
            chapterId: audioJob.chapterId || '',
            contentType: audioJob.contentType,
          }
        },
        update: {
          status: 'FAILED',
          errorMessage: payload.error_message || 'Audio generation failed',
          jobId: audioJob.jobId,
        },
        create: {
          status: 'FAILED',
          voiceId: audioJob.voiceId,
          voiceName: audioJob.voiceName,
          contentType: audioJob.contentType,
          textLength: audioJob.text.length,
          errorMessage: payload.error_message || 'Audio generation failed',
          jobId: audioJob.jobId,
          bookId: audioJob.bookId,
          chapterId: audioJob.chapterId,
        }
      })

    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}