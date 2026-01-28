import { motion } from "framer-motion";
import { BookOpen, Lightbulb, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MathRenderer } from "@/components/solve/MathRenderer";
import { toast } from "sonner";

interface SolutionDisplayProps {
  extractedQuestion: string;
  subject: string;
  solution: string;
  questionImage?: string;
}

const subjectColors: Record<string, string> = {
  math: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  physics: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  chemistry: "bg-green-500/20 text-green-400 border-green-500/30",
  biology: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  history: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  english: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  other: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export function SolutionDisplay({ 
  extractedQuestion, 
  subject, 
  solution,
  questionImage 
}: SolutionDisplayProps) {
  const [copiedQuestion, setCopiedQuestion] = useState(false);
  const [copiedSolution, setCopiedSolution] = useState(false);

  const copyToClipboard = async (text: string, type: "question" | "solution") => {
    await navigator.clipboard.writeText(text);
    if (type === "question") {
      setCopiedQuestion(true);
      setTimeout(() => setCopiedQuestion(false), 2000);
    } else {
      setCopiedSolution(true);
      setTimeout(() => setCopiedSolution(false), 2000);
    }
    toast.success("Copied to clipboard!");
  };

  const subjectLabel = subject.charAt(0).toUpperCase() + subject.slice(1);
  const colorClass = subjectColors[subject.toLowerCase()] || subjectColors.other;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto space-y-4"
    >
      {/* Subject Badge */}
      <div className="flex justify-center">
        <span className={`px-4 py-1.5 rounded-full text-sm font-medium border ${colorClass}`}>
          {subjectLabel}
        </span>
      </div>

      {/* Extracted Question Box */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="relative rounded-2xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Extracted Question</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2"
            onClick={() => copyToClipboard(extractedQuestion, "question")}
          >
            {copiedQuestion ? (
              <Check className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
        <div className="p-4">
          {questionImage && (
            <img 
              src={questionImage} 
              alt="Question" 
              className="max-h-32 rounded-lg mb-3 object-contain"
            />
          )}
          <p className="text-foreground leading-relaxed">
            {extractedQuestion || "Image-based question"}
          </p>
        </div>
      </motion.div>

      {/* Solution Box */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="relative rounded-2xl border border-primary/30 bg-card/80 backdrop-blur-sm overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/20 bg-primary/5">
          <Lightbulb className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Solution</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2"
            onClick={() => copyToClipboard(solution, "solution")}
          >
            {copiedSolution ? (
              <Check className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
        <div className="p-4">
          <MathRenderer content={solution} />
        </div>
      </motion.div>
    </motion.div>
  );
}
