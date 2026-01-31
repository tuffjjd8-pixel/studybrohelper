import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { fileToOptimizedDataUrl } from "@/lib/image";

interface TextInputBoxProps {
  onSubmit: (text: string) => void;
  onEmptySubmit?: () => void;
  onImagePaste?: (imageData: string) => void;
  isLoading?: boolean;
  hasPendingImage?: boolean;
  placeholder?: string;
}

export function TextInputBox({ 
  onSubmit, 
  onEmptySubmit,
  onImagePaste,
  isLoading,
  hasPendingImage = false,
  placeholder = "Paste or type your homework question..." 
}: TextInputBoxProps) {
  const [text, setText] = useState("");

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
              disabled={isLoading}
              className="
                min-h-[60px] max-h-[200px] resize-none
                bg-muted/50 border-none
                placeholder:text-muted-foreground/50
                focus-visible:ring-1 focus-visible:ring-primary/50
                text-base
              "
              rows={2}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isLoading}
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
          {hasPendingImage 
            ? "Press Enter to solve image • Add text for more context"
            : "Press Enter to send • Shift+Enter for new line • Paste images with Ctrl+V"
          }
        </p>
      </div>
    </motion.div>
  );
}
