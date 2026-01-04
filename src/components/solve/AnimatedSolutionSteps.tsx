import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { ChevronRight, ChevronLeft, Play, Pause, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface Step {
  title: string;
  content: string;
}

interface AnimatedSolutionStepsProps {
  steps: Step[];
  maxSteps: number;
  isPremium: boolean;
  autoPlay?: boolean;
  autoPlayDelay?: number;
}

export function AnimatedSolutionSteps({
  steps,
  maxSteps,
  isPremium,
  autoPlay = false,
  autoPlayDelay = 3000,
}: AnimatedSolutionStepsProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [revealedSteps, setRevealedSteps] = useState<number[]>([0]);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isTypewriting, setIsTypewriting] = useState(true);
  const [displayedContent, setDisplayedContent] = useState("");

  const totalSteps = Math.min(steps.length, maxSteps);
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Typewriter effect for current step
  useEffect(() => {
    if (!steps[currentStep]) return;
    
    const content = steps[currentStep].content;
    setDisplayedContent("");
    setIsTypewriting(true);

    let index = 0;
    const speed = isPremium ? 15 : 25; // Premium gets faster typing

    const timer = setInterval(() => {
      if (index < content.length) {
        setDisplayedContent(content.slice(0, index + 1));
        index++;
      } else {
        setIsTypewriting(false);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [currentStep, steps, isPremium]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || isTypewriting) return;

    const timer = setTimeout(() => {
      if (currentStep < totalSteps - 1) {
        goToNextStep();
      } else {
        setIsPlaying(false);
      }
    }, autoPlayDelay);

    return () => clearTimeout(timer);
  }, [isPlaying, isTypewriting, currentStep, totalSteps, autoPlayDelay]);

  const goToNextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (!revealedSteps.includes(nextStep)) {
        setRevealedSteps((prev) => [...prev, nextStep]);
      }
    }
  }, [currentStep, totalSteps, revealedSteps]);

  const goToPrevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const skipToEnd = useCallback(() => {
    setCurrentStep(totalSteps - 1);
    setRevealedSteps(Array.from({ length: totalSteps }, (_, i) => i));
    setIsPlaying(false);
  }, [totalSteps]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const goToStep = useCallback((index: number) => {
    if (revealedSteps.includes(index)) {
      setCurrentStep(index);
    }
  }, [revealedSteps]);

  if (!steps.length) {
    return (
      <div className="glass-card p-6 text-center text-muted-foreground">
        No steps available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress bar and controls */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={togglePlay}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={skipToEnd}
              title="Skip to end"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <Progress value={progress} className="h-2 mb-3" />

        {/* Step indicators */}
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToStep(index)}
              disabled={!revealedSteps.includes(index)}
              className={`
                w-8 h-8 rounded-lg text-xs font-medium transition-all
                ${index === currentStep 
                  ? "bg-primary text-primary-foreground scale-110" 
                  : revealedSteps.includes(index)
                    ? "bg-primary/20 text-primary hover:bg-primary/30"
                    : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                }
              `}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Current step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="glass-card p-6 neon-border"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{currentStep + 1}</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {steps[currentStep]?.title || `Step ${currentStep + 1}`}
            </h3>
            {isTypewriting && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="w-0.5 h-5 bg-primary ml-1"
              />
            )}
          </div>

          <div className="prose prose-invert prose-sm max-w-none math-solution">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p: ({ children }) => (
                  <p className="text-foreground/90 mb-3 leading-relaxed">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-bold text-primary">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="text-secondary italic">{children}</em>
                ),
                code: ({ children }) => (
                  <code className="bg-muted px-1.5 py-0.5 rounded text-primary text-sm font-mono">
                    {children}
                  </code>
                ),
              }}
            >
              {displayedContent}
            </ReactMarkdown>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goToPrevStep}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <span className="text-sm text-muted-foreground">
          {isPremium ? "Premium" : "Free"} • Up to {maxSteps} steps
        </span>

        <Button
          variant="neon"
          onClick={goToNextStep}
          disabled={currentStep === totalSteps - 1 || isTypewriting}
          className="gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
