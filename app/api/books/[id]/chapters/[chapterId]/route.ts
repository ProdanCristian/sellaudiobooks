import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { countWordsInHTML } from '@/lib/text-utils'
import { shouldUpdateBookStatus } from '@/lib/book-status'

const prisma = new PrismaClient()

interface Params {
  id: string
  chapterId: string
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id, chapterId } = await params
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
      }
    })

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    const chapter = await prisma.chapter.findFirst({
      where: { 
        id: chapterId,
        bookId: id
      }
    })

    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
    }

    const body = await request.json()
    const { title, content, order } = body

    const wordCount = content ? countWordsInHTML(content) : 0

    const updatedChapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(content !== undefined && { content }),
        ...(order !== undefined && { order }),
        wordCount,
      }
    })

    return NextResponse.json(updatedChapter)
  } catch (error) {
    console.error('Error updating chapter:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id, chapterId } = await params
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
        _count: {
          select: { chapters: true }
        }
      }
    })

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    const chapter = await prisma.chapter.findFirst({
      where: { 
        id: chapterId,
        bookId: id
      }
    })

    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
    }

    // Use transaction to delete chapter and potentially update book status
    await prisma.$transaction(async (tx) => {
      await tx.chapter.delete({
        where: { id: chapterId }
      })

      // Check if we should update book status (when going from 1 to 0 chapters)
      const newChapterCount = book._count.chapters - 1
      const newStatus = shouldUpdateBookStatus({
        introduction: book.introduction,
        chaptersCount: newChapterCount
      }, book.status)

      if (newStatus) {
        await tx.book.update({
          where: { id: id },
          data: { status: newStatus }
        })
        console.log(`📚 Auto-updating book status from ${book.status} to ${newStatus} (chapter deleted)`)
      }
    })

    return NextResponse.json({ message: 'Chapter deleted successfully' })
  } catch (error) {
    console.error('Error deleting chapter:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}