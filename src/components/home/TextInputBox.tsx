import { useState, useRef } from "react";
import { Send, Sparkles, Mic, MicOff, Loader2, Upload, Globe, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { fileToOptimizedDataUrl } from "@/lib/image";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WhisperLanguageCode, isRTL } from "@/lib/whisperLanguages";

type TranscriptionMode = "transcribe" | "translate";

interface TextInputBoxProps {
  onSubmit: (text: string) => void;
  onEmptySubmit?: () => void;
  onImagePaste?: (imageData: string) => void;
  isLoading?: boolean;
  hasPendingImage?: boolean;
  placeholder?: string;
  speechInputEnabled?: boolean;
  speechLanguage?: WhisperLanguageCode;
  isPremium?: boolean;
}

export function TextInputBox({ 
  onSubmit, 
  onEmptySubmit,
  onImagePaste,
  isLoading,
  hasPendingImage = false,
  placeholder = "Paste or type your homework question...",
  speechInputEnabled = false,
  speechLanguage = "auto",
  isPremium = false,
}: TextInputBoxProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionMode, setTranscriptionMode] = useState<TranscriptionMode>("transcribe");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // Determine text direction based on language
  const textDirection = isRTL(speechLanguage) && transcriptionMode === "transcribe" ? "rtl" : "ltr";

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
    if (!isPremium) {
      toast.error("Speech input is a Premium feature. Upgrade to use it!");
      return;
    }

    setTranscriptionMode(mode);

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
        await transcribeAudio(audioBlob, mode);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info(`🎤 Recording (${mode === "translate" ? "→ English" : speechLanguage === "auto" ? "Auto-detect" : speechLanguage})... Click to stop`);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error("Could not access microphone. Please check permissions.");
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

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { 
          audio: base64Audio,
          language: speechLanguage === "auto" ? undefined : speechLanguage,
          mode: mode
        }
      });

      if (error) throw error;

      if (data?.text) {
        setText(prev => prev ? `${prev} ${data.text}` : data.text);
        toast.success(mode === "translate" ? "Translated to English!" : "Transcription complete!");
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error("Failed to transcribe audio. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleVoiceClick = (mode: TranscriptionMode) => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording(mode);
    }
  };

  const handleAudioFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isPremium) {
      toast.error("Speech input is a Premium feature. Upgrade to use it!");
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

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { 
          audio: base64Audio,
          language: speechLanguage === "auto" ? undefined : speechLanguage,
          mode: transcriptionMode
        }
      });

      if (error) throw error;

      if (data?.text) {
        setText(prev => prev ? `${prev} ${data.text}` : data.text);
        toast.success(transcriptionMode === "translate" ? "Translated to English!" : "Transcription complete!");
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error("Failed to transcribe audio file. Please try again.");
    } finally {
      setIsTranscribing(false);
      if (audioFileInputRef.current) {
        audioFileInputRef.current.value = '';
      }
    }
  };

  const canSubmit = text.trim() || hasPendingImage;

  return (
    <motion.div
      className="w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="glass-card p-4 neon-border">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={placeholder}
              disabled={isLoading || isTranscribing}
              dir={textDirection}
              className={`
                min-h-[60px] max-h-[200px] resize-none
                bg-muted/50 border-none
                placeholder:text-muted-foreground/50
                focus-visible:ring-1 focus-visible:ring-primary/50
                text-base
                ${speechInputEnabled && isPremium ? "pr-32" : "pr-4"}
              `}
              rows={2}
            />
            {/* Voice input buttons inside textarea - Premium only */}
            {speechInputEnabled && isPremium && (
              <div className="absolute right-3 bottom-3 flex items-center gap-1">
                {/* File upload button */}
                <input
                  type="file"
                  ref={audioFileInputRef}
                  onChange={handleAudioFileSelect}
                  accept="audio/*,.mp3,.wav,.m4a,.webm"
                  className="hidden"
                />
                <button
                  onClick={() => audioFileInputRef.current?.click()}
                  disabled={isTranscribing}
                  className="p-2 rounded-full transition-colors bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                  title="Upload audio file"
                >
                  <Upload className="w-4 h-4" />
                </button>
                
                {/* Transcribe in native language */}
                <button
                  onClick={() => handleVoiceClick("transcribe")}
                  disabled={isTranscribing}
                  className={`p-2 rounded-full transition-colors ${
                    isRecording && transcriptionMode === "transcribe"
                      ? "bg-red-500 text-white animate-pulse" 
                      : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                  }`}
                  title="Transcribe in selected language"
                >
                  {isTranscribing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isRecording && transcriptionMode === "transcribe" ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>

                {/* Translate to English */}
                <button
                  onClick={() => handleVoiceClick("translate")}
                  disabled={isTranscribing}
                  className={`p-2 rounded-full transition-colors ${
                    isRecording && transcriptionMode === "translate"
                      ? "bg-green-500 text-white animate-pulse" 
                      : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                  }`}
                  title="Translate to English"
                >
                  {isRecording && transcriptionMode === "translate" ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Languages className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}
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
            ? `🎤 Recording${transcriptionMode === "translate" ? " (→ English)" : ""}... Click to stop`
            : isTranscribing
            ? "Transcribing audio..."
            : hasPendingImage 
            ? "Press Enter to solve image • Add text for more context"
            : `Press Enter to send • Shift+Enter for new line • Paste images with Ctrl+V${speechInputEnabled && isPremium ? " • 🎤 Transcribe • 🌐 Translate" : ""}`
          }
        </p>
      </div>
    </motion.div>
  );
}
