import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CustomCamera } from "@/components/scanner/CustomCamera";
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
}

export function ScannerModal({
  isOpen,
  onClose,
  onSolved,
  userId,
  isPremium = false,
}: ScannerModalProps) {
  const [state, setState] = useState<ScannerState>("idle");
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("extracting");
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Open camera immediately when modal opens
  const cameraActive = isOpen && (state === "idle" || state === "camera");

  const handleCameraCapture = useCallback((imageData: string) => {
    setCapturedImage(imageData);
    setState("cropping");
  }, []);

  const handleCropComplete = useCallback((croppedImage: string) => {
    // Clean up original capture
    if (capturedImage?.startsWith("blob:")) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setProcessedImage(croppedImage);
    setState("scanning");
    setLoadingStage("classifying");
    solveProblem(croppedImage);
  }, [capturedImage]);

  const handleCropCancel = useCallback(() => {
    if (capturedImage?.startsWith("blob:")) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setState("idle");
  }, [capturedImage]);

  const handleCameraClose = useCallback(() => {
    handleReset();
    onClose();
  }, [onClose]);

  const solveProblem = async (imageData: string) => {
    try {
      setLoadingStage("classifying");
      await new Promise((r) => setTimeout(r, 200));
      setLoadingStage("solving");

      const { data, error } = await supabase.functions.invoke("solve-homework", {
        body: {
          question: "",
          image: imageData,
          isPremium,
          animatedSteps: false,
          generateGraph: false,
        },
      });

      if (error) throw error;

      const extractedQuestion = data.question || data.extractedText || "Image-based question";

      // Save to database if logged in
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
    setCapturedImage(null);
  }, []);

  return (
    <>
      {/* Full-screen native camera — opens immediately */}
      <CustomCamera
        isOpen={cameraActive}
        onCapture={handleCameraCapture}
        onClose={handleCameraClose}
      />

      {/* Manual crop screen */}
      {state === "cropping" && capturedImage && (
        <ImageCropper
          imageSrc={capturedImage}
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
