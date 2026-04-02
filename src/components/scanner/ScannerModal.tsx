import { useState, useCallback, useEffect, useRef } from "react";
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
  const handleCameraCapture = useCallback((result: CameraCaptureResult) => {
    setCapturedImage(result.images[0]);
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
      setLoadingStage("classifying");
      await new Promise((r) => setTimeout(r, 200));
      setLoadingStage("solving");

      // Convert blob URL or data URL to clean base64
      const base64Image = await toCleanBase64(imageData);

      const { getAnswerLanguage } = await import("@/hooks/useAnswerLanguage");
      const answerLanguage = await getAnswerLanguage(userId);

      const body = {
        question: "",
        image: base64Image,
        isPremium,
        animatedSteps: false,
        solveMode: isPremium ? selectedMode : "instant",
        generateGraph: false,
        deviceType: (window as any).Capacitor?.isNativePlatform?.() ? "capacitor" : "web",
        answerLanguage,
        // Additional fields for backend compatibility
        mode: (isPremium ? selectedMode : "instant").toLowerCase(),
        ocr: "groq",
        language: answerLanguage || "en",
        multi: false,
      };

      const { data, error } = await supabase.functions.invoke("solve-homework", { body });

      if (error) throw error;

      const extractedQuestion = data.question || data.extractedText || "Image-based question";

      if (userId) {
        await supabase.from("solves").insert({
          user_id: userId,
          subject: data.subject || "general",
          question_text: extractedQuestion,
          question_image_url: imageData.substring(0, 500),
          solution_markdown: data.solution,
        });
      }

      onSolved(extractedQuestion, data.solution, data.subject || "general", imageData);
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
