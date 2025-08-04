import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pageSize = searchParams.get('page_size') || '100'
    const pageNumber = searchParams.get('page_number') || '1'
    const title = searchParams.get('title')
    const language = searchParams.get('language')
    const sortBy = searchParams.get('sort_by') || 'score'

    const FISHAUDIO_API_KEY = process.env.FISHAUDIO_API_KEY
    
    if (!FISHAUDIO_API_KEY) {
      return NextResponse.json(
        { error: 'Fish Audio API key not configured' },
        { status: 500 }
      )
    }

    // Build query parameters
    const params = new URLSearchParams({
      page_size: pageSize,
      page_number: pageNumber,
      sort_by: sortBy
    })

    if (title) params.append('title', title)
    if (language) params.append('language', language)

    const response = await fetch(`https://api.fish.audio/model?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FISHAUDIO_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Fish Audio API error:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch voice models from Fish Audio' },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    return NextResponse.json(data)

  } catch (error) {
    console.error('Fish Audio voice models error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}