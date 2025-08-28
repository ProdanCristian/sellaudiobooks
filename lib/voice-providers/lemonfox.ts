import { Voice, VoiceListResponse } from "@/types/voice";
import { VoiceProvider, GenerateOptions } from "./base";

const DEFAULT_VOICES: Voice[] = [
  // English
  { id: "sarah", title: "Sarah", languages: ["en-us"], samples: [] },
  { id: "bella", title: "Bella", languages: ["en-us"], samples: [] },
  { id: "emma", title: "Emma", languages: ["en-us"], samples: [] },
  { id: "liam", title: "Liam", languages: ["en-us"], samples: [] },
  { id: "olivia", title: "Olivia", languages: ["en-us"], samples: [] },
  { id: "noah", title: "Noah", languages: ["en-us"], samples: [] },
  { id: "ava", title: "Ava", languages: ["en-us"], samples: [] },
  { id: "elijah", title: "Elijah", languages: ["en-us"], samples: [] },
  { id: "sophia", title: "Sophia", languages: ["en-us"], samples: [] },
  { id: "james", title: "James", languages: ["en-us"], samples: [] },
  { id: "isabella", title: "Isabella", languages: ["en-us"], samples: [] },
  { id: "lucas", title: "Lucas", languages: ["en-us"], samples: [] },
  { id: "mia", title: "Mia", languages: ["en-us"], samples: [] },
  { id: "henry", title: "Henry", languages: ["en-us"], samples: [] },
  { id: "amelia", title: "Amelia", languages: ["en-us"], samples: [] },
  { id: "benjamin", title: "Benjamin", languages: ["en-us"], samples: [] },
  { id: "harper", title: "Harper", languages: ["en-us"], samples: [] },
  { id: "jack", title: "Jack", languages: ["en-us"], samples: [] },
  { id: "chloe", title: "Chloe", languages: ["en-us"], samples: [] },
  { id: "ethan", title: "Ethan", languages: ["en-us"], samples: [] },
  // Spanish
  { id: "sofia-es", title: "Sofía", languages: ["es"], samples: [] },
  { id: "mateo-es", title: "Mateo", languages: ["es"], samples: [] },
  { id: "valentina-es", title: "Valentina", languages: ["es"], samples: [] },
  { id: "diego-es", title: "Diego", languages: ["es"], samples: [] },
  { id: "martina-es", title: "Martina", languages: ["es"], samples: [] },
  { id: "lucia-es", title: "Lucía", languages: ["es"], samples: [] },
  { id: "nicolas-es", title: "Nicolás", languages: ["es"], samples: [] },
  { id: "camila-es", title: "Camila", languages: ["es"], samples: [] },
  { id: "alejandro-es", title: "Alejandro", languages: ["es"], samples: [] },
  { id: "paula-es", title: "Paula", languages: ["es"], samples: [] },
  // French
  { id: "emma-fr", title: "Emma (FR)", languages: ["fr"], samples: [] },
  { id: "louis-fr", title: "Louis", languages: ["fr"], samples: [] },
  { id: "chloe-fr", title: "Chloé (FR)", languages: ["fr"], samples: [] },
  { id: "gabriel-fr", title: "Gabriel", languages: ["fr"], samples: [] },
  { id: "jade-fr", title: "Jade", languages: ["fr"], samples: [] },
  { id: "lucas-fr", title: "Lucas (FR)", languages: ["fr"], samples: [] },
  { id: "lea-fr", title: "Léa", languages: ["fr"], samples: [] },
  { id: "arthur-fr", title: "Arthur", languages: ["fr"], samples: [] },
  { id: "manon-fr", title: "Manon", languages: ["fr"], samples: [] },
  { id: "nathan-fr", title: "Nathan", languages: ["fr"], samples: [] },
  // German
  { id: "mia-uk", title: "Mia (UK)", languages: ["en-gb"], samples: [] },
  { id: "ben-uk", title: "Ben (UK)", languages: ["en-gb"], samples: [] },
  { id: "lina-uk", title: "Lina (UK)", languages: ["en-gb"], samples: [] },
  { id: "paul-uk", title: "Paul (UK)", languages: ["en-gb"], samples: [] },
  { id: "leonie-uk", title: "Leonie (UK)", languages: ["en-gb"], samples: [] },
  { id: "felix-uk", title: "Felix (UK)", languages: ["en-gb"], samples: [] },
  { id: "lara-uk", title: "Lara (UK)", languages: ["en-gb"], samples: [] },
  { id: "jonas-uk", title: "Jonas (UK)", languages: ["en-gb"], samples: [] },
  // Italian
  { id: "giulia-it", title: "Giulia", languages: ["it"], samples: [] },
  { id: "alessandro-it", title: "Alessandro", languages: ["it"], samples: [] },
  { id: "sofia-it", title: "Sofia (IT)", languages: ["it"], samples: [] },
  { id: "leonardo-it", title: "Leonardo", languages: ["it"], samples: [] },
  { id: "aurora-it", title: "Aurora", languages: ["it"], samples: [] },
  { id: "gabriele-it", title: "Gabriele", languages: ["it"], samples: [] },
  { id: "martina-it", title: "Martina (IT)", languages: ["it"], samples: [] },
  // Japanese
  { id: "sakura-ja", title: "Sakura", languages: ["ja"], samples: [] },
  { id: "ren-ja", title: "Ren", languages: ["ja"], samples: [] },
  { id: "yui-ja", title: "Yui", languages: ["ja"], samples: [] },
  // Chinese
  { id: "li-zh", title: "Li", languages: ["zh"], samples: [] },
  { id: "mei-zh", title: "Mei", languages: ["zh"], samples: [] },
  { id: "wang-zh", title: "Wang", languages: ["zh"], samples: [] },
  // Hindi
  { id: "aarav-hi", title: "Aarav", languages: ["hi"], samples: [] },
  { id: "ananya-hi", title: "Ananya", languages: ["hi"], samples: [] },
  { id: "vihaan-hi", title: "Vihaan", languages: ["hi"], samples: [] },
  // Portuguese (BR)
  { id: "ana-ptbr", title: "Ana (BR)", languages: ["pt-br"], samples: [] },
  { id: "joao-ptbr", title: "João", languages: ["pt-br"], samples: [] },
  { id: "marina-ptbr", title: "Marina", languages: ["pt-br"], samples: [] },
];

