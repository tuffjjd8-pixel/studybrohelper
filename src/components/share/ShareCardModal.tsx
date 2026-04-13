import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2, Check, Loader2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateSharePreview, type SharePreviewData } from "@/lib/sharePreviewCard";

interface ShareCardModalProps {
  open: boolean;
  onClose: () => void;
  deepLink?: string;
  previewData?: SharePreviewData;
}

export function ShareCardModal({ open, onClose, deepLink, previewData }: ShareCardModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const didCapture = useRef(false);

  const generate = useCallback(async () => {
    if (!previewData) return;
    setLoading(true);
    setSaved(false);
    try {
      const b = await generateSharePreview(previewData);
      setBlob(b);
      setImageUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(b);
      });
    } catch {
      toast.error("Failed to generate preview card");
    } finally {
      setLoading(false);
    }
  }, [previewData]);

  useEffect(() => {
    if (open && !didCapture.current) {
      didCapture.current = true;
      setTimeout(() => generate(), 50);
    }
    if (!open) {
      didCapture.current = false;
    }
  }, [open, generate]);

  const handleShare = useCallback(async () => {
    if (!blob) return;
    const file = new File([blob], "studybro-solution.png", { type: "image/png" });
    const shareData: ShareData = {
      title: "Solved by StudyBro",
      text: deepLink ? `Check this out! ${deepLink}` : "Check this out!",
    };
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ ...shareData, files: [file] }); } catch {}
    } else if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      handleSave();
    }
  }, [blob, deepLink]);

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
    const link = deepLink || "https://studybrohelper.lovable.app";
    await navigator.clipboard.writeText(link);
    toast.success("Link copied!");
  }, [deepLink]);

  const handleClose = useCallback(() => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setBlob(null);
    onClose();
  }, [imageUrl, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="share-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative w-full max-w-sm flex flex-col items-center gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute -top-3 -right-3 z-10 p-2 rounded-full bg-card border border-border/50 text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-full rounded-xl overflow-hidden border border-border/30 shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
              {loading ? (
                <div className="aspect-[9/13] bg-[#0B0B0B] flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : imageUrl ? (
                <img src={imageUrl} alt="Share preview" className="w-full" draggable={false} />
              ) : null}
            </div>

            {!loading && imageUrl && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex gap-3 w-full"
              >
                <Button onClick={handleShare} className="flex-1 gap-2 font-semibold" size="lg">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button onClick={handleSave} variant="outline" size="lg" className="flex-1 gap-2">
                  {saved ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                  {saved ? "Saved" : "Save"}
                </Button>
              </motion.div>
            )}

            {!loading && imageUrl && (
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Link2 className="w-3 h-3" />
                Copy solve link
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
