import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateShareCard, type ShareCardData } from "@/lib/shareCard";
import { toast } from "sonner";

interface ShareCardModalProps {
  open: boolean;
  onClose: () => void;
  data: ShareCardData;
}

export function ShareCardModal({ open, onClose, data }: ShareCardModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) {
      setImageUrl(null);
      setBlob(null);
      setSaved(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    generateShareCard(data)
      .then((b) => {
        if (cancelled) return;
        setBlob(b);
        setImageUrl(URL.createObjectURL(b));
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to generate share card");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, data]);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const handleShare = async () => {
    if (!blob) return;
    const file = new File([blob], "studybro-solution.png", { type: "image/png" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: "Solved by StudyBro",
          text: "Check out this solution!",
          files: [file],
        });
      } catch {
        // user cancelled
      }
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: "Solved by StudyBro",
          text: "Check out this solution! studybrohelper.lovable.app",
        });
      } catch {
        // user cancelled
      }
    } else {
      handleSave();
    }
  };

  const handleSave = () => {
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
  };

  const handleCopyLink = async () => {
    const url = "https://studybrohelper.lovable.app";
    await navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md flex flex-col items-center gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 z-10 p-2 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Card preview */}
          <div className="w-full rounded-2xl overflow-hidden border border-border/50 shadow-2xl">
            {loading ? (
              <div className="aspect-[4/5] bg-card flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt="Share card"
                className="w-full"
                draggable={false}
              />
            ) : null}
          </div>

          {/* Action buttons */}
          {!loading && imageUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex gap-3 w-full"
            >
              <Button
                onClick={handleShare}
                className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
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
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
            >
              Copy app link
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
