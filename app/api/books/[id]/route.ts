import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { shouldUpdateBookStatus } from '@/lib/book-status'
import { deleteFileFromR2ByUrl } from '@/lib/r2'

const prisma = new PrismaClient()

interface Params {
  id: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const book = await prisma.book.findFirst({
      where: { 
        id: id,
        userId: user.id
      },
      include: {
        chapters: {
          orderBy: { order: 'asc' }
        },
        outline: {
          include: {
            chapters: {
              orderBy: { order: 'asc' }
            }
          }
        },
        _count: {
          select: { chapters: true }
        }
      }
    })

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Fetch audio generations separately
    const audioGenerations = await prisma.audioGeneration.findMany({
      where: {
        bookId: book.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Add audio generations to the book object
    const bookWithAudio = {
      ...book,
      audioGenerations
    }

    return NextResponse.json(bookWithAudio)
  } catch (error) {
    console.error('Error fetching book:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { title, customInstructions, genre, targetAudience, status } = body

    const book = await prisma.book.findFirst({
      where: { 
        id: id,
        userId: user.id
      }
    })

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    const updatedBook = await prisma.book.update({
      where: { id: id },
      data: {
        ...(title?.trim() && { title: title.trim() }),
        ...(customInstructions !== undefined && { customInstructions: customInstructions?.trim() || null }),
        ...(genre?.trim() && { genre: genre.trim() }),
        ...(targetAudience?.trim() && { targetAudience: targetAudience.trim() }),
        ...(status && { status }),
      }
    })

    return NextResponse.json(updatedBook)
  } catch (error) {
    console.error('Error updating book:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    
    const book = await prisma.book.findFirst({
      where: { 
        id: id,
        userId: user.id
      },
      include: {
        _count: {
          select: { chapters: true }
        }
      }
    })

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    const updateData: Record<string, string | null | undefined> = {}
    
    if (body.title !== undefined) updateData.title = body.title.trim()
    if (body.customInstructions !== undefined) updateData.customInstructions = body.customInstructions?.trim() || null
    if (body.genre !== undefined) updateData.genre = body.genre.trim()
    if (body.targetAudience !== undefined) updateData.targetAudience = body.targetAudience.trim()
    if (body.status !== undefined) updateData.status = body.status
    if (body.coverImage !== undefined) updateData.coverImage = body.coverImage

    // Auto-update status based on content if chapters exist and status is not explicitly set
    if (body.status === undefined) {
      const newStatus = shouldUpdateBookStatus({
        chaptersCount: book._count.chapters
      }, book.status)
      
      if (newStatus) {
        updateData.status = newStatus
      }
    }

    const updatedBook = await prisma.book.update({
      where: { id: id },
      data: updateData
    })

    return NextResponse.json(updatedBook)
  } catch (error) {
    console.error('Error updating book:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const book = await prisma.book.findFirst({
      where: { 
        id: id,
        userId: user.id
      },
      include: {
        audioGenerations: {
          select: { audioUrl: true }
        }
      }
    })

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Clean up all R2 files associated with this book
    const filesToDelete = []
    
    // Add cover image if exists
    if (book.coverImage) {
      filesToDelete.push(book.coverImage)
    }
    
    // Add all audio files
    for (const audio of book.audioGenerations) {
      if (audio.audioUrl) {
        filesToDelete.push(audio.audioUrl)
      }
    }
    
    // Delete all files from R2 (don't await - run in parallel)
    const deletePromises = filesToDelete.map(async (fileUrl) => {
      try {
        await deleteFileFromR2ByUrl('sellaudiobooks', fileUrl)
      } catch (error) {
        // Continue with deletion even if R2 cleanup fails
      }
    })
    
    // Run R2 cleanup in parallel with database deletion
    Promise.allSettled(deletePromises)

    // Delete the book from database (cascade will handle related records)
    await prisma.book.delete({
      where: { id: id }
    })

    return NextResponse.json({ message: 'Book deleted successfully' })
  } catch (error) {
    console.error('Error deleting book:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}