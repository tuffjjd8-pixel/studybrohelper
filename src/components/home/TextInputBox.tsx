import { useState, useRef } from "react";
import { Send, Sparkles, Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { fileToOptimizedDataUrl } from "@/lib/image";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TextInputBoxProps {
  onSubmit: (text: string) => void;
  onEmptySubmit?: () => void;
  onImagePaste?: (imageData: string) => void;
  isLoading?: boolean;
  hasPendingImage?: boolean;
  placeholder?: string;
  voiceInputEnabled?: boolean;
}

export function TextInputBox({ 
  onSubmit, 
  onEmptySubmit,
  onImagePaste,
  isLoading,
  hasPendingImage = false,
  placeholder = "Paste or type your homework question...",
  voiceInputEnabled = false,
}: TextInputBoxProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleSubmit = () => {
    if (isLoading) return;
    
    // If there's text, submit it
    if (text.trim()) {
      onSubmit(text.trim());
      setText("");
    } 
    // If no text but pending image, trigger empty submit (solve image)
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
    // Text paste is handled automatically by the textarea
  };

  const startRecording = async () => {
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
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
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

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      // Convert blob to base64
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
        body: { audio: base64Audio }
      });

      if (error) throw error;

      if (data?.text) {
        setText(prev => prev ? `${prev} ${data.text}` : data.text);
        toast.success("Transcription complete!");
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error("Failed to transcribe audio. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleVoiceClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
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
              className="
                min-h-[60px] max-h-[200px] resize-none
                bg-muted/50 border-none
                placeholder:text-muted-foreground/50
                focus-visible:ring-1 focus-visible:ring-primary/50
                text-base
              "
              rows={2}
            />
            {/* Voice input button inside textarea */}
            {voiceInputEnabled && (
              <button
                onClick={handleVoiceClick}
                disabled={isTranscribing}
                className={`absolute right-3 bottom-3 p-2 rounded-full transition-colors ${
                  isRecording 
                    ? "bg-red-500 text-white animate-pulse" 
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
                title={isRecording ? "Stop recording" : "Start voice input"}
              >
                {isTranscribing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isRecording ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
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
            ? "🎤 Recording... Click the mic to stop"
            : isTranscribing
            ? "Transcribing audio..."
            : hasPendingImage 
            ? "Press Enter to solve image • Add text for more context"
            : `Press Enter to send • Shift+Enter for new line • Paste images with Ctrl+V${voiceInputEnabled ? " • Click mic for voice" : ""}`
          }
        </p>
      </div>
    </motion.div>
  );
}
