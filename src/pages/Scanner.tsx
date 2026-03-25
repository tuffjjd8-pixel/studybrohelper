import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Camera, MessageCircle, Crop, RotateCcw, Wand2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { ConfettiCelebration } from "@/components/layout/ConfettiCelebration";
import { ScannerDropZone } from "@/components/scanner/ScannerDropZone";
import { CustomCamera, type CameraCaptureResult, type CameraSolveMode } from "@/components/scanner/CustomCamera";
import { ImageCropper } from "@/components/scanner/ImageCropper";
import { SolutionDisplay } from "@/components/scanner/SolutionDisplay";
import { ScannerLoadingState } from "@/components/scanner/ScannerLoadingState";
import { ScarcityMessage } from "@/components/solve/ScarcityMessage";
import { SoftUpgradeBanner } from "@/components/solve/SoftUpgradeBanner";
import { Button } from "@/components/ui/button";
import { AIBrainIcon } from "@/components/ui/AIBrainIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSolveUsage } from "@/hooks/useSolveUsage";
import { toast } from "sonner";

type ScannerState = "idle" | "camera" | "previewing" | "scanning" | "cropping" | "solved";
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
  const solveUsage = useSolveUsage(user?.id, false);
  
  const [state, setState] = useState<ScannerState>("idle");
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("extracting");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [solution, setSolution] = useState<SolutionData | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedMode, setSelectedMode] = useState<CameraSolveMode>("instant");
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpText, setFollowUpText] = useState("");

  const handleOpenCamera = useCallback(() => {
    setState("camera");
  }, []);

  // After capture: brief preview then auto-solve
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
      solveProblem(capturedFile);
    }, 400);
    return () => clearTimeout(timer);
  }, [state, capturedFile]);

  const handleCameraClose = useCallback(() => {
    setState("idle");
  }, []);

  // Gallery/drop-zone: also auto-solve immediately
  const handleImageSelect = useCallback((file: File) => {
    setCapturedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setState("previewing");
  }, []);

  // Optional crop: user chose to crop
  const handleCropRequest = useCallback(() => {
    setState("cropping");
  }, []);

  const handleCropComplete = useCallback((croppedData: string) => {
    // Convert cropped data URL back to File
    fetch(croppedData)
      .then(r => r.blob())
      .then(blob => {
        const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setCapturedFile(file);
        setPreviewUrl(croppedData);
        setState("scanning");
        solveProblem(file);
      });
  }, [previewUrl]);

  const handleCropCancel = useCallback(() => {
    if (solution) {
      setState("solved");
    } else {
      setState("scanning");
    }
  }, [solution]);

  // Retake: go back to camera
  const handleRetake = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setCapturedFile(null);
    setPreviewUrl(null);
    setSolution(null);
    setShowFollowUp(false);
    setState("camera");
  }, [previewUrl]);

  const solveProblem = async (file: File) => {
    if (!user) {
      toast.error("Please sign in to use AI features.");
      return;
    }
    try {
      setLoadingStage("extracting");
      await new Promise((r) => setTimeout(r, 300));
      setLoadingStage("classifying");
      await new Promise((r) => setTimeout(r, 200));
      setLoadingStage("solving");

      const isPro = solveUsage.isPremium;
      const mode = isPro ? "solve_pro" : "solve_free";

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

      setSolution({
        subject: "general",
        question: extractedQuestion,
        solution: data.solution,
        image: previewUrl || undefined,
      });

      if (user) {
        await supabase.from("solves").insert({
          user_id: user.id,
          subject: "general",
          question_text: extractedQuestion,
          question_image_url: file.name,
          solution_markdown: data.solution,
        });
      }

      setState("solved");
      setShowConfetti(true);
    } catch (error) {
      console.error("Scan error:", error);
      toast.error("Failed to scan homework. Please try again.");
      setState("idle");
      setCapturedFile(null);
    }
  };

  const handleReset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setState("idle");
    setCapturedFile(null);
    setPreviewUrl(null);
    setSolution(null);
    setShowFollowUp(false);
    setFollowUpText("");
  }, [previewUrl]);

  return (
    <div className="min-h-screen bg-background">
      <Header streak={0} totalSolves={0} />

      {/* Camera */}
      <CustomCamera
        isOpen={state === "camera"}
        onCapture={handleCameraCapture}
        onClose={handleCameraClose}
      />

      {/* Optional crop UI */}
      {state === "cropping" && previewUrl && (
        <ImageCropper
          imageSrc={previewUrl}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

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

                <ScannerDropZone 
                  onImageSelect={handleImageSelect} 
                  onOpenCamera={handleOpenCamera}
                />

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

            {/* Brief preview flash before auto-solve */}
            {state === "previewing" && capturedImage && (
              <motion.div
                key="previewing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <div 
                  className="rounded-2xl overflow-hidden border-2 border-primary/40"
                  style={{ boxShadow: "0 0 40px hsl(var(--primary) / 0.3)" }}
                >
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="max-h-64 object-contain"
                  />
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">Solving...</p>
              </motion.div>
            )}

            {/* Scanning / loading */}
            {state === "scanning" && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <ScannerLoadingState 
                  image={capturedImage || undefined}
                  stage={loadingStage}
                />

                {/* Optional retake/crop bar during loading */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex justify-center gap-3"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetake}
                    className="gap-1.5 text-xs rounded-full border-border"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retake
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCropRequest}
                    className="gap-1.5 text-xs rounded-full border-border"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    Crop / Edit
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {/* Result screen */}
            {state === "solved" && solution && (
              <motion.div
                key="solved"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* 1. Answer at the top */}
                <SolutionDisplay
                  extractedQuestion={solution.question}
                  subject={solution.subject}
                  solution={solution.solution}
                  questionImage={solution.image}
                />

                {/* 2. Primary CTA: Scan next problem */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="flex justify-center pt-2"
                >
                  <Button
                    onClick={handleOpenCamera}
                    className="gap-3 px-10 py-6 text-base font-heading font-bold rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                    style={{
                      boxShadow: "0 0 35px hsl(var(--primary) / 0.35), 0 4px 18px hsl(var(--primary) / 0.25)",
                    }}
                  >
                    <Camera className="w-5 h-5" />
                    Scan Next Problem
                  </Button>
                </motion.div>

                {/* 3. Secondary: Follow-up collapsed bar */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="flex justify-center"
                >
                  {!showFollowUp ? (
                    <button
                      onClick={() => setShowFollowUp(true)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-muted/60 hover:bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Still confused? Ask a question
                    </button>
                  ) : (
                    <div className="w-full max-w-lg space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={followUpText}
                          onChange={(e) => setFollowUpText(e.target.value)}
                          placeholder="Ask about this problem..."
                          className="flex-1 px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && followUpText.trim()) {
                              toast.info("Follow-up feature coming soon!");
                              setFollowUpText("");
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          className="rounded-xl px-4"
                          onClick={() => {
                            if (followUpText.trim()) {
                              toast.info("Follow-up feature coming soon!");
                              setFollowUpText("");
                            }
                          }}
                        >
                          Ask
                        </Button>
                      </div>
                      <button
                        onClick={() => setShowFollowUp(false)}
                        className="text-xs text-muted-foreground hover:text-foreground ml-1"
                      >
                        Collapse
                      </button>
                    </div>
                  )}
                </motion.div>

                {/* 4. Tertiary: Retake / Crop / extras */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="flex justify-center gap-2 flex-wrap"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRetake}
                    className="gap-1.5 text-xs text-muted-foreground rounded-full"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retake
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCropRequest}
                    className="gap-1.5 text-xs text-muted-foreground rounded-full"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    Crop
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toast.info("Humanize coming soon!")}
                    className="gap-1.5 text-xs text-muted-foreground rounded-full"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Humanize
                  </Button>
                </motion.div>

                {/* Scarcity message */}
                <ScarcityMessage
                  solvesRemaining={solveUsage.solvesRemaining}
                  maxSolves={solveUsage.maxSolves}
                  isPremium={solveUsage.isPremium}
                  isAuthenticated={!!user}
                />

                {/* Reset link */}
                <div className="flex justify-center pt-2">
                  <button
                    onClick={handleReset}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Start over
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <BottomNav />
      <ConfettiCelebration show={showConfetti} onComplete={() => setShowConfetti(false)} />
    </div>
  );
};

export default Scanner;
