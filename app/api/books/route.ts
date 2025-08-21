import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateBookStatus } from '@/lib/book-status'

export async function GET() {
  try {
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

    const books = await prisma.book.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { chapters: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json(books)
  } catch (error) {
    console.error('Error fetching books:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const { title, introduction, customInstructions, genre, targetAudience, coverImage } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Calculate initial status based on content
    const initialStatus = calculateBookStatus({
      introduction: introduction?.trim() || null,
      chaptersCount: 0
    })

    const book = await prisma.book.create({
      data: {
        title: title.trim(),
        introduction: introduction?.trim() || null,
        customInstructions: customInstructions?.trim() || null,
        genre: genre?.trim() || null,
        targetAudience: targetAudience?.trim() || null,
        coverImage: coverImage || null,
        status: initialStatus,
        userId: user.id,
        chapters: {
          create: {
            title: 'Chapter 1',
            content: '',
            order: 1,
            wordCount: 0
          }
        }
      }
    })

    console.log(`📚 Creating new book with status: ${initialStatus}`)

    return NextResponse.json(book, { status: 201 })
  } catch (error) {
    console.error('Error creating book:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}