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
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<CameraSolveMode>("instant");

  const cameraActive = isOpen && (state === "idle" || state === "camera");

  // Auto-solve after capture: brief preview then solve
  const handleCameraCapture = useCallback(async (result: CameraCaptureResult) => {
    let imageData = result.images[0];
    
    // Safety net: if somehow we still get a non-data-URL, normalize it
    if (!imageData.startsWith("data:image/")) {
      try {
        const { normalizeImageInput } = await import("@/lib/image");
        imageData = await normalizeImageInput(imageData);
      } catch (err) {
        console.error("Failed to normalize camera capture:", err);
        toast.error("We couldn't read this photo. Try again or use a screenshot.");
        return;
      }
    }
    
    console.log(`[ScannerModal] Camera capture: length=${imageData.length}`);
    setCapturedImage(imageData);
    setSelectedMode(result.mode);
    setState("previewing");
  }, []);

  // Auto-transition from preview → scanning after 400ms
  useEffect(() => {
    if (state !== "previewing" || !capturedImage) return;
    const timer = setTimeout(() => {
      setState("scanning");
      setLoadingStage("classifying");
      solveProblem(capturedImage);
    }, 400);
    return () => clearTimeout(timer);
  }, [state, capturedImage]);

  const handleCropRequest = useCallback(() => {
    setState("cropping");
  }, []);

  const handleCropComplete = useCallback((croppedImage: string) => {
    if (capturedImage?.startsWith("blob:")) URL.revokeObjectURL(capturedImage);
    setCapturedImage(croppedImage);
    setState("scanning");
    setLoadingStage("classifying");
    solveProblem(croppedImage);
  }, [capturedImage]);

  const handleCropCancel = useCallback(() => {
    // Return to scanning state
    setState("scanning");
  }, []);

  const handleRetake = useCallback(() => {
    if (capturedImage?.startsWith("blob:")) URL.revokeObjectURL(capturedImage);
    setCapturedImage(null);
    setState("idle");
  }, [capturedImage]);

  const handleCameraClose = useCallback(() => {
    handleReset();
    onClose();
  }, [onClose]);

  const solveProblem = async (imageData: string) => {
    if (!userId) {
      toast.error("Please sign in to use AI features.");
      return;
    }
    try {
      const t_pipeline_start = performance.now();
      setLoadingStage("classifying");

      const { getAnswerLanguage } = await import("@/hooks/useAnswerLanguage");
      const answerLanguage = await getAnswerLanguage(userId);

      setLoadingStage("solving");

      const body: Record<string, unknown> = {
        image: imageData,
        isPremium,
        animatedSteps: false,
        solveMode: isPremium ? selectedMode : "instant",
        generateGraph: false,
        deviceType: (window as any).Capacitor?.isNativePlatform?.() ? "capacitor" : "web",
        answerLanguage,
      };

      const t_reason_start = performance.now();
      const { data, error } = await supabase.functions.invoke("solve-homework", { body });
      const t_reason_end = performance.now();

      if (error) throw error;

      console.log("[ScannerModal] image pipeline timings (ms)", {
        reasoning: Math.round(t_reason_end - t_reason_start),
        end_to_end: Math.round(t_reason_end - t_pipeline_start),
      });

      const extractedQuestion = data.question || data.extractedText || "";
      // Use AI-generated short topic title for history; fall back to a snippet of the extracted text.
      const titleForHistory =
        (data.title && String(data.title).trim()) ||
        (extractedQuestion && extractedQuestion.split(/\s+/).slice(0, 8).join(" ")) ||
        "Study Problem";

      if (userId) {
        const { uploadSolveImage } = await import("@/lib/solveImageUpload");
        const persistedImageUrl = await uploadSolveImage(imageData, userId);
        await supabase.from("solves").insert({
          user_id: userId,
          subject: data.subject || "math",
          question_text: titleForHistory,
          question_image_url: persistedImageUrl,
          solution_markdown: data.solution,
          mode: isPremium ? selectedMode : "instant",
        });
      }

      onSolved(extractedQuestion || titleForHistory, data.solution, data.subject || "math", imageData);
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
