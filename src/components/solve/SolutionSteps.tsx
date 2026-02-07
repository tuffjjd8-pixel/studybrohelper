import { MathRenderer } from "./MathRenderer";
import { motion } from "framer-motion";
import { BookOpen, Calculator, Beaker, Globe, Pencil, Copy, Share2, Check, Send, Crown, Lock } from "lucide-react";
import { AIBrainIcon } from "@/components/ui/AIBrainIcon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { Link } from "react-router-dom";

const FREE_FOLLOWUP_LIMIT = 2;

interface SolutionStepsProps {
  subject: string;
  question: string;
  solution: string;
  questionImage?: string;
  solveId?: string;
  onFollowUp?: () => void;
  isFromHistory?: boolean;
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

export function SolutionSteps({ subject, question, solution, questionImage, solveId, onFollowUp, isFromHistory }: SolutionStepsProps) {
  const { isPremium } = usePremiumStatus();
  const [copied, setCopied] = useState(false);
  const [followUpText, setFollowUpText] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [followUpResponse, setFollowUpResponse] = useState<string | null>(null);
  const [followUpCount, setFollowUpCount] = useState(0);

  const followUpLimitReached = !isPremium && followUpCount >= FREE_FOLLOWUP_LIMIT;
  const followUpBlocked = !isPremium && isFromHistory;

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

  const handleFollowUpSubmit = async () => {
    if (!followUpText.trim() || isAsking) return;

    setIsAsking(true);
    try {
      const { data, error } = await supabase.functions.invoke("follow-up-chat", {
        body: {
          solveId,
          message: followUpText.trim(),
          context: {
            subject,
            question,
            solution,
          },
          history: followUpResponse ? [
            { role: "assistant", content: followUpResponse }
          ] : [],
        },
      });

      if (error) throw error;

      setFollowUpResponse(data.response);
      setFollowUpText("");
      setFollowUpCount(prev => prev + 1);
      toast.success("Got your answer!");
    } catch (error) {
      console.error("Follow-up error:", error);
      toast.error("Failed to get answer. Try again.");
    } finally {
      setIsAsking(false);
    }
  };

  const handleFollowUpKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleFollowUpSubmit();
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
        <div className="prose prose-invert prose-sm max-w-none math-solution">
          <MathRenderer content={solution} />
        </div>
      </motion.div>

      {/* Follow-up response */}
      {followUpResponse && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 border-l-4 border-l-secondary"
        >
          <h3 className="text-xs font-medium text-secondary uppercase tracking-wider mb-4">
            Follow-up Answer
          </h3>
          <div className="prose prose-invert prose-sm max-w-none">
          <MathRenderer content={followUpResponse} />
          </div>
        </motion.div>
      )}

      {/* Inline follow-up input */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-4"
      >
        {followUpBlocked ? (
          <div className="text-center space-y-2 py-2">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span className="text-sm font-medium">Follow-ups unavailable in history</span>
            </div>
            <Link to="/premium">
              <span className="text-xs text-primary hover:underline">Upgrade to Premium for full access</span>
            </Link>
          </div>
        ) : followUpLimitReached ? (
          <div className="text-center space-y-3 py-2">
            <div className="flex items-center justify-center gap-2 text-amber-400">
              <Crown className="w-5 h-5" />
              <span className="font-medium text-sm">Follow-up limit reached</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Free users get {FREE_FOLLOWUP_LIMIT} follow-ups per solve. Upgrade for unlimited.
            </p>
            <Link to="/premium">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                Upgrade to Premium
              </button>
            </Link>
          </div>
        ) : (
          <>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Ask a follow-up question {!isPremium && `(${followUpCount}/${FREE_FOLLOWUP_LIMIT})`}
            </h3>
            <div className="flex items-end gap-3">
              <Textarea
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                onKeyDown={handleFollowUpKeyDown}
                placeholder="Still confused? Ask me anything about this solution..."
                disabled={isAsking}
                className="
                  min-h-[50px] max-h-[120px] resize-none
                  bg-muted/50 border-none
                  placeholder:text-muted-foreground/50
                  focus-visible:ring-1 focus-visible:ring-primary/50
                  text-sm
                "
                rows={2}
              />
              <Button
                onClick={handleFollowUpSubmit}
                disabled={!followUpText.trim() || isAsking}
                variant="neon"
                size="icon"
                className="shrink-0"
              >
                {isAsking ? (
                  <AIBrainIcon size="sm" animate glowIntensity="strong" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to ask • Shift+Enter for new line
            </p>
          </>
        )}
      </motion.div>

    </motion.div>
  );
}
