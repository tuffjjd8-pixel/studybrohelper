import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import katex from "katex";
import "katex/dist/katex.min.css";
import { motion } from "framer-motion";
import { BookOpen, Calculator, Beaker, Globe, Pencil, Copy, Share2, Check, Send, Sparkles, Crown, Lock, X, ZoomIn } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AIBrainIcon } from "@/components/ui/AIBrainIcon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHumanize } from "@/hooks/useHumanize";
import { HumanizeStrengthSlider, type HumanizeStrength } from "@/components/solve/HumanizeStrengthSlider";
import { useNavigate } from "react-router-dom";
import { DeepModeReveal } from "@/components/solve/DeepModeReveal";
import { preprocessMath } from "@/lib/mathPreprocess";
import { getPublicSolveUrl } from "@/lib/publicAppUrl";

/**
 * Count occurrences of a character in a string.
 */
function countChar(s: string, ch: string): number {
  let c = 0;
  for (let i = 0; i < s.length; i++) if (s[i] === ch) c++;
  return c;
}

/**
 * Check if braces are balanced in a string.
 */
function bracesBalanced(s: string): boolean {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

/**
 * Validate that a LaTeX string is complete (balanced braces, no dangling delimiters).
 */
function isValidLatex(s: string): boolean {
  if (!bracesBalanced(s)) return false;
  // Check for unclosed \left without \right
  const lefts = (s.match(/\\left/g) || []).length;
  const rights = (s.match(/\\right/g) || []).length;
  if (lefts !== rights) return false;
  // Try rendering with KaTeX to catch any parse errors
  try {
    katex.renderToString(s, { throwOnError: true, displayMode: true });
  } catch {
    return false;
  }
  return true;
}

/**
 * Extract a complete, valid final answer from the solution text.
 * LaTeX-aware: prefers boxed answers, then final display-math blocks,
 * then text patterns. Returns null if no valid answer can be extracted.
 */
function extractFinalAnswer(solution: string): string | null {
  // Skip multi-part questions — they don't have a single final answer
  const partIndicators = (solution.match(/^\s*(?:\d+\.|#{1,3}\s*(?:Part|Question|Problem)\s*\d)/gm) || []).length;
  if (partIndicators >= 2) return null;

  // 1. Prefer \boxed{...} — extract with brace matching
  const boxedIdx = solution.lastIndexOf('\\boxed{');
  if (boxedIdx !== -1) {
    let depth = 0;
    let start = boxedIdx + 7; // after \boxed{
    for (let i = start; i < solution.length; i++) {
      if (solution[i] === '{') depth++;
      else if (solution[i] === '}') {
        if (depth === 0) {
          const inner = solution.slice(start, i).trim();
          if (inner.length > 0 && inner.length < 500 && isValidLatex(inner)) {
            return `$$${inner}$$`;
          }
          break;
        }
        depth--;
      }
    }
  }

  // 2. Find the last display-math block near the end (last 40% of text)
  const searchStart = Math.floor(solution.length * 0.6);
  const tail = solution.slice(searchStart);
  
  // Match \[ ... \] blocks
  const displayBlocks = [...tail.matchAll(/\\\[([\s\S]*?)\\\]/g)];
  // Match $$ ... $$ blocks
  const dollarBlocks = [...tail.matchAll(/\$\$([\s\S]*?)\$\$/g)];
  
  const allBlocks = [
    ...displayBlocks.map(m => ({ content: m[1].trim(), full: m[0] })),
    ...dollarBlocks.map(m => ({ content: m[1].trim(), full: m[0] })),
  ];
  
  // Take the last valid block
  for (let i = allBlocks.length - 1; i >= 0; i--) {
    const block = allBlocks[i];
    if (block.content.length > 0 && block.content.length < 500 && isValidLatex(block.content)) {
      return `$$${block.content}$$`;
    }
  }

  // 3. Plain-text patterns (non-math answers)
  const textPatterns = [
    /(?:final\s*answer|the\s*answer\s*is)[:\s]*\*{0,2}([^$\\*\n]+?)(?:\*{0,2})(?:\n|$)/i,
    /\*\*Answer:\*\*\s*([^$\\*\n]+?)(?:\n|$)/i,
  ];
  for (const pattern of textPatterns) {
    const match = solution.match(pattern);
    if (match?.[1]) {
      const answer = match[1].trim().replace(/\*{1,2}/g, "").trim();
      // Only use if it looks like a clean plain-text answer (no broken LaTeX)
      if (answer.length > 0 && answer.length < 200 && !answer.includes('\\') && bracesBalanced(answer)) {
        return answer;
      }
    }
  }

  // 4. Simple numeric/short result at end: "= 42" or "= 100"
  const simpleResult = solution.match(/=\s*([0-9][0-9,.\s]*)\s*$/m);
  if (simpleResult?.[1]) {
    const val = simpleResult[1].trim();
    if (val.length > 0 && val.length < 50) return val;
  }

  return null;
}

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

export function SolutionSteps({ subject, question, solution, questionImage, solveId, onFollowUp, isPremium = false, isHistory = false, followUpCount = 0, maxFollowUps = 2, isDeepMode = false, isAuthenticated = false }: SolutionStepsProps) {
  const [copied, setCopied] = useState(false);
  const [followUpText, setFollowUpText] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [followUpResponse, setFollowUpResponse] = useState<string | null>(null);
  const [displayedSolution, setDisplayedSolution] = useState(solution);
  const [localFollowUpCount, setLocalFollowUpCount] = useState(followUpCount);
  const [humanizeStrength, setHumanizeStrength] = useState<HumanizeStrength>("auto");
  const { humanize, isHumanizing, isHumanized, limitReached, reset: resetHumanize } = useHumanize({ isPremium, isAuthenticated });
  const [humanizeUsed, setHumanizeUsed] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const navigate = useNavigate();

  const finalAnswer = useMemo(() => extractFinalAnswer(displayedSolution), [displayedSolution]);
  // When the final answer is surfaced at the top, strip ANY "Final Answer:" / "Answer:" lines
  // from the body to avoid duplication (leading, trailing, or standalone).
  const bodySolution = useMemo(() => {
    if (!finalAnswer) return displayedSolution;
    let s = displayedSolution;
    // Instant Mode: strip ALL "Final Answer:" / "Answer:" lines (avoids duplication with top card).
    // Deep Mode: only strip the FIRST leading "Final Answer:" line so the structured body
    // (Setup/Solve/Result/Quick Check) stays intact.
    if (!isDeepMode) {
      s = s.replace(/^[ \t]*\**[ \t]*(?:Final\s*Answer|Answer)[ \t]*:[ \t]*[^\n]*\**[ \t]*$\n?/gim, "");
    } else {
      s = s.replace(/^[ \t]*\**[ \t]*Final\s*Answer[ \t]*:[ \t]*[^\n]*\**[ \t]*\n?/i, "");
    }
    s = s.replace(/\n{3,}/g, "\n\n");
    return s.trim();
  }, [displayedSolution, finalAnswer, isDeepMode]);
  const followUpLimitReached = !isPremium && localFollowUpCount >= maxFollowUps;
  const showFollowUp = !isHistory;

  // Always use the public production URL for shared solves
  const solveDeepLink = getPublicSolveUrl(solveId);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(solution);
    setCopied(true);
    toast.success("Solution copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    // Build a short share message with final answer if available
    const plainAnswer = finalAnswer
      ? finalAnswer.replace(/\$\$/g, '').replace(/\\\[|\\\]/g, '').trim()
      : null;
    const shareText = plainAnswer
      ? `Just solved this instantly with StudyBro 👀\n\n${plainAnswer}\n\nTry it:\n${solveDeepLink}`
      : `Just solved this instantly with StudyBro 👀\n\nTry it:\n${solveDeepLink}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Solved by StudyBro",
          text: shareText,
          url: solveDeepLink,
        });
        return;
      } catch (err: any) {
        // If user cancelled, do nothing
        if (err?.name === 'AbortError') return;
        // Otherwise fall through to clipboard
      }
    }
    
    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(solveDeepLink);
      setLinkCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Final fallback: use execCommand
      const textarea = document.createElement("textarea");
      textarea.value = solveDeepLink;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setLinkCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setLinkCopied(false), 2000);
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

      <div className="space-y-4">

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
          className="glass-card pt-3 pb-6 px-6 neon-border relative overflow-hidden"
        >
          {/* Subtle inner glow behind answer */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top center, hsl(var(--primary) / 0.06) 0%, transparent 60%)' }} />
          <div className="relative">
          <div className="flex items-center justify-end mb-2">
            <div className="hidden"><span>​</span></div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCopy} className="text-muted-foreground hover:text-foreground">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleShare} className="text-muted-foreground hover:text-foreground">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Final answer surfaced at top */}
          {finalAnswer && (
            <div
              className="mb-4 rounded-xl px-5 py-4 border border-primary/30"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03))',
                boxShadow: '0 0 24px hsl(var(--primary) / 0.12)',
              }}
            >
              <div className="text-lg md:text-xl font-bold text-primary leading-relaxed [&_.katex-display]:mb-0 [&_.katex-display]:mt-0">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    p: ({ children }) => <span className="block">{children}</span>,
                  }}
                >
                  {preprocessMath(finalAnswer)}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {isDeepMode && !isHistory ? (
            <DeepModeReveal content={bodySolution} />
          ) : bodySolution.trim().length === 0 ? null : (
            <div className="prose prose-invert prose-base max-w-none math-solution">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  h1: ({ children }) => <h1 className="text-xl font-bold text-foreground/90 mb-3">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-semibold text-foreground/90 mb-2 mt-4">{children}</h2>,
                  p: ({ children }) => <p className="text-[1.05rem] leading-relaxed text-foreground/80 mb-3">{children}</p>,
                  h3: ({ children }) => <h3 className="text-base font-medium text-foreground/90 mb-2 mt-3">{children}</h3>,
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-foreground/75">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-foreground/75">{children}</ol>,
                  li: ({ children }) => <li className="text-foreground/75">{children}</li>,
                  strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
                  em: ({ children }) => <em className="text-secondary italic">{children}</em>,
                  code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-primary text-sm font-mono">{children}</code>,
                  pre: ({ children }) => <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-3">{children}</pre>,
                  table: ({ children }) => <div className="overflow-x-auto my-4"><table className="min-w-full border border-border rounded-lg">{children}</table></div>,
                  thead: ({ children }) => <thead className="bg-primary/10">{children}</thead>,
                  th: ({ children }) => <th className="px-4 py-2 text-left font-semibold text-foreground/90 border-b border-border">{children}</th>,
                  td: ({ children }) => <td className="px-4 py-2 text-foreground/75 border-b border-border/50">{children}</td>,
                }}
              >
                {preprocessMath(bodySolution)}
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
                    </>
                  )}
                </div>
                {!isHumanized && !humanizeUsed && (
                  <div>
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
          </div>
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
                  p: ({ children }) => <p className="text-foreground/80 mb-3 leading-relaxed">{children}</p>,
                  strong: ({ children }) => <strong className="font-bold text-secondary">{children}</strong>,
                }}
              >
                {preprocessMath(followUpResponse)}
              </ReactMarkdown>
            </div>
          </motion.div>
        )}
      </div>

      {/* Share CTA — link-only */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-3"
      >
        <Button
          onClick={handleShare}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
          size="lg"
        >
          <Share2 className="w-4 h-4" />
          {linkCopied ? "Copied!" : "Share Result"}
        </Button>
        <span className="text-xs text-muted-foreground">Show this to a friend ✨</span>
      </motion.div>

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
