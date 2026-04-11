import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { motion } from "framer-motion";
import { BookOpen, Calculator, Beaker, Globe, Pencil, Copy, Share2, Check, Send, Sparkles, Crown, Lock, Image } from "lucide-react";
import { ShareCardModal } from "@/components/share/ShareCardModal";
import { AIBrainIcon } from "@/components/ui/AIBrainIcon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHumanize } from "@/hooks/useHumanize";
import { HumanizeStrengthSlider, type HumanizeStrength } from "@/components/solve/HumanizeStrengthSlider";
import { useNavigate } from "react-router-dom";
import { DeepModeReveal, type DeepModeTextColor } from "@/components/solve/DeepModeReveal";
import { preprocessMath } from "@/lib/mathPreprocess";
import { FinalAnswerHighlight } from "@/components/solve/FinalAnswerHighlight";

interface SolutionStepsProps {
  subject: string;
  question: string;
  solution: string;
  questionImage?: string;
  solveId?: string;
  onFollowUp?: () => void;
  isPremium?: boolean;
  isHistory?: boolean;
  followUpCount?: number;
  maxFollowUps?: number;
  isDeepMode?: boolean;
  deepTextColor?: DeepModeTextColor;
  isAuthenticated?: boolean;
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

export function SolutionSteps({ subject, question, solution, questionImage, solveId, onFollowUp, isPremium = false, isHistory = false, followUpCount = 0, maxFollowUps = 2, isDeepMode = false, deepTextColor = "gold", isAuthenticated = false }: SolutionStepsProps) {
  const [copied, setCopied] = useState(false);
  const [followUpText, setFollowUpText] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [followUpResponse, setFollowUpResponse] = useState<string | null>(null);
  const [displayedSolution, setDisplayedSolution] = useState(solution);
  const [localFollowUpCount, setLocalFollowUpCount] = useState(followUpCount);
  const [humanizeStrength, setHumanizeStrength] = useState<HumanizeStrength>("auto");
  const { humanize, isHumanizing, isHumanized, limitReached, reset: resetHumanize } = useHumanize({ isPremium, isAuthenticated });
  const [humanizeUsed, setHumanizeUsed] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const solutionCaptureRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const followUpLimitReached = !isPremium && localFollowUpCount >= maxFollowUps;
  const showFollowUp = !isHistory;

  // Build deep link for this solve
  const solveDeepLink = solveId
    ? `${window.location.origin}/solve/${solveId}`
    : window.location.origin;

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
    if (!solveId) {
      toast.error("Please sign in to use AI features.");
      return;
    }
    if (followUpLimitReached) {
      toast.error("Follow-up limit reached. Upgrade to Pro for unlimited!");
      return;
    }

    setIsAsking(true);
    try {
      const { getAnswerLanguage } = await import("@/hooks/useAnswerLanguage");
      const answerLanguage = await getAnswerLanguage(undefined);
      const { data, error } = await supabase.functions.invoke("follow-up-chat", {
        body: {
          solveId,
          message: followUpText.trim(),
          context: { subject, question, solution },
          history: followUpResponse ? [{ role: "assistant", content: followUpResponse }] : [],
          answerLanguage,
        },
      });

      if (error) throw error;

      setFollowUpResponse(data.response);
      setFollowUpText("");
      setLocalFollowUpCount(prev => prev + 1);
      toast.success("Got your answer!");
    } catch (error) {
      console.error("Follow-up error:", error);
      toast.error("Failed to get answer. Try again.");
    } finally {
      setIsAsking(false);
    }
  };

