import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CustomCamera } from "@/components/scanner/CustomCamera";
import { ScannerLoadingState } from "@/components/scanner/ScannerLoadingState";
import { processHomeworkImage } from "@/lib/imageProcessing";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ScannerState = "idle" | "camera" | "processing" | "scanning";
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

  // Open camera immediately when modal opens
  const cameraActive = isOpen && (state === "idle" || state === "camera");

  const handleCameraCapture = useCallback(async (imageData: string) => {
    setState("processing");
    try {
      // Auto-crop pipeline: edge detect → deskew → crop → enhance
      setLoadingStage("extracting");
      const processed = await processHomeworkImage(imageData);

      // Clean up blob URL from camera
      if (imageData.startsWith("blob:")) {
        URL.revokeObjectURL(imageData);
      }

      setProcessedImage(processed);
      setState("scanning");
      await solveProblem(processed);
    } catch (err) {
      console.error("Processing error:", err);
      // Fallback: use original image if processing fails
      setProcessedImage(imageData);
      setState("scanning");
      await solveProblem(imageData);
    }
  }, []);

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
  }, []);

  return (
    <>
      {/* Full-screen native camera — opens immediately */}
      <CustomCamera
        isOpen={cameraActive}
        onCapture={handleCameraCapture}
        onClose={handleCameraClose}
      />

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
