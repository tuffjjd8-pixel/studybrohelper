import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CustomCamera, type CameraCaptureResult, type CameraSolveMode } from "@/components/scanner/CustomCamera";
import { ImageCropper } from "@/components/scanner/ImageCropper";
import { ScannerLoadingState } from "@/components/scanner/ScannerLoadingState";
import { Button } from "@/components/ui/button";
import { RotateCcw, Crop } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ScannerState = "idle" | "camera" | "previewing" | "cropping" | "scanning";
type LoadingStage = "extracting" | "classifying" | "solving";

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSolved: (question: string, solution: string, subject: string, image?: string) => void;
  userId?: string;
  isPremium?: boolean;
  solveMode?: "instant" | "deep" | "essay";
}

export function ScannerModal({
  isOpen,
  onClose,
  onSolved,
  userId,
  isPremium = false,
  solveMode = "instant",
}: ScannerModalProps) {
  const [state, setState] = useState<ScannerState>("idle");
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("extracting");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<CameraSolveMode>("instant");

  const cameraActive = isOpen && (state === "idle" || state === "camera");

  // Auto-solve after capture: brief preview then solve
  const handleCameraCapture = useCallback((result: CameraCaptureResult) => {
    setCapturedFile(result.file);
    setPreviewUrl(result.previewUrl);
    setSelectedMode(result.mode);
    setState("previewing");
  }, []);

  // Auto-transition from preview → scanning after 400ms
  useEffect(() => {
    if (state !== "previewing" || !capturedFile) return;
    const timer = setTimeout(() => {
      setState("scanning");
      setLoadingStage("classifying");
      solveProblem(capturedFile);
    }, 400);
    return () => clearTimeout(timer);
  }, [state, capturedFile]);

  const handleCropRequest = useCallback(() => {
    setState("cropping");
  }, []);

  const handleCropComplete = useCallback((croppedImage: string) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    fetch(croppedImage)
      .then(r => r.blob())
      .then(blob => {
        const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
        setCapturedFile(file);
        setPreviewUrl(croppedImage);
        setState("scanning");
        setLoadingStage("classifying");
        solveProblem(file);
      });
  }, [previewUrl]);

  const handleCropCancel = useCallback(() => {
    setState("scanning");
  }, []);

  const handleRetake = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setCapturedFile(null);
    setPreviewUrl(null);
    setState("idle");
  }, [previewUrl]);

  const handleCameraClose = useCallback(() => {
    handleReset();
    onClose();
  }, [onClose]);

  const solveProblem = async (file: File) => {
    if (!userId) {
      toast.error("Please sign in to use AI features.");
      return;
    }
    try {
      setLoadingStage("classifying");
      await new Promise((r) => setTimeout(r, 200));
      setLoadingStage("solving");

      const mode = isPremium ? "solve_pro" : "solve_free";

      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);

      const response = await fetch("http://46.224.199.130:8000/ocr", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      const extractedQuestion = data.extracted_text || "Image-based question";

      if (userId) {
        await supabase.from("solves").insert({
          user_id: userId,
          subject: "general",
          question_text: extractedQuestion,
          question_image_url: file.name,
          solution_markdown: data.solution,
        });
      }

      onSolved(extractedQuestion, data.solution, "general", previewUrl || undefined);
      handleReset();
      onClose();
    } catch (error) {
      console.error("Scan error:", error);
      toast.error("Failed to scan homework. Please try again.");
      handleReset();
    }
  };

  const handleReset = useCallback(() => {
    setState("idle");
    setCapturedImage(null);
  }, []);

  return (
    <>
      {/* Full-screen native camera */}
      <CustomCamera
        isOpen={cameraActive}
        onCapture={handleCameraCapture}
        onClose={handleCameraClose}
        isPremium={isPremium}
      />

      {/* Optional crop screen */}
      {state === "cropping" && capturedImage && (
        <ImageCropper
          imageSrc={capturedImage}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      {/* Preview flash */}
      {state === "previewing" && capturedImage && (
        <Dialog open onOpenChange={() => {}}>
          <DialogContent className="max-w-lg w-[95vw] p-0 bg-background border-border">
            <div className="flex items-center justify-center p-6">
              <img
                src={capturedImage}
                alt="Preview"
                className="max-h-48 rounded-xl object-contain border border-primary/30"
                style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.2)" }}
              />
            </div>
            <p className="text-center text-sm text-muted-foreground pb-4 animate-pulse">
              Solving...
            </p>
          </DialogContent>
        </Dialog>
      )}

      {/* Processing / scanning dialog */}
      {state === "scanning" && (
        <Dialog open onOpenChange={() => {}}>
          <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto p-0 bg-background border-border">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-heading font-bold">Analyzing...</h2>
            </div>
            <div className="p-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <ScannerLoadingState
                    image={capturedImage || undefined}
                    stage={loadingStage}
                  />
                </motion.div>
              </AnimatePresence>

              {/* Optional retake/crop bar */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center gap-3 pt-3"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetake}
                  className="gap-1.5 text-xs rounded-full"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retake
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCropRequest}
                  className="gap-1.5 text-xs rounded-full"
                >
                  <Crop className="w-3.5 h-3.5" />
                  Crop / Edit
                </Button>
              </motion.div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
