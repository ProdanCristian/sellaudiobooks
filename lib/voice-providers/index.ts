import { VoiceProvider } from "./base";
import { LemonfoxProvider } from "./lemonfox";

export function getVoiceProvider(): VoiceProvider {
  const provider = (process.env.VOICE_PROVIDER || "lemonfox").toLowerCase();
  switch (provider) {
    case "lemonfox": {
      const key = process.env.LEMONFOX_API_KEY || process.env.NEXT_PUBLIC_LEMONFOX_API_KEY;
      if (!key) throw new Error("LEMONFOX_API_KEY not configured");
      return new LemonfoxProvider(key);
    }
    default:
      throw new Error(`Unsupported VOICE_PROVIDER: ${provider}`);
  }
}

