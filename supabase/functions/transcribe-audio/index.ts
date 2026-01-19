import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// MODEL CONFIGURATION
// Speech-to-Text uses whisper-large-v3-turbo
// Uses 7-key fallback rotation for high availability
// ============================================================
const WHISPER_MODEL = "whisper-large-v3-turbo";

// All available Groq API keys in priority order
const API_KEY_NAMES = [
  "GROQ_API_KEY",
  "GROQ_API_KEY_1",
  "GROQ_API_KEY_2",
  "GROQ_API_KEY_3",
  "GROQ_API_KEY_4",
  "GROQ_API_KEY_5",
  "GROQ_API_KEY_6",
  "GROQ_API_KEY_BACKUP",
];

// Get all available API keys
function getAvailableApiKeys(): Array<{ name: string; key: string }> {
  const keys: Array<{ name: string; key: string }> = [];
  
  for (const keyName of API_KEY_NAMES) {
    const key = Deno.env.get(keyName);
    if (key) {
      keys.push({ name: keyName, key });
    }
  }
  
  if (keys.length === 0) {
    throw new Error("No GROQ API key configured");
  }
  
  return keys;
}

async function transcribeWithGroq(
  audioBlob: Blob, 
  apiKey: string,
  language?: string,
  mode: "transcribe" | "translate" = "transcribe"
): Promise<{ text: string }> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', WHISPER_MODEL);
  
  // If translating, use the translation endpoint
  // Otherwise use transcription with optional language hint
  if (mode === "translate") {
    // Translation always outputs English
    const response = await fetch('https://api.groq.com/openai/v1/audio/translations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Groq translation error: ${response.status} - ${errorText}`);
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } else {
    // Transcription - optionally specify language for better accuracy
    if (language && language !== "auto") {
      formData.append('language', language);
    }
    
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Groq transcription error: ${response.status} - ${errorText}`);
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }
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

    console.log(`Transcription request - mode: ${mode}, language: ${language || 'auto'}`);

    // Decode base64 to binary
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const audioBlob = new Blob([bytes.buffer], { type: 'audio/webm' });

    // Get all available API keys for fallback rotation
    const apiKeys = getAvailableApiKeys();

    let result;
    let usedKey = '';
    let lastError: Error | null = null;
    
    for (const { name, key } of apiKeys) {
      try {
        console.log(`Trying transcription with ${name}...`);
        result = await transcribeWithGroq(audioBlob, key, language, mode);
        usedKey = name;
        break;
      } catch (error) {
        console.error(`${name} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    if (!result) {
      throw lastError || new Error('All API keys failed');
    }

    console.log(`Transcription successful using ${usedKey}, model: ${WHISPER_MODEL}`);

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Transcription error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
