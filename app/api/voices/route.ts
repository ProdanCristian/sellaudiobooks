import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pageSize = searchParams.get('page_size') || '10'
    const pageNumber = searchParams.get('page_number') || '1'
    const title = searchParams.get('title')
    const language = searchParams.get('language')

    // Build query parameters
    const params = new URLSearchParams({
      page_size: pageSize,
      page_number: pageNumber,
    })

    if (title) params.append('title', title)
    if (language) params.append('language', language)

    console.log('Attempting to fetch user voices with params:', params.toString())

    // Add self=true parameter to get only user's personal voices
    params.append('self', 'true')

    const response = await fetch(`https://api.fish.audio/model?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.FISHAUDIO_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    console.log(`Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Fish Audio API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    console.log('Personal voices fetched successfully', {
      itemCount: data.items?.length || 0,
      total: data.pagination?.total || data.total || 0
    })

    return NextResponse.json({
      success: true,
      data: data
    })

  } catch (error) {
    console.error('Error fetching voices:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch voices'
      },
      { status: 500 }
    )
  }
}