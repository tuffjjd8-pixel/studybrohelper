import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Header } from "@/components/layout/Header";
import { ToolsScroller } from "@/components/home/ToolsScroller";
import { ConfettiCelebration } from "@/components/layout/ConfettiCelebration";
import { ScannerDropZone } from "@/components/scanner/ScannerDropZone";
import { CustomCamera } from "@/components/scanner/CustomCamera";
import { ImageCropper } from "@/components/scanner/ImageCropper";
import { SolutionDisplay } from "@/components/scanner/SolutionDisplay";
import { ScannerLoadingState } from "@/components/scanner/ScannerLoadingState";
import { Button } from "@/components/ui/button";
import { AIBrainIcon } from "@/components/ui/AIBrainIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type ScannerState = "idle" | "camera" | "cropping" | "scanning" | "solved";
type LoadingStage = "extracting" | "classifying" | "solving";

interface SolutionData {
  subject: string;
  question: string;
  solution: string;
  image?: string;
}

const Scanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [state, setState] = useState<ScannerState>("idle");
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("extracting");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [solution, setSolution] = useState<SolutionData | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

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
    // Clean up blob URL if needed
    if (selectedImage?.startsWith("blob:")) {
      URL.revokeObjectURL(selectedImage);
    }
    setSelectedImage(null);
    setState("idle");
  }, [selectedImage]);

  const solveProblem = async (imageData: string) => {
    try {
      // Stage 1: Extracting
      setLoadingStage("extracting");
      await new Promise((r) => setTimeout(r, 500));
      
      // Stage 2: Classifying
      setLoadingStage("classifying");
      await new Promise((r) => setTimeout(r, 300));
      
      // Stage 3: Solving
      setLoadingStage("solving");
      
      const { data, error } = await supabase.functions.invoke("solve-homework", {
        body: { 
          question: "", 
          image: imageData,
          isPremium: false,
          animatedSteps: false,
          generateGraph: false,
          deviceType: (window as any).Capacitor?.isNativePlatform?.() ? "capacitor" : "web",
        },
      });

      if (error) throw error;

      const extractedQuestion = data.question || data.extractedText || "Image-based question";

      setSolution({
        subject: data.subject || "general",
        question: extractedQuestion,
        solution: data.solution,
        image: imageData,
      });

      // Save to database if logged in
      if (user) {
        await supabase.from("solves").insert({
          user_id: user.id,
          subject: data.subject || "general",
          question_text: extractedQuestion,
          question_image_url: imageData.substring(0, 500), // Truncate for storage
          solution_markdown: data.solution,
        });
      }

      setState("solved");
      setShowConfetti(true);
    } catch (error) {
      console.error("Scan error:", error);
      toast.error("Failed to scan homework. Please try again.");
      setState("idle");
      setSelectedImage(null);
      setCroppedImage(null);
    }
  };

  const handleReset = useCallback(() => {
    // Clean up blob URLs
    if (selectedImage?.startsWith("blob:")) {
      URL.revokeObjectURL(selectedImage);
    }
    if (croppedImage?.startsWith("blob:")) {
      URL.revokeObjectURL(croppedImage);
    }
    setState("idle");
    setSelectedImage(null);
    setCroppedImage(null);
    setSolution(null);
  }, [selectedImage, croppedImage]);

  return (
    <div className="min-h-screen bg-background">
      <Header streak={0} totalSolves={0} />

      {/* Custom Camera Modal */}
      <CustomCamera
        isOpen={state === "camera"}
        onCapture={handleCameraCapture}
        onClose={handleCameraClose}
      />

      <main 
        className="pt-20 pb-32 px-4"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 5rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8rem)",
        }}
      >
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-8"
          >
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-xl hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-3">
              <div 
                className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center"
                style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.3)" }}
              >
                <AIBrainIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-heading font-bold">Snap Scanner</h1>
                <p className="text-xs text-muted-foreground">AI-powered homework solver</p>
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <AnimatePresence mode="wait">
            {state === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-8"
              >
                {/* Hero Section */}
                <div className="text-center space-y-3">
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30"
                    style={{ boxShadow: "0 0 15px hsl(var(--primary) / 0.2)" }}
                  >
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm text-primary font-medium">
                      Instant OCR + AI Solver
                    </span>
                  </motion.div>
                  <h2 className="text-2xl md:text-3xl font-heading font-bold">
                    Scan. Crop. <span className="text-gradient">Solve.</span>
                  </h2>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Take a photo or upload an image of your homework. 
                    Our AI will extract the question and solve it step-by-step.
                  </p>
                </div>

                {/* Drop Zone */}
                <ScannerDropZone 
                  onImageSelect={handleImageSelect} 
                  onOpenCamera={handleOpenCamera}
                />

                {/* Large Scan Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Button
                    onClick={handleOpenCamera}
                    className="gap-3 px-10 py-7 text-lg font-heading font-bold rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                    style={{
                      boxShadow: "0 0 40px hsl(var(--primary) / 0.4), 0 4px 20px hsl(var(--primary) / 0.3)",
                    }}
                  >
                    <AIBrainIcon className="w-6 h-6" />
                    Scan Homework
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {state === "cropping" && selectedImage && (
              <motion.div
                key="cropping"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <h2 className="text-lg font-heading font-semibold mb-4">Crop Your Image</h2>
                <ImageCropper
                  imageSrc={selectedImage}
                  onCropComplete={handleCropComplete}
                  onCancel={handleCropCancel}
                />
              </motion.div>
            )}

            {state === "scanning" && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ScannerLoadingState 
                  image={croppedImage || undefined}
                  stage={loadingStage}
                />
              </motion.div>
            )}

            {state === "solved" && solution && (
              <motion.div
                key="solved"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <SolutionDisplay
                  extractedQuestion={solution.question}
                  subject={solution.subject}
                  solution={solution.solution}
                  questionImage={solution.image}
                />

                <div className="flex justify-center pt-4">
                  <Button
                    onClick={handleReset}
                    className="gap-3 px-8 py-6 text-base font-heading font-bold rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                    style={{
                      boxShadow: "0 0 30px hsl(var(--primary) / 0.3), 0 4px 15px hsl(var(--primary) / 0.25)",
                    }}
                  >
                    <AIBrainIcon className="w-5 h-5" />
                    Scan Another
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <ToolsScroller />
      <ConfettiCelebration show={showConfetti} onComplete={() => setShowConfetti(false)} />
    </div>
  );
};

export default Scanner;
