import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function transcribeWithGroq(
  audioBlob: Blob, 
  apiKey: string,
  language?: string,
  mode: "transcribe" | "translate" = "transcribe"
): Promise<{ text: string }> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-large-v3');
  
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
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } else {
    // Transcription - optionally specify language
    if (language) {
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

    // Decode base64 to binary
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const audioBlob = new Blob([bytes.buffer], { type: 'audio/webm' });

    // Try primary API key first
    const primaryKey = Deno.env.get('GROQ_API_KEY');
    const backupKey = Deno.env.get('GROQ_API_KEY_BACKUP');

    let result;
    try {
      if (!primaryKey) {
        throw new Error('Primary API key not configured');
      }
      console.log(`Transcribing with mode: ${mode}, language: ${language || 'auto'}`);
      result = await transcribeWithGroq(audioBlob, primaryKey, language, mode);
    } catch (primaryError) {
      console.error('Primary GROQ key failed:', primaryError);
      
      // Try backup key
      if (backupKey) {
        console.log('Attempting with backup GROQ key...');
        result = await transcribeWithGroq(audioBlob, backupKey, language, mode);
      } else {
        throw primaryError;
      }
    }

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