export class LemonfoxProvider implements VoiceProvider {
  private apiKey: string;
  private baseUrl = "https://api.lemonfox.ai";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async listVoices(params?: { page_size?: number; page_number?: number; title?: string; language?: string }): Promise<VoiceListResponse> {
    // Lemonfox public API does not expose a voice catalog endpoint in our usage.
    // Return a filtered list from DEFAULT_VOICES.
    let items = DEFAULT_VOICES;
    // Only keep English voices (US/UK)
    items = items.filter(v => (v.languages || []).some(l => {
      const c = (l || '').toLowerCase();
      return c === 'en-us' || c === 'en-gb';
    }));
    if (params?.title) {
      const q = params.title.toLowerCase();
      items = items.filter(v => v.title.toLowerCase().includes(q) || v.id.toLowerCase().includes(q));
    }
    if (params?.language) {
      const lang = params.language.toLowerCase();
      items = items.filter(v => (v.languages || []).some(l => l.toLowerCase() === lang));
    }
    const perPage = Math.max(1, Math.min(1000, params?.page_size ?? 50));
    const page = Math.max(1, params?.page_number ?? 1);
    const start = (page - 1) * perPage;
    const paged = items.slice(start, start + perPage);
    return {
      items: paged,
      pagination: { page, per_page: perPage, total: items.length },
    };
  }

  async generateSpeech(voiceId: string | null, text: string, options?: GenerateOptions): Promise<ArrayBuffer> {
    if (!voiceId) throw new Error("voiceId is required for Lemonfox generation");
    const responseFormat = (options?.format ?? "mp3").toLowerCase();
    const language = options?.language;
    const url = `${this.baseUrl}/v1/audio/speech`;

    const maxAttempts = 5;
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voice: voiceId,
          response_format: responseFormat,
          input: text,
          ...(language ? { language } : {}),
        }),
      });

      if (resp.ok) {
        return await resp.arrayBuffer();
      }

      const status = resp.status;
      const errorText = await resp.text().catch(() => "Unknown error");
      const transient = status >= 500 || status === 429 || status === 408;
      if (!transient || attempt === maxAttempts) {
        lastError = new Error(`Lemonfox TTS failed: ${status} ${resp.statusText} - ${errorText}`);
        break;
      }
      const base = 1000 * Math.pow(2, attempt - 1);
      const jitter = base * (0.2 * (Math.random() - 0.5) * 2);
      const delay = Math.max(500, Math.min(15000, base + jitter));
      await new Promise(r => setTimeout(r, delay));
    }
    throw lastError || new Error("Unknown Lemonfox error");
  }
}
