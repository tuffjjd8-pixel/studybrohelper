import { motion } from "framer-motion";
import { BookOpen, Lightbulb, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { preprocessMath } from "@/lib/mathPreprocess";

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
            <div
              className="inline-block mb-4 rounded-xl border border-white/10 p-1.5"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--muted) / 0.5), hsl(var(--muted) / 0.25)), repeating-conic-gradient(hsl(var(--foreground) / 0.04) 0% 25%, transparent 0% 50%) 50% / 12px 12px",
                boxShadow: "0 2px 10px hsl(0 0% 0% / 0.25), inset 0 0 0 1px hsl(var(--foreground) / 0.04)",
              }}
            >
              <img
                src={questionImage}
                alt="Question"
                loading="lazy"
                decoding="async"
                className="block max-h-36 w-auto object-contain rounded-lg"
              />
            </div>
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
          <div className="prose prose-invert prose-sm max-w-none math-solution">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p: ({ children }) => <p className="text-foreground/90 mb-3 leading-relaxed">{children}</p>,
                strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
              }}
            >
              {preprocessMath(solution)}
            </ReactMarkdown>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
