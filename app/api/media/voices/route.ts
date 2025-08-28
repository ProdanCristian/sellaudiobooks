import { NextResponse } from 'next/server'
import { getVoiceProvider } from '@/lib/voice-providers'
import { LemonfoxProvider } from '@/lib/voice-providers/lemonfox'

function cleanSpokenName(title: string): string {
  return (title || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
}

function getPreviewText(language: string, voiceTitle: string): string {
  const lang = (language || '').toLowerCase()
  switch (lang) {
    case 'en-us':
    case 'en-gb':
      return `You're listening to a short voice preview from SellAudioBooks. Voice: ${cleanSpokenName(voiceTitle)}.`
    case 'es':
      return `Esta es una muestra sencilla para la plataforma SellAudioBooks. Voz: ${voiceTitle}.`
    case 'fr':
      return `Ceci est un aperçu simple pour la plateforme SellAudioBooks. Voix : ${voiceTitle}.`
    case 'it':
      return `Questa è un'anteprima semplice per la piattaforma SellAudioBooks. Voce: ${voiceTitle}.`
    case 'pt-br':
      return `Esta é uma prévia simples para a plataforma SellAudioBooks. Voz: ${voiceTitle}.`
    case 'ja':
      return `これは SellAudioBooks プラットフォームのシンプルなプレビューです。ボイス：${voiceTitle}。`
    case 'zh':
      return `这是 SellAudioBooks 平台的简短预览。声音：${voiceTitle}。`
    case 'hi':
      return `यह SellAudioBooks प्लेटफ़ॉर्म के लिए एक सरल पूर्वावलोकन है। आवाज़: ${voiceTitle}।`
    default:
      return `This is a simple preview for the SellAudioBooks platform. Voice: ${voiceTitle}.`
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page_size = Number(searchParams.get('page_size') || '10')
    const page_number = Number(searchParams.get('page_number') || '1')
    const title = searchParams.get('title') || undefined
    const language = searchParams.get('language') || undefined
    const debug = searchParams.get('debug') === '1'

    let provider
    try {
      provider = getVoiceProvider()
    } catch {
      // Allow listing with a default Lemonfox provider even if API key is missing
      provider = new LemonfoxProvider(process.env.LEMONFOX_API_KEY || '')
    }
    const data = await provider.listVoices({ page_size, page_number, title, language })

    // Attach preview sample URLs from R2 if present by convention
    const publicBase = process.env.CLOUDFLARE_R2_PUBLIC_URL || ''
    const enhanced = {
      ...data,
      items: (data.items || []).map((v) => {
        const lang = (v.languages && v.languages[0]) || 'en-us'
        const audio = publicBase ? `${publicBase}/previews/${v.id}-${lang}.mp3` : undefined
        return {
          ...v,
          samples: audio ? [{ audio, text: getPreviewText(lang, v.title) }] : v.samples,
        }
      }),
    }

    if (!debug) return NextResponse.json({ success: true, data: enhanced })

    // Build a quick language summary for debugging
    const counts: Record<string, number> = {}
    for (const v of enhanced.items || []) {
      for (const l of (v.languages || [])) {
        const key = (l || '').toLowerCase() || 'unknown'
        counts[key] = (counts[key] || 0) + 1
      }
    }
    return NextResponse.json({ success: true, data: enhanced, summary: { total: enhanced.items?.length || 0, byLanguage: counts } })
  } catch (error) {
    console.error('Error fetching voices:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch voices' },
      { status: 500 }
    )
  }
}
