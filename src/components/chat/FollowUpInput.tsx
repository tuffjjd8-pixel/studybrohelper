import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { fileToOptimizedDataUrl } from "@/lib/image";

interface FollowUpInputProps {
  onSubmit: (text: string) => void;
  onImagePaste?: (imageData: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function FollowUpInput({ 
  onSubmit, 
  onImagePaste,
  isLoading,
  placeholder = "Paste or type your homework question..." 
}: FollowUpInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (isLoading || !text.trim()) return;
    onSubmit(text.trim());
    setText("");
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

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
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
                min-h-[50px] max-h-[150px] resize-none
                bg-muted/50 border-none
                placeholder:text-muted-foreground/50
                focus-visible:ring-1 focus-visible:ring-primary/50
                text-base
              "
              rows={1}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!text.trim() || isLoading}
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
          Press Enter to send • Shift+Enter for new line • Paste images with Ctrl+V
        </p>
      </div>
    </motion.div>
  );
}
