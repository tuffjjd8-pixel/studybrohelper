import { useState, useRef } from "react";
import { Send, Sparkles, Mic, MicOff, Loader2, Upload, Languages, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { fileToOptimizedDataUrl } from "@/lib/image";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TranscriptionMode = "transcribe" | "translate";

interface TextInputBoxProps {
  onSubmit: (text: string) => void;
  onEmptySubmit?: () => void;
  onImagePaste?: (imageData: string) => void;
  isLoading?: boolean;
  hasPendingImage?: boolean;
  placeholder?: string;
  speechInputEnabled?: boolean;
  isPremium?: boolean;
  speechLanguage?: string;
  onSpeechUsed?: () => void;
  isAuthenticated?: boolean;
}

export function TextInputBox({ 
  onSubmit, 
  onEmptySubmit,
  onImagePaste,
  isLoading,
  hasPendingImage = false,
  placeholder = "Paste or type your homework question...",
  speechInputEnabled = false,
  isPremium = false,
  speechLanguage = "auto",
  onSpeechUsed,
  isAuthenticated = false,
}: TextInputBoxProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentMode, setCurrentMode] = useState<TranscriptionMode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const pendingModeRef = useRef<TranscriptionMode>("transcribe");

  const handleSubmit = () => {
    if (isLoading) return;
    
    if (text.trim()) {
      onSubmit(text.trim());
      setText("");
    } 
    else if (hasPendingImage && onEmptySubmit) {
      onEmptySubmit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file && onImagePaste) {
          const optimized = await fileToOptimizedDataUrl(file, {
            maxDimension: 1280,
            quality: 0.8,
            mimeType: "image/webp",
          });
          onImagePaste(optimized);
        }
        return;
      }
    }
  };

  const startRecording = async (mode: TranscriptionMode) => {
    // CRITICAL: Premium features require authentication
    if (!isAuthenticated) {
      toast.error("Please sign in to use Premium features.");
      return;
    }
    if (!isPremium) {
      toast.error("Speech input is a Premium feature.");
      return;
    }

    pendingModeRef.current = mode;
    setCurrentMode(mode);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await transcribeAudio(audioBlob, pendingModeRef.current);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info(mode === "translate" 
        ? "🎤 Recording... Will translate to English"
        : "🎤 Recording... Click to stop"
      );
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error("Could not access microphone. Please check permissions.");
      setCurrentMode(null);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob, mode: TranscriptionMode) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;

      // Prepare request body
      const body: { audio: string; language?: string; mode: TranscriptionMode } = {
        audio: base64Audio,
        mode,
      };

      // Only pass language if not auto-detect and in transcribe mode
      if (speechLanguage !== "auto" && mode === "transcribe") {
        body.language = speechLanguage;
      }

      console.log(`Transcribing with mode: ${mode}, language: ${speechLanguage}`);

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body
      });

      if (error) throw error;

      if (data?.text) {
        setText(prev => prev ? `${prev} ${data.text}` : data.text);
        toast.success(mode === "translate" ? "Translated to English!" : "Transcription complete!");
        onSpeechUsed?.();
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error("Failed to transcribe audio. Please try again.");
    } finally {
      setIsTranscribing(false);
      setCurrentMode(null);
    }
  };

  const handleVoiceClick = (mode: TranscriptionMode) => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording(mode);
    }
  };

  const handleAudioFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, mode: TranscriptionMode) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // CRITICAL: Premium features require authentication
    if (!isAuthenticated) {
      toast.error("Please sign in to use Premium features.");
      return;
    }
    if (!isPremium) {
      toast.error("Speech input is a Premium feature.");
      return;
    }

    const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/x-m4a'];
    if (!validTypes.some(type => file.type.includes(type.split('/')[1]))) {
      toast.error("Please upload an audio file (MP3, WAV, M4A, WebM)");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error("Audio file too large. Maximum 25MB.");
      return;
    }

    setIsTranscribing(true);
    setCurrentMode(mode);
    
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Audio = await base64Promise;

      // Prepare request body
      const body: { audio: string; language?: string; mode: TranscriptionMode } = {
        audio: base64Audio,
        mode,
      };

      // Only pass language if not auto-detect and in transcribe mode
      if (speechLanguage !== "auto" && mode === "transcribe") {
        body.language = speechLanguage;
      }

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body
      });

      if (error) throw error;

      if (data?.text) {
        setText(prev => prev ? `${prev} ${data.text}` : data.text);
        toast.success(mode === "translate" ? "Translated to English!" : "Transcription complete!");
        onSpeechUsed?.();
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error("Failed to transcribe audio file. Please try again.");
    } finally {
      setIsTranscribing(false);
      setCurrentMode(null);
      if (audioFileInputRef.current) {
        audioFileInputRef.current.value = '';
      }
    }
  };

  const canSubmit = text.trim() || hasPendingImage;
  // CRITICAL: Never show speech buttons to unsigned users
  const showSpeechButtons = isAuthenticated && speechInputEnabled && isPremium;

  return (
    <motion.div
      className="w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="glass-card p-4 neon-border">
        {/* Speech mode buttons - above textarea when enabled */}
        {showSpeechButtons && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {/* Transcribe in my language */}
            <Button
              type="button"
              variant={isRecording && currentMode === "transcribe" ? "default" : "outline"}
              size="sm"
              onClick={() => handleVoiceClick("transcribe")}
              disabled={isTranscribing || (isRecording && currentMode !== "transcribe")}
              className="flex items-center gap-2"
            >
              {isRecording && currentMode === "transcribe" ? (
                <>
                  <MicOff className="w-4 h-4" />
                  Stop Recording
                </>
              ) : isTranscribing && currentMode === "transcribe" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Transcribing...
                </>
              ) : (
                <>
                  <Languages className="w-4 h-4" />
                  Transcribe in My Language
                </>
              )}
            </Button>

            {/* Translate to English */}
            <Button
              type="button"
              variant={isRecording && currentMode === "translate" ? "secondary" : "outline"}
              size="sm"
              onClick={() => handleVoiceClick("translate")}
              disabled={isTranscribing || (isRecording && currentMode !== "translate")}
              className="flex items-center gap-2"
            >
              {isRecording && currentMode === "translate" ? (
                <>
                  <MicOff className="w-4 h-4" />
                  Stop Recording
                </>
              ) : isTranscribing && currentMode === "translate" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Translating...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  Translate to English
                </>
              )}
            </Button>

            {/* File upload */}
            <input
              type="file"
              ref={audioFileInputRef}
              onChange={(e) => handleAudioFileSelect(e, "transcribe")}
              accept="audio/*,.mp3,.wav,.m4a,.webm"
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => audioFileInputRef.current?.click()}
              disabled={isTranscribing || isRecording}
              className="flex items-center gap-2"
              title="Upload audio file"
            >
              <Upload className="w-4 h-4" />
              Upload Audio
            </Button>
          </div>
        )}

        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={placeholder}
              disabled={isLoading || isTranscribing}
              dir="auto"
              className={`
                min-h-[60px] max-h-[200px] resize-none
                bg-muted/50 border-none
                placeholder:text-muted-foreground/50
                focus-visible:ring-1 focus-visible:ring-primary/50
                text-base
                unicode-bidi-isolate
              `}
              style={{ unicodeBidi: 'plaintext' }}
              rows={2}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isLoading || isTranscribing}
            variant="neon"
            size="icon-lg"
            className="shrink-0"
          >
            {isLoading ? (
              <Sparkles className="w-5 h-5 animate-pulse" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {isRecording 
            ? currentMode === "translate"
              ? "🎤 Recording... Will translate to English"
              : "🎤 Recording... Click button to stop"
            : isTranscribing
            ? currentMode === "translate" 
              ? "Translating to English..."
              : "Transcribing audio..."
            : hasPendingImage 
            ? "Press Enter to solve image • Add text for more context"
            : `Press Enter to send • Shift+Enter for new line • Paste images with Ctrl+V${showSpeechButtons ? " • Use buttons above for voice" : ""}`
          }
        </p>
      </div>
    </motion.div>
  );
}
