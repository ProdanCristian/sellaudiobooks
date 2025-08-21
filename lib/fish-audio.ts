export interface FishAudioVoice {
  _id: string
  title: string
  description?: string
  author: {
    nickname: string
    avatar?: string
  }
  languages: string[]
  tags: string[]
  like_count: number
  mark_count: number
  shared_count: number
  created_at: string
  samples: Array<{
    audio: string
    text: string
  }>
  default_text?: string
}

export interface FishAudioResponse {
  items: FishAudioVoice[]
  pagination: {
    page: number
    per_page: number
    total: number
  }
}

// Fish Audio API client
export class FishAudioClient {
  private apiKey: string
  private baseUrl = 'https://api.fish.audio'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async getVoices(params?: {
    page_size?: number
    page_number?: number
    title?: string
    language?: string
  }): Promise<FishAudioResponse> {
    const searchParams = new URLSearchParams()
    
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString())
    if (params?.page_number) searchParams.append('page_number', params.page_number.toString())
    if (params?.title) searchParams.append('title', params.title)
    if (params?.language) searchParams.append('language', params.language)

    const response = await fetch(`${this.baseUrl}/model?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Fish Audio API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  }

  async getMyVoices(params?: {
    page_size?: number
    page_number?: number
    title?: string
    language?: string
  }): Promise<FishAudioResponse> {
    const searchParams = new URLSearchParams()
    
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString())
    if (params?.page_number) searchParams.append('page_number', params.page_number.toString())
    if (params?.title) searchParams.append('title', params.title)
    if (params?.language) searchParams.append('language', params.language)
    
    // Add self=true to get only user's personal voices
    searchParams.append('self', 'true')

    const response = await fetch(`${this.baseUrl}/model?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Fish Audio API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  }

  async generateSpeech(voiceId: string, text: string): Promise<ArrayBuffer> {
    const response = await fetch(`${this.baseUrl}/v1/tts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference_id: voiceId,
        text: text,
        format: 'wav',
        chunk_length: 200,
        normalize: true,
        latency: 'normal'
      }),
    })

    if (!response.ok) {
      throw new Error(`Speech generation failed: ${response.statusText}`)
    }

    // The API returns binary audio data, not JSON
    const audioBuffer = await response.arrayBuffer()
    return audioBuffer
  }
}