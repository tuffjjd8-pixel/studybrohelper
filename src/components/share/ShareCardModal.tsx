import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateShareCard } from "@/lib/shareCard";
import { toast } from "sonner";

interface ShareCardModalProps {
  open: boolean;
  onClose: () => void;
  question: string;
  solution: string;
  subject: string;
}

export function ShareCardModal({ open, onClose, question, solution, subject }: ShareCardModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const prevKeyRef = useRef("");

  // Stable data key to avoid re-renders on same data
  const dataKey = `${question}|${solution}|${subject}`;

  useEffect(() => {
    if (!open) return;
    if (dataKey === prevKeyRef.current && imageUrl) return; // already generated for this data

    prevKeyRef.current = dataKey;
    let cancelled = false;
    setLoading(true);
    setSaved(false);

    generateShareCard({ question, solution, subject })
      .then((b) => {
        if (cancelled) return;
        setBlob(b);
        setImageUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(b);
        });
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to generate share card");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [open, dataKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const handleShare = useCallback(async () => {
    if (!blob) return;
    const file = new File([blob], "studybro-solution.png", { type: "image/png" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: "Solved by StudyBro", text: "Check this out!", files: [file] });
      } catch { /* cancelled */ }
    } else if (navigator.share) {
      try {
        await navigator.share({ title: "Solved by StudyBro", text: "Check this out! studybrohelper.lovable.app" });
      } catch { /* cancelled */ }
    } else {
      handleSave();
    }
  }, [blob]);

  const handleSave = useCallback(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "studybro-solution.png";
    a.click();
    URL.revokeObjectURL(url);
    setSaved(true);
    toast.success("Image saved!");
    setTimeout(() => setSaved(false), 2000);
  }, [blob]);

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText("https://studybrohelper.lovable.app");
    toast.success("Link copied!");
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="share-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative w-full max-w-sm flex flex-col items-center gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute -top-3 -right-3 z-10 p-2 rounded-full bg-card border border-border/50 text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Card preview */}
            <div className="w-full rounded-xl overflow-hidden border border-border/30 shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
              {loading ? (
                <div className="aspect-[9/16] bg-[#0B0B0B] flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : imageUrl ? (
                <img src={imageUrl} alt="Share card preview" className="w-full" draggable={false} />
              ) : null}
            </div>

            {/* Actions */}
            {!loading && imageUrl && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex gap-3 w-full"
              >
                <Button
                  onClick={handleShare}
                  className="flex-1 gap-2 font-semibold"
                  size="lg"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button
                  onClick={handleSave}
                  variant="outline"
                  size="lg"
                  className="flex-1 gap-2"
                >
                  {saved ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                  {saved ? "Saved" : "Save"}
                </Button>
              </motion.div>
            )}

            {!loading && imageUrl && (
              <button
                onClick={handleCopyLink}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Copy app link
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
