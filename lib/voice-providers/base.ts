import { Voice, VoiceListResponse } from "@/types/voice";

export interface GenerateOptions {
  format?: "mp3" | "wav" | "pcm" | "opus";
  sample_rate?: number | null;
  language?: string;
}

export interface VoiceProvider {
  listVoices(params?: { page_size?: number; page_number?: number; title?: string; language?: string }): Promise<VoiceListResponse>;
  generateSpeech(voiceId: string | null, text: string, options?: GenerateOptions): Promise<ArrayBuffer>;
}
