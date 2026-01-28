import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Scan, Loader2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { ConfettiCelebration } from "@/components/layout/ConfettiCelebration";
import { ScannerDropZone } from "@/components/scanner/ScannerDropZone";
import { ImageCropper } from "@/components/scanner/ImageCropper";
import { SolutionDisplay } from "@/components/scanner/SolutionDisplay";
import { Button } from "@/components/ui/button";
import { AIBrainIcon } from "@/components/ui/AIBrainIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type ScannerState = "idle" | "cropping" | "scanning" | "solved";

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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [solution, setSolution] = useState<SolutionData | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleImageSelect = (imageData: string) => {
    setSelectedImage(imageData);
    setState("cropping");
  };

  const handleCropComplete = async (croppedData: string) => {
    setCroppedImage(croppedData);
    setState("scanning");
    await solveProblem(croppedData);
  };

  const handleCropCancel = () => {
    setSelectedImage(null);
    setState("idle");
  };

  const solveProblem = async (imageData: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("solve-homework", {
        body: { 
          question: "", 
          image: imageData,
          isPremium: false,
          animatedSteps: false,
          generateGraph: false,
        },
      });

      if (error) throw error;

      // Extract question from solution (first line typically)
      const extractedQuestion = data.question || data.extractedText || "Image-based question";

      setSolution({
        subject: data.subject || "other",
        question: extractedQuestion,
        solution: data.solution,
        image: imageData,
      });

      // Save to database if logged in
      if (user) {
        await supabase.from("solves").insert({
          user_id: user.id,
          subject: data.subject || "other",
          question_text: extractedQuestion,
          question_image_url: imageData,
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

  const handleReset = () => {
    setState("idle");
    setSelectedImage(null);
    setCroppedImage(null);
    setSolution(null);
  };

  const handleScanAnother = () => {
    handleReset();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header streak={0} totalSolves={0} />

      <main className="pt-20 pb-32 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-8"
          >
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
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
                <div className="text-center space-y-2">
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-4"
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
                <ScannerDropZone onImageSelect={handleImageSelect} />
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
                <h2 className="text-lg font-medium mb-4">Crop Your Image</h2>
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
                className="flex flex-col items-center gap-6 py-16"
              >
                {croppedImage && (
                  <motion.img
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    src={croppedImage}
                    alt="Scanning"
                    className="max-h-48 rounded-xl border-2 border-primary/30 object-contain"
                  />
                )}
                <div className="flex flex-col items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="w-10 h-10 text-primary" />
                  </motion.div>
                  <div className="text-center">
                    <p className="font-medium text-foreground">Analyzing homework...</p>
                    <p className="text-sm text-muted-foreground">
                      Extracting text & solving problem
                    </p>
                  </div>
                </div>
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

                <div className="flex justify-center">
                  <Button
                    variant="hero"
                    size="lg"
                    onClick={handleScanAnother}
                    className="gap-2"
                  >
                    <Scan className="w-5 h-5" />
                    Scan Another
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Large Scan Button (only visible when idle) */}
      {state === "idle" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 left-0 right-0 px-4 flex justify-center"
        >
          <Button
            variant="hero"
            size="lg"
            className="gap-2 px-8 py-6 text-lg font-bold shadow-lg shadow-primary/30"
            onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
          >
            <Scan className="w-6 h-6" />
            Scan Homework
          </Button>
        </motion.div>
      )}

      <BottomNav />
      <ConfettiCelebration show={showConfetti} onComplete={() => setShowConfetti(false)} />
    </div>
  );
};

export default Scanner;
