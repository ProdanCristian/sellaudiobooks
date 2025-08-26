// import { encode } from "@msgpack/msgpack";

export interface FishAudioVoice {
  _id: string;
  title: string;
  description?: string;
  author: {
    nickname: string;
    avatar?: string;
  };
  languages: string[];
  tags: string[];
  like_count: number;
  mark_count: number;
  shared_count: number;
  created_at: string;
  samples: Array<{
    audio: string;
    text: string;
  }>;
  default_text?: string;
}

export interface FishAudioResponse {
  items: FishAudioVoice[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
  };
}

// Fish Audio API client
export class FishAudioClient {
  private apiKey: string;
  private baseUrl = "https://api.fish.audio";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getVoices(params?: {
    page_size?: number;
    page_number?: number;
    title?: string;
    language?: string;
  }): Promise<FishAudioResponse> {
    const searchParams = new URLSearchParams();

    if (params?.page_size)
      searchParams.append("page_size", params.page_size.toString());
    if (params?.page_number)
      searchParams.append("page_number", params.page_number.toString());
    if (params?.title) searchParams.append("title", params.title);
    if (params?.language) searchParams.append("language", params.language);

    const response = await fetch(
      `${this.baseUrl}/model?${searchParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Fish Audio API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  async getMyVoices(params?: {
    page_size?: number;
    page_number?: number;
    title?: string;
    language?: string;
  }): Promise<FishAudioResponse> {
    const searchParams = new URLSearchParams();

    if (params?.page_size)
      searchParams.append("page_size", params.page_size.toString());
    if (params?.page_number)
      searchParams.append("page_number", params.page_number.toString());
    if (params?.title) searchParams.append("title", params.title);
    if (params?.language) searchParams.append("language", params.language);

    // Add self=true to get only user's personal voices
    searchParams.append("self", "true");

    const response = await fetch(
      `${this.baseUrl}/model?${searchParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Fish Audio API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  async generateSpeech(
    voiceId: string | null,
    text: string,
    options?: {
      format?: "wav" | "pcm" | "mp3" | "opus";
      sample_rate?: number | null;
      mp3_bitrate?: 64 | 128 | 192;
      opus_bitrate?: -1000 | 24 | 32 | 48 | 64;
      temperature?: number;
      top_p?: number;
      chunk_length?: number;
      normalize?: boolean;
      latency?: "normal" | "balanced";
      prosody?: Record<string, unknown> | null;
    }
  ): Promise<ArrayBuffer> {
    const DEBUG =
      process.env.FISHAUDIO_DEBUG === "1" ||
      process.env.FISHAUDIO_DEBUG === "true";
    const MODEL = process.env.FISHAUDIO_MODEL || "s1";
    const {
      format = "mp3",
      sample_rate = 44100,
      mp3_bitrate = 192,
      opus_bitrate = 32,
      temperature = 0.9,
      top_p = 0.9,
      chunk_length = 200,
      normalize = true,
      latency = "balanced",
      prosody = null,
    } = options || {};

    const requestBody: Record<string, unknown> = {
      text,
      temperature,
      top_p,
      reference_id: voiceId,
      chunk_length,
      normalize,
      format,
      sample_rate,
      mp3_bitrate,
      opus_bitrate,
      latency,
    };

    if (prosody) requestBody.prosody = prosody;

    const maxAttempts = 5;
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (DEBUG) {
        console.log("[FishAudio] TTS request", {
          attempt,
          format,
          sample_rate,
          mp3_bitrate,
          opus_bitrate,
          temperature,
          top_p,
          chunk_length,
          normalize,
          latency,
          hasProsody: !!prosody,
          textLength: text.length,
          reference_id: voiceId ? "present" : "null",
          modelHeader: MODEL,
        });
      }
      const response = await fetch(`${this.baseUrl}/v1/tts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          model: MODEL,
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        if (DEBUG) {
          console.log("[FishAudio] TTS success", { attempt });
        }
        const audioBuffer = await response.arrayBuffer();
        return audioBuffer;
      }

      const status = response.status;
      const errorText = await response.text().catch(() => "Unknown error");
      const transient = status >= 500 || status === 429 || status === 408; // server errors, rate limit, timeout
      console.error("[FishAudio] API error", {
        status,
        statusText: response.statusText,
        body: errorText,
        headers: Object.fromEntries(response.headers.entries()),
        attempt,
        transient,
      });

      if (!transient || attempt === maxAttempts) {
        lastError = new Error(
          `Speech generation failed: ${status} ${response.statusText} - ${errorText}`
        );
        break;
      }

      // Exponential backoff with jitter: base 1s * 2^(attempt-1) +/- 20%
      const base = 1000 * Math.pow(2, attempt - 1);
      const jitter = base * (0.2 * (Math.random() - 0.5) * 2);
      const delay = Math.max(500, Math.min(15000, base + jitter));
      if (DEBUG) console.log("[FishAudio] retrying after ms", delay);
      await new Promise((r) => setTimeout(r, delay));
    }

    throw lastError || new Error("Unknown Fish Audio error");
  }
}
