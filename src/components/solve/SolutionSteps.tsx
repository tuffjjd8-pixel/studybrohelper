import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { BookOpen, Calculator, Beaker, Globe, Pencil, Copy, Share2, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface SolutionStepsProps {
  subject: string;
  question: string;
  solution: string;
  questionImage?: string;
  onFollowUp?: () => void;
}

const subjectIcons: Record<string, React.ReactNode> = {
  math: <Calculator className="w-5 h-5" />,
  science: <Beaker className="w-5 h-5" />,
  history: <Globe className="w-5 h-5" />,
  english: <Pencil className="w-5 h-5" />,
  other: <BookOpen className="w-5 h-5" />,
};

const subjectGradients: Record<string, string> = {
  math: "from-primary/20 to-primary/5",
  science: "from-secondary/20 to-secondary/5",
  history: "from-amber-500/20 to-amber-500/5",
  english: "from-purple-500/20 to-purple-500/5",
  other: "from-muted to-muted/50",
};

export function SolutionSteps({ subject, question, solution, questionImage, onFollowUp }: SolutionStepsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(solution);
    setCopied(true);
    toast.success("Solution copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Solved by StudyBro AI",
          text: `${question}\n\n${solution}`,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl mx-auto space-y-4"
    >
      {/* Subject badge */}
      <div className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-full
        bg-gradient-to-r ${subjectGradients[subject] || subjectGradients.other}
        border border-border/50
      `}>
        {subjectIcons[subject] || subjectIcons.other}
        <span className="font-medium capitalize text-sm">{subject}</span>
      </div>

      {/* Question */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Question
        </h3>
        {questionImage && (
          <img 
            src={questionImage} 
            alt="Question" 
            className="max-h-48 rounded-lg mb-3 object-contain"
          />
        )}
        <p className="text-foreground">{question}</p>
      </div>

      {/* Solution */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6 neon-border"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-medium text-primary uppercase tracking-wider">
            Solution
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="text-muted-foreground hover:text-foreground"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="text-xl font-bold text-foreground mb-3">{children}</h1>,
              h2: ({ children }) => <h2 className="text-lg font-semibold text-foreground mb-2 mt-4">{children}</h2>,
              h3: ({ children }) => <h3 className="text-base font-medium text-foreground mb-2 mt-3">{children}</h3>,
              p: ({ children }) => <p className="text-foreground/90 mb-3 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-foreground/90">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-foreground/90">{children}</ol>,
              li: ({ children }) => <li className="text-foreground/90">{children}</li>,
              strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
              em: ({ children }) => <em className="text-secondary italic">{children}</em>,
              code: ({ children }) => (
                <code className="bg-muted px-1.5 py-0.5 rounded text-primary text-sm font-mono">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-3">
                  {children}
                </pre>
              ),
            }}
          >
            {solution}
          </ReactMarkdown>
        </div>
      </motion.div>

      {/* Follow up button */}
      {onFollowUp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <Button
            variant="glass"
            size="lg"
            onClick={onFollowUp}
            className="gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Ask a follow-up question
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
