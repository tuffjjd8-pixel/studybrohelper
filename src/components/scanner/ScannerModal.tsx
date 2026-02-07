import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CustomCamera } from "@/components/scanner/CustomCamera";
import { ImageCropper } from "@/components/scanner/ImageCropper";
import { ScannerDropZone } from "@/components/scanner/ScannerDropZone";
import { ScannerLoadingState } from "@/components/scanner/ScannerLoadingState";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
type ScannerState = "idle" | "camera" | "cropping" | "scanning";
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
  isPremium = false
}: ScannerModalProps) {
  const [state, setState] = useState<ScannerState>("idle");
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("extracting");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const handleOpenCamera = useCallback(() => {
    setState("camera");
  }, []);
  const handleCameraCapture = useCallback((imageData: string) => {
    setSelectedImage(imageData);
    setState("cropping");
  }, []);
  const handleCameraClose = useCallback(() => {
    setState("idle");
  }, []);
  const handleImageSelect = useCallback((imageData: string) => {
    setSelectedImage(imageData);
    setState("cropping");
  }, []);
  const handleCropComplete = useCallback(async (croppedData: string) => {
    setCroppedImage(croppedData);
    setState("scanning");
    await solveProblem(croppedData);
  }, []);
  const handleCropCancel = useCallback(() => {
    if (selectedImage?.startsWith("blob:")) {
      URL.revokeObjectURL(selectedImage);
    }
    setSelectedImage(null);
    setState("idle");
  }, [selectedImage]);
  const solveProblem = async (imageData: string) => {
    try {
      setLoadingStage("extracting");
      await new Promise(r => setTimeout(r, 500));
      setLoadingStage("classifying");
      await new Promise(r => setTimeout(r, 300));
      setLoadingStage("solving");
      const {
        data,
        error
      } = await supabase.functions.invoke("solve-homework", {
        body: {
          question: "",
          image: imageData,
          isPremium,
          animatedSteps: false,
          generateGraph: false
        }
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
          solution_markdown: data.solution
        });
      }

      // Pass result back to parent and close
      onSolved(extractedQuestion, data.solution, data.subject || "general", imageData);
      handleReset();
      onClose();
    } catch (error) {
      console.error("Scan error:", error);
      toast.error("Failed to scan homework. Please try again.");
      setState("idle");
      setSelectedImage(null);
      setCroppedImage(null);
    }
  };
  const handleReset = useCallback(() => {
    if (selectedImage?.startsWith("blob:")) {
      URL.revokeObjectURL(selectedImage);
    }
    if (croppedImage?.startsWith("blob:")) {
      URL.revokeObjectURL(croppedImage);
    }
    setState("idle");
    setSelectedImage(null);
    setCroppedImage(null);
  }, [selectedImage, croppedImage]);
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleReset();
      onClose();
    }
  };
  return <>
      {/* Custom Camera - rendered outside dialog for full-screen experience */}
      <CustomCamera isOpen={state === "camera"} onCapture={handleCameraCapture} onClose={handleCameraClose} />

      <Dialog open={isOpen && state !== "camera"} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto p-0 bg-background border-border">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-heading font-bold">Snap Homework</h2>
            <button onClick={() => handleOpenChange(false)} className="p-2 rounded-lg hover:bg-muted transition-colors">
              
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <AnimatePresence mode="wait">
              {state === "idle" && <motion.div key="idle" initial={{
              opacity: 0
            }} animate={{
              opacity: 1
            }} exit={{
              opacity: 0
            }} className="flex flex-col items-center gap-6">
                  <ScannerDropZone onImageSelect={handleImageSelect} onOpenCamera={handleOpenCamera} />
                  
                  <Button onClick={handleOpenCamera} variant="neonGreenFilled" size="lg" className="w-full max-w-xs font-heading font-bold">
                    Scan Homework
                  </Button>
                </motion.div>}

              {state === "cropping" && selectedImage && <motion.div key="cropping" initial={{
              opacity: 0
            }} animate={{
              opacity: 1
            }} exit={{
              opacity: 0
            }} className="flex flex-col items-center">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">
                    Crop your image
                  </h3>
                  <ImageCropper imageSrc={selectedImage} onCropComplete={handleCropComplete} onCancel={handleCropCancel} />
                </motion.div>}

              {state === "scanning" && <motion.div key="scanning" initial={{
              opacity: 0
            }} animate={{
              opacity: 1
            }} exit={{
              opacity: 0
            }}>
                  <ScannerLoadingState image={croppedImage || undefined} stage={loadingStage} />
                </motion.div>}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </>;
}