import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2, Check, Loader2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import html2canvas from "html2canvas";

interface ShareCardModalProps {
  open: boolean;
  onClose: () => void;
  captureRef: React.RefObject<HTMLDivElement>;
  deepLink?: string;
}

export function ShareCardModal({ open, onClose, captureRef, deepLink }: ShareCardModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const didCapture = useRef(false);

  const capture = useCallback(async () => {
    if (!captureRef.current) return;
    setLoading(true);
    setSaved(false);

    try {
      const el = captureRef.current;

      // Apply share mode
      el.setAttribute("data-share-mode", "true");

      // Remove overflow clipping temporarily
      const origOverflow = el.style.overflow;
      const origMaxHeight = el.style.maxHeight;
      el.style.overflow = "visible";
      el.style.maxHeight = "none";

      // Wait for render
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 150))));

      const canvas = await html2canvas(el, {
        backgroundColor: "#0B0B0B",
        scale: 2,
        useCORS: true,
        logging: false,
        removeContainer: true,
        // Use full scroll dimensions
        width: el.scrollWidth,
        height: el.scrollHeight,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });

      // Restore
      el.removeAttribute("data-share-mode");
      el.style.overflow = origOverflow;
      el.style.maxHeight = origMaxHeight;

      const srcW = canvas.width;
      const srcH = canvas.height;

      // 9:16 target but allow tighter fit for short content
      const PAD_X = 48;
      const PAD_Y = 40;
      const FOOTER_H = 72;
      const targetW = srcW + PAD_X * 2;
      const targetRatio = 16 / 9;
      const minH = Math.round(targetW * targetRatio);
      const contentH = srcH + PAD_Y * 2 + FOOTER_H;
      // Use content height if it fills at least 60% of 9:16, otherwise use 9:16
      const targetH = contentH >= minH * 0.6 ? Math.max(contentH, minH) : Math.max(contentH, Math.round(targetW * 1.2));

      const final = document.createElement("canvas");
      final.width = targetW;
      final.height = targetH;
      const ctx = final.getContext("2d")!;

      // Deep black background
      ctx.fillStyle = "#0B0B0B";
      ctx.fillRect(0, 0, targetW, targetH);

      // Subtle corner glow
      const glow = ctx.createRadialGradient(targetW * 0.85, targetH * 0.1, 0, targetW * 0.85, targetH * 0.1, targetW * 0.5);
      glow.addColorStop(0, "rgba(180, 255, 50, 0.015)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, targetW, targetH);

      // Center content vertically (minus footer)
      const availableH = targetH - FOOTER_H;
      const drawY = Math.max(PAD_Y, Math.round((availableH - srcH) / 2));

      // Shadow behind content
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 8;
      ctx.drawImage(canvas, PAD_X, drawY);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Footer branding
      const footerY = targetH - 36;
      const FONT = "'Space Grotesk', system-ui, sans-serif";

      // Divider
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD_X, footerY - 24);
      ctx.lineTo(targetW - PAD_X, footerY - 24);
      ctx.stroke();

      // Green dot — exact primary neon green
      ctx.beginPath();
      ctx.arc(PAD_X + 6, footerY, 5, 0, Math.PI * 2);
      ctx.fillStyle = "hsl(82, 100%, 67%)";
      ctx.fill();

      // Brand name
      ctx.font = `600 20px ${FONT}`;
      ctx.fillStyle = "rgba(240,240,240,0.5)";
      ctx.fillText("StudyBro", PAD_X + 20, footerY + 6);

      // Tagline
      ctx.font = `400 14px ${FONT}`;
      ctx.fillStyle = "rgba(240,240,240,0.2)";
      ctx.fillText("AI Homework Solver", PAD_X + 120, footerY + 6);

      // URL right-aligned
      ctx.font = `400 13px ${FONT}`;
      ctx.fillStyle = "hsla(82, 100%, 67%, 0.3)";
      const urlText = "studybrohelper.lovable.app";
      const urlW = ctx.measureText(urlText).width;
      ctx.fillText(urlText, targetW - PAD_X - urlW, footerY + 6);

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
  useEffect(() => {
    if (open && !didCapture.current) {
      didCapture.current = true;
      setTimeout(() => capture(), 50);
    }
    if (!open) {
      didCapture.current = false;
    }
  }, [open, capture]);

  const handleShare = useCallback(async () => {
    if (!blob) return;
    const file = new File([blob], "studybro-solution.png", { type: "image/png" });

    const shareData: ShareData = {
      title: "Solved by StudyBro",
      text: deepLink ? `Check this out! ${deepLink}` : "Check this out!",
    };

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ ...shareData, files: [file] });
      } catch {}
    } else if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
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
