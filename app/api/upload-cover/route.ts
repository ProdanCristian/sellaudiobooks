import { NextRequest, NextResponse } from 'next/server'
import { uploadImageToR2, generateCoverFileName, deleteFileFromR2ByUrl } from '@/lib/r2'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const bookId = formData.get('bookId') as string
    const bookTitle = formData.get('bookTitle') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!bookId || !bookTitle) {
      return NextResponse.json(
        { error: 'Missing bookId or bookTitle' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Delete old cover from R2 if one exists
    try {
      const existingBook = await prisma.book.findUnique({
        where: { id: bookId },
        select: { coverImage: true }
      })
      
      if (existingBook?.coverImage) {
        console.log("Deleting old cover from R2:", existingBook.coverImage)
        await deleteFileFromR2ByUrl('sellaudiobooks', existingBook.coverImage)
      }
    } catch (error) {
      console.warn("Failed to delete old cover, continuing with upload:", error)
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate filename for R2
    const fileName = generateCoverFileName(bookId, bookTitle)

    // Upload to R2
    const imageUrl = await uploadImageToR2('sellaudiobooks', fileName, buffer, file.type)

    console.log(`✅ Custom cover uploaded successfully: ${imageUrl}`)

    return NextResponse.json({
      success: true,
      imageUrl,
      message: 'Cover uploaded successfully'
    })

  } catch (error) {
    console.error('❌ Error uploading custom cover:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload cover'
      },
      { status: 500 }
    )
  }
}