import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import html2canvas from "html2canvas";

interface ShareCardModalProps {
  open: boolean;
  onClose: () => void;
  captureRef: React.RefObject<HTMLDivElement>;
}

export function ShareCardModal({ open, onClose, captureRef }: ShareCardModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const capture = useCallback(async () => {
    if (!captureRef.current) return;
    setLoading(true);
    setSaved(false);

    try {
      // Apply share mode
      captureRef.current.setAttribute("data-share-mode", "true");
      // Small delay for styles to apply
      await new Promise(r => setTimeout(r, 80));

      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: "#0B0B0B",
        scale: 2,
        useCORS: true,
        logging: false,
        removeContainer: true,
        // Add padding via canvas manipulation
      });

      captureRef.current.removeAttribute("data-share-mode");

      // Create padded 9:16 canvas
      const PAD = 80;
      const srcW = canvas.width;
      const srcH = canvas.height;
      const targetW = srcW + PAD * 2;
      const targetRatio = 16 / 9;
      const minH = Math.round(targetW * targetRatio);
      const targetH = Math.max(srcH + PAD * 2 + 120, minH); // +120 for footer

      const final = document.createElement("canvas");
      final.width = targetW;
      final.height = targetH;
      const ctx = final.getContext("2d")!;

      // Background
      ctx.fillStyle = "#0B0B0B";
      ctx.fillRect(0, 0, targetW, targetH);

      // Subtle glow
      const glow = ctx.createRadialGradient(targetW - 100, 200, 0, targetW - 100, 200, 500);
      glow.addColorStop(0, "rgba(0, 255, 136, 0.03)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, targetW, targetH);

      // Draw captured content centered
      const drawY = PAD;
      ctx.drawImage(canvas, PAD, drawY);

      // Footer branding
      const footerY = targetH - 60;
      const FONT = "'Space Grotesk', system-ui, sans-serif";

      // Divider
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, footerY - 20);
      ctx.lineTo(targetW - PAD, footerY - 20);
      ctx.stroke();

      // Green dot
      ctx.beginPath();
      ctx.arc(PAD + 7, footerY + 4, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#00FF88";
      ctx.fill();

      // Brand
      ctx.font = `700 24px ${FONT}`;
      ctx.fillStyle = "rgba(240,240,240,0.6)";
      ctx.fillText("StudyBro", PAD + 24, footerY + 12);

      ctx.font = `400 18px ${FONT}`;
      ctx.fillStyle = "rgba(240,240,240,0.25)";
      ctx.fillText("AI Homework Solver", PAD + 148, footerY + 12);

      // URL
      ctx.font = `400 16px ${FONT}`;
      ctx.fillStyle = "rgba(0, 255, 136, 0.25)";
      const urlText = "studybrohelper.lovable.app";
      const urlW = ctx.measureText(urlText).width;
      ctx.fillText(urlText, targetW - PAD - urlW, footerY + 12);

      final.toBlob((b) => {
        if (!b) { toast.error("Failed to generate image"); return; }
        setBlob(b);
        setImageUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(b);
        });
      }, "image/png", 1.0);
    } catch {
      toast.error("Failed to capture solution");
      captureRef.current?.removeAttribute("data-share-mode");
    } finally {
      setLoading(false);
    }
  }, [captureRef]);

  // Trigger capture when modal opens
  const handleOpen = useCallback(() => {
    if (open && !imageUrl && !loading) {
      capture();
    }
  }, [open, imageUrl, loading, capture]);

  // Use a ref to track if we already captured for this open
  const didCapture = useRef(false);
  if (open && !didCapture.current) {
    didCapture.current = true;
    // Defer to next tick so DOM is ready
    setTimeout(() => capture(), 50);
  }
  if (!open && didCapture.current) {
    didCapture.current = false;
  }

  const handleShare = useCallback(async () => {
    if (!blob) return;
    const file = new File([blob], "studybro-solution.png", { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ title: "Solved by StudyBro", text: "Check this out!", files: [file] }); } catch {}
    } else if (navigator.share) {
      try { await navigator.share({ title: "Solved by StudyBro", text: "Check this out! studybrohelper.lovable.app" }); } catch {}
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
                <div className="aspect-[9/16] bg-[#0B0B0B] flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : imageUrl ? (
                <img src={imageUrl} alt="Share card preview" className="w-full" draggable={false} />
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
                onClick={async () => {
                  await navigator.clipboard.writeText("https://studybrohelper.lovable.app");
                  toast.success("Link copied!");
                }}
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