  const handleHumanize = async () => {
    if (!isPremium) {
      toast("Humanize is a Premium feature", {
        description: "Upgrade to Pro to humanize your answers.",
        action: { label: "Upgrade", onClick: () => navigate("/premium") },
      });
      return;
    }
    if (humanizeUsed) {
      toast.info("Humanize can only be used once per answer.");
      return;
    }
    const result = await humanize(displayedSolution, subject, humanizeStrength);
    if (result) {
      setDisplayedSolution(result);
      setHumanizeUsed(true);
      toast.success("Answer humanized! ✨");
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

      {/* ===== CAPTURE AREA — everything the share screenshot includes ===== */}
      <div ref={solutionCaptureRef} className="space-y-4 share-capture-area">
        {/* Final Answer highlight */}
        <FinalAnswerHighlight solution={solution} />

        {/* Question */}
        <div className="glass-card p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Question
          </h3>
          {questionImage && (
            <img src={questionImage} alt="Question" className="max-h-48 rounded-lg mb-3 object-contain" />
          )}
          <p className="text-foreground">{question}</p>
        </div>

        {/* Solution */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="glass-card p-6 neon-border"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-medium text-primary uppercase tracking-wider">Solution</h3>
            <div className="flex items-center gap-2" data-hide-share>
              <Button variant="ghost" size="sm" onClick={handleCopy} className="text-muted-foreground hover:text-foreground">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleShare} className="text-muted-foreground hover:text-foreground">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {isDeepMode ? (
            <div className={`deep-text-${deepTextColor}`}>
              {isHistory ? (
                <div className="prose prose-invert prose-sm max-w-none math-solution">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      h1: ({ children }) => <h1 className="text-xl font-bold mb-3 inherit-color">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-4 inherit-color">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-medium mb-2 mt-3 inherit-color">{children}</h3>,
                      p: ({ children }) => <p className="mb-3 leading-relaxed inherit-color">{children}</p>,
                      strong: ({ children }) => <strong className="font-bold inherit-color">{children}</strong>,
                      em: ({ children }) => <em className="italic inherit-color">{children}</em>,
                      code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono inherit-color">{children}</code>,
                    }}
                  >
                    {preprocessMath(displayedSolution)}
                  </ReactMarkdown>
                </div>
              ) : (
                <DeepModeReveal content={displayedSolution} textColor={deepTextColor} />
              )}
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none math-solution">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
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
                  code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-primary text-sm font-mono">{children}</code>,
                  pre: ({ children }) => <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-3">{children}</pre>,
                  table: ({ children }) => <div className="overflow-x-auto my-4"><table className="min-w-full border border-border rounded-lg">{children}</table></div>,
                  thead: ({ children }) => <thead className="bg-primary/10">{children}</thead>,
                  th: ({ children }) => <th className="px-4 py-2 text-left font-semibold text-foreground border-b border-border">{children}</th>,
                  td: ({ children }) => <td className="px-4 py-2 text-foreground/90 border-b border-border/50">{children}</td>,
                }}
              >
                {preprocessMath(displayedSolution)}
              </ReactMarkdown>
            </div>
          )}

          {/* Humanize section — fully inside capture area */}
          {!isHistory || isPremium ? (
            <div className="mt-4 pt-4 border-t border-border/50 space-y-3 humanize-section">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  {isHumanized || humanizeUsed ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary bg-secondary/10 px-3 py-1.5 rounded-full">
                      <Sparkles className="w-3 h-3" />
                      Humanized ✨
                    </span>
                  ) : (
                    <>
                      {/* Real button - hidden in share mode */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleHumanize}
                        disabled={isHumanizing}
                        className="gap-2"
                        data-hide-share
                      >
                        {isHumanizing ? (
                          <AIBrainIcon size="sm" animate glowIntensity="strong" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        {isHumanizing ? "Humanizing..." : !isPremium ? (
                          <span className="flex items-center gap-1">
                            Humanize <Crown className="w-3 h-3 text-amber-400" />
                          </span>
                        ) : "Humanize"}
                      </Button>
                      {/* Share-mode-only label */}
                      <span className="share-humanize-label inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                        <Sparkles className="w-3 h-3" />
                        Humanize available
                      </span>
                    </>
                  )}
                </div>
                {!isHumanized && !humanizeUsed && (
                  <div data-hide-share>
                    <HumanizeStrengthSlider
                      value={humanizeStrength}
                      onChange={setHumanizeStrength}
                      isPremium={isPremium}
                      onUpgradeClick={() => navigate("/premium")}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </motion.div>

        {/* Follow-up response — inside capture area */}
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
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  p: ({ children }) => <p className="text-foreground/90 mb-3 leading-relaxed">{children}</p>,
                  strong: ({ children }) => <strong className="font-bold text-secondary">{children}</strong>,
                }}
              >
                {preprocessMath(followUpResponse)}
              </ReactMarkdown>
            </div>
          </motion.div>
        )}

        {/* Follow-up placeholder — only shown in share mode via CSS */}
        {showFollowUp && (
          <div className="share-followup-placeholder">
            <div className="glass-card p-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Ask a follow-up question
              </h3>
              <div className="h-10 rounded-lg bg-muted/30 border border-border/30" />
            </div>
          </div>
        )}

        {/* Bottom padding for capture */}
        <div className="h-2" />
      </div>
      {/* ===== END CAPTURE AREA ===== */}

      {/* Share CTA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-3"
      >
        <Button
          onClick={() => setShowShareCard(true)}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
          size="lg"
        >
          <Image className="w-4 h-4" />
          Share Result
        </Button>
        <span className="text-xs text-muted-foreground">Show this to a friend ✨</span>
      </motion.div>

      <ShareCardModal
        open={showShareCard}
        onClose={() => setShowShareCard(false)}
        captureRef={solutionCaptureRef}
        deepLink={solveDeepLink}
      />

      {/* Inline follow-up input (real, interactive — outside capture area) */}
      {showFollowUp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4"
        >
          {followUpLimitReached ? (
            <div className="text-center py-4">
              <Lock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Follow-up limit reached</p>
              <p className="text-xs text-muted-foreground mb-3">
                Free users get {maxFollowUps} follow-ups per solve.
              </p>
              <span className="text-xs text-primary flex items-center justify-center gap-1">
                <Crown className="w-3 h-3" />
                Upgrade to Pro for unlimited follow-ups
              </span>
            </div>
          ) : (
            <>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Ask a follow-up question
                {!isPremium && (
                  <span className="ml-2 text-primary">({localFollowUpCount}/{maxFollowUps})</span>
                )}
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
      )}
    </motion.div>
  );
}
