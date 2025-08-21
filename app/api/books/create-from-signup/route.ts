import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    console.log('Book creation from signup - Starting...')
    const session = await getServerSession(authOptions)
    console.log('Session:', session?.user?.email)
    
    if (!session?.user?.email) {
      console.log('No session or email found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, coverImage, customInstructions } = await request.json()
    console.log('Book data received:', { title, coverImage, customInstructions })

    if (!title) {
      console.log('No title provided')
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    console.log('User found:', user?.id)

    if (!user) {
      console.log('User not found in database')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create the book from signup flow
    const book = await prisma.book.create({
      data: {
        title,
        customInstructions: customInstructions || null,
        coverImage: coverImage || null,
        userId: user.id,
        status: 'DRAFT'
      }
    })
    console.log('Book created successfully:', book.id)

    return NextResponse.json(book, { status: 201 })
  } catch (error) {
    console.error('Error creating book from signup:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}