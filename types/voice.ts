export interface VoiceSample {
  audio?: string;
  text?: string;
}

export interface Voice {
  id: string;
  title: string;
  description?: string;
  languages?: string[];
  tags?: string[];
  samples?: VoiceSample[];
  default_text?: string;
}

export interface VoiceListResponse {
  items: Voice[];
  pagination?: {
    page: number;
    per_page: number;
    total: number;
  };
}

