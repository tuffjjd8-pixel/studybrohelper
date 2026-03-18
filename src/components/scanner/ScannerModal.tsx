import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CustomCamera, type CameraCaptureResult, type CameraSolveMode } from "@/components/scanner/CustomCamera";
import { ImageCropper } from "@/components/scanner/ImageCropper";
import { ScannerLoadingState } from "@/components/scanner/ScannerLoadingState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ScannerState = "idle" | "camera" | "cropping" | "processing" | "scanning";
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
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [selectedMode, setSelectedMode] = useState<CameraSolveMode>("instant");

  const cameraActive = isOpen && (state === "idle" || state === "camera");

  const handleCameraCapture = useCallback((result: CameraCaptureResult) => {
    setCapturedImages(result.images);
    setSelectedMode(result.mode);

    // Multi-image: skip crop, go straight to solve
    if (result.images.length > 1) {
      setState("scanning");
      setLoadingStage("classifying");
      // TODO: Full multi-image support — for now use first image
      solveProblem(result.images[0], result.images);
    } else {
      // Single image: show crop UI
      setState("cropping");
    }
  }, []);

  const handleCropComplete = useCallback((croppedImage: string) => {
    // Clean up original capture
    capturedImages.forEach(img => {
      if (img.startsWith("blob:")) URL.revokeObjectURL(img);
    });
    setCapturedImages([]);
    setProcessedImage(croppedImage);
    setState("scanning");
    setLoadingStage("classifying");
    solveProblem(croppedImage);
  }, [capturedImages]);

  const handleCropCancel = useCallback(() => {
    capturedImages.forEach(img => {
      if (img.startsWith("blob:")) URL.revokeObjectURL(img);
    });
    setCapturedImages([]);
    setState("idle");
  }, [capturedImages]);

  const handleCameraClose = useCallback(() => {
    handleReset();
    onClose();
  }, [onClose]);

  const solveProblem = async (imageData: string, allImages?: string[]) => {
    if (!userId) {
      toast.error("Please sign in to use AI features.");
      return;
    }
    try {
      setLoadingStage("classifying");
      await new Promise((r) => setTimeout(r, 200));
      setLoadingStage("solving");

      const { getAnswerLanguage } = await import("@/hooks/useAnswerLanguage");
      const answerLanguage = await getAnswerLanguage(userId);

      // Build body — if multiple images, send images array
      const body: Record<string, unknown> = {
        question: "",
        image: imageData,
        isPremium,
        animatedSteps: false,
        solveMode: isPremium ? selectedMode : "instant",
        generateGraph: false,
        deviceType: (window as any).Capacitor?.isNativePlatform?.() ? "capacitor" : "web",
        answerLanguage,
      };

      // TODO: When backend fully supports multi-image, send all images
      if (allImages && allImages.length > 1) {
        body.images = allImages;
        delete body.image;
      }

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
    setProcessedImage(null);
    setCapturedImages([]);
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

      {/* Manual crop screen — only for single image */}
      {state === "cropping" && capturedImages.length === 1 && (
        <ImageCropper
          imageSrc={capturedImages[0]}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      {/* Processing / scanning dialog */}
      {(state === "processing" || state === "scanning") && (
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
                    image={processedImage || undefined}
                    stage={loadingStage}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
