import { motion } from "framer-motion";
import { BookOpen, Lightbulb, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MathRenderer } from "@/components/solve/MathRenderer";
import { toast } from "sonner";

interface SolutionDisplayProps {
  extractedQuestion: string;
  subject: string;
  solution: string;
  questionImage?: string;
}

const subjectConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
  math: { 
    bg: "bg-blue-500/20", 
    text: "text-blue-400", 
    border: "border-blue-500/40",
    label: "Math"
  },
  physics: { 
    bg: "bg-purple-500/20", 
    text: "text-purple-400", 
    border: "border-purple-500/40",
    label: "Physics"
  },
  chemistry: { 
    bg: "bg-green-500/20", 
    text: "text-green-400", 
    border: "border-green-500/40",
    label: "Chemistry"
  },
  biology: { 
    bg: "bg-pink-500/20", 
    text: "text-pink-400", 
    border: "border-pink-500/40",
    label: "Biology"
  },
  history: { 
    bg: "bg-amber-500/20", 
    text: "text-amber-400", 
    border: "border-amber-500/40",
    label: "History"
  },
  english: { 
    bg: "bg-cyan-500/20", 
    text: "text-cyan-400", 
    border: "border-cyan-500/40",
    label: "English"
  },
  general: { 
    bg: "bg-primary/20", 
    text: "text-primary", 
    border: "border-primary/40",
    label: "General"
  },
  other: { 
    bg: "bg-muted", 
    text: "text-muted-foreground", 
    border: "border-border",
    label: "General"
  },
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
    try {
      await navigator.clipboard.writeText(text);
      if (type === "question") {
        setCopiedQuestion(true);
        setTimeout(() => setCopiedQuestion(false), 2000);
      } else {
        setCopiedSolution(true);
        setTimeout(() => setCopiedSolution(false), 2000);
      }
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const subjectKey = subject.toLowerCase();
  const config = subjectConfig[subjectKey] || subjectConfig.other;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto space-y-5"
    >
      {/* Subject Badge */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="flex justify-center"
      >
        <Badge 
          className={`px-4 py-1.5 text-sm font-medium border ${config.bg} ${config.text} ${config.border}`}
          variant="outline"
        >
          {config.label}
        </Badge>
      </motion.div>

      {/* Extracted Question Box */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden"
        style={{
          boxShadow: "0 4px 20px hsl(0 0% 0% / 0.3)",
        }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Extracted Question</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2 rounded-lg"
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
              className="max-h-36 rounded-xl mb-4 object-contain border border-border/50"
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
        className="rounded-2xl border overflow-hidden"
        style={{
          borderColor: "hsl(var(--primary) / 0.4)",
          boxShadow: "0 0 30px hsl(var(--primary) / 0.15), 0 4px 20px hsl(0 0% 0% / 0.3)",
        }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-primary/10" style={{ borderColor: "hsl(var(--primary) / 0.3)" }}>
          <Lightbulb className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Solution</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2 rounded-lg"
            onClick={() => copyToClipboard(solution, "solution")}
          >
            {copiedSolution ? (
              <Check className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
        <div className="p-4 bg-card/80 backdrop-blur-sm">
          <div className="math-solution">
            <MathRenderer content={solution} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
