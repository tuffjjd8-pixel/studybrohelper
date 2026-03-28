import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// STT MODEL CONFIGURATION
// whisper-large-v3-turbo for transcription (fast)
// whisper-large-v3 for translation (turbo doesn't support translate)
// ============================================================
const TRANSCRIBE_MODEL = "whisper-large-v3-turbo";
const TRANSLATE_MODEL = "whisper-large-v3";

// All available Groq API key environment variable names for STT rotation
const STT_KEY_NAMES = [
  "GROQ_API_KEY_0",
  "GROQ_API_KEY_1",
  "GROQ_API_KEY_2",
  "GROQ_API_KEY_3",
  "GROQ_API_KEY_4",
  "GROQ_API_KEY_5",
  "GROQ_API_KEY_6",
  "GROQ_API_KEY_7",
  "GROQ_API_KEY_BACKUP",
];

// Get all available STT keys
function getAvailableSTTKeys(): Array<{ name: string; key: string }> {
  const keys: Array<{ name: string; key: string }> = [];
  for (const keyName of STT_KEY_NAMES) {
    const key = Deno.env.get(keyName);
    if (key && key.trim()) {
      keys.push({ name: keyName, key });
    }
  }
  return keys;
}

async function transcribeWithRotation(
  audioBlob: Blob, 
  language?: string,
  mode: "transcribe" | "translate" = "transcribe"
): Promise<{ text: string }> {
  const keys = getAvailableSTTKeys();
  
  if (keys.length === 0) {
    throw new Error("No Groq API keys configured for STT");
  }
  
  const model = mode === "translate" ? TRANSLATE_MODEL : TRANSCRIBE_MODEL;
  console.log(`[STT] Starting transcription with ${keys.length} available keys, model: ${model}`);
  
  let lastError: Error | null = null;
  
  for (const { name, key } of keys) {
    try {
      console.log(`[STT] Attempting transcription with ${name}`);
      
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', model);
      
      const endpoint = mode === "translate" 
        ? 'https://api.groq.com/openai/v1/audio/translations'
        : 'https://api.groq.com/openai/v1/audio/transcriptions';
      
      // Add language hint for transcription mode
      if (mode === "transcribe" && language && language !== "auto") {
        formData.append('language', language);
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
        },
        body: formData,
      });

      if (response.ok) {
        console.log(`[STT] Success with ${name}`);
        return await response.json();
      }
      
      if (response.status === 429) {
        console.log(`[STT] Rate limit on ${name}, rotating to next key...`);
        continue;
      }
      
      const errorText = await response.text();
      console.error(`[STT] Error on ${name}: ${response.status} - ${errorText.substring(0, 200)}`);
      lastError = new Error(`Groq STT error: ${response.status} - ${errorText}`);
      continue;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[STT] Network error on ${name}:`, lastError.message);
      continue;
    }
  }
  
  console.error("[STT] All keys exhausted");
  throw lastError || new Error("All Groq keys failed for STT");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio, language, mode = "transcribe" } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log(`[STT] Transcription request - mode: ${mode}, language: ${language || 'auto'}, model: ${mode === "translate" ? TRANSLATE_MODEL : TRANSCRIBE_MODEL}`);

    // Decode base64 to binary
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const audioBlob = new Blob([bytes.buffer], { type: 'audio/webm' });

    // Use key rotation for STT
    const result = await transcribeWithRotation(audioBlob, language, mode);

    console.log('[STT] Transcription successful');

    // Log usage (fire-and-forget)
    const { logUsage } = await import("../_shared/usage-logger.ts");
    logUsage("transcribe", 0.0006);

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
    );

  } catch (error: unknown) {
    console.error('[STT] Transcription error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
});