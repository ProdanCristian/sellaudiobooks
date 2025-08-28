#!/usr/bin/env node
import 'dotenv/config'
import { getVoiceProvider } from '@/lib/voice-providers'
import { uploadImageToR2, deleteFileFromR2 } from '@/lib/r2'

function cleanSpokenName(title: string): string {
  // Remove any parenthetical region tags like (UK) from spoken name
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

async function main() {
  const bucket = process.env.R2_BUCKET || 'sellaudiobooks'
  const provider = getVoiceProvider()
  const { items } = await provider.listVoices({ page_size: 1000, page_number: 1 })
  if (!items || items.length === 0) {
    console.log('No voices returned by provider')
    return
  }
  console.log(`Generating previews for ${items.length} voices...`)

  let ok = 0
  let fail = 0
  for (const v of items) {
    const language = (v.languages && v.languages[0]) || 'en-us'
    const key = `previews/${v.id}-${language}.mp3`
    const text = getPreviewText(language, v.title)
    try {
      // Delete old sample (if exists), then upload regenerated one
      try { await deleteFileFromR2(bucket, key) } catch {}
      const audio = await provider.generateSpeech(v.id, text, { format: 'mp3', sample_rate: 44100, language })
      await uploadImageToR2(bucket, key, Buffer.from(audio), 'audio/mpeg')
      ok++
      console.log(`✔ Uploaded ${key}`)
    } catch (err) {
      fail++
      console.error(`✖ Failed ${key}`, err)
    }
  }
  console.log(`Done. Uploaded: ${ok}, Failed: ${fail}`)
}

main().catch((e) => {
  console.error('Fatal error generating previews:', e)
  process.exit(1)
})
