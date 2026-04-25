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
import { extractVisualFromText, stripVisualBlock } from "@/lib/solveVisual";
import { SolutionVisual } from "@/components/solve/SolutionVisual";

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
 * Priority:
 *   1. Explicit "Final Answer: ..." / "**Final Answer:** ..." line (Deep + Instant Mode)
 *   2. First line before Setup/Solve/Result/Quick Check if it looks like a final answer
 *   3. \boxed{...}
 *   4. Last valid display-math block in tail
 *   5. "Answer is ..." plain-text patterns
 *   6. Trailing "= 42" numeric result
 */
function extractFinalAnswer(solution: string): string | null {
  const normalized = solution.replace(/\r\n?/g, "\n");

  // Skip multi-part questions ONLY when there's no explicit Final Answer line.
  // Numbered steps inside a single solution (e.g. "1. \(2+3=10\)") must NOT trigger this.
  const hasExplicitFinal = /(?:^|\n)\s*(?:\*\*)?\s*Final\s*Answer\s*:/i.test(normalized);
  if (!hasExplicitFinal) {
    const partIndicators = (normalized.match(/^\s*#{1,3}\s*(?:Part|Question|Problem)\s*\d/gim) || []).length;
    if (partIndicators >= 2) return null;
  }

  const cleanCandidate = (value: string): string | null => {
    const raw = value.trim().replace(/^\*+|\*+$/g, "").trim();
    if (!raw || raw.length >= 300) return null;
    if (raw.includes("\\")) return bracesBalanced(raw) ? raw : null;
    return bracesBalanced(raw) ? raw : null;
  };

  // 1. PRIMARY: explicit "Final Answer:" line (handles **, spaces, blank lines, colon optional)
  const explicitMatch = normalized.match(/(?:^|\n)\s*(?:\*\*)?\s*Final\s*Answer\s*:?\s*\**\s*([^\n*]+?)(?:\*\*)?\s*(?=\n|$)/i);
  if (explicitMatch?.[1]) {
    const cleaned = cleanCandidate(explicitMatch[1]);
    if (cleaned) return cleaned;
  }

  // 1b. Plain "Answer: X" line
  const answerMatch = normalized.match(/(?:^|\n)\s*(?:\*\*)?\s*Answer\s*:?\s*\**\s*([^\n*]+?)(?:\*\*)?\s*(?=\n|$)/i);
  if (answerMatch?.[1]) {
    const cleaned = cleanCandidate(answerMatch[1]);
    if (cleaned) return cleaned;
  }

  // 1c. Result section — grab the strongest equation (e.g. "9 + 5 = 126") or final number
  const resultSectionMatch = normalized.match(/(?:^|\n)\s*(?:\*\*)?\s*Result\s*:?\s*\**\s*([\s\S]*?)(?=\n\s*(?:\*\*)?\s*(?:Quick Check|Setup|Solve|Final Answer)\b|$)/i);
  if (resultSectionMatch?.[1]) {
    const block = resultSectionMatch[1];
    // Prefer "= X" pattern
    const eqMatches = [...block.matchAll(/=\s*([0-9][0-9.,/\-\s]*)/g)];
    if (eqMatches.length > 0) {
      const last = eqMatches[eqMatches.length - 1][1].trim().replace(/[.,]$/, "");
      if (last && last.length < 50) return last;
    }
    // "the answer X" pattern
    const ansWord = block.match(/answer\s+(?:is\s+)?([0-9][0-9.,/\-\s]*)/i);
    if (ansWord?.[1]) {
      const v = ansWord[1].trim().replace(/[.,]$/, "");
      if (v) return v;
    }
  }

  // 2. Fallback: first meaningful line before Setup/Solve/Result/Quick Check
  const firstSectionIndex = normalized.search(/^\s*(?:\*\*)?(?:Setup|Solve|Result|Quick Check)(?:\*\*)?\s*:?.*$/im);
  const head = firstSectionIndex >= 0 ? normalized.slice(0, firstSectionIndex) : normalized.slice(0, 160);
  const headLines = head
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (headLines.length > 0) {
    const firstLine = headLines[headLines.length - 1]
      .replace(/^(?:\*\*)?Final Answer:?\s*/i, "")
      .replace(/^\*+|\*+$/g, "")
      .trim();
    if (firstLine && !/^(?:Setup|Solve|Result|Quick Check)\b/i.test(firstLine)) {
      const cleaned = cleanCandidate(firstLine);
      if (cleaned) return cleaned;
    }
  }

  // 3. Prefer \boxed{...} — extract with brace matching
  const boxedIdx = normalized.lastIndexOf('\\boxed{');
  if (boxedIdx !== -1) {
    let depth = 0;
    const start = boxedIdx + 7;
    for (let i = start; i < normalized.length; i++) {
      if (normalized[i] === '{') depth++;
      else if (normalized[i] === '}') {
        if (depth === 0) {
          const inner = normalized.slice(start, i).trim();
          if (inner.length > 0 && inner.length < 500 && isValidLatex(inner)) {
            return `$$${inner}$$`;
          }
          break;
        }
        depth--;
      }
    }
  }

  // 4. Find the last display-math block near the end (last 40% of text)
  const searchStart = Math.floor(normalized.length * 0.6);
  const tail = normalized.slice(searchStart);
  const displayBlocks = [...tail.matchAll(/\\\[([\s\S]*?)\\\]/g)];
  const dollarBlocks = [...tail.matchAll(/\$\$([\s\S]*?)\$\$/g)];
  const allBlocks = [
    ...displayBlocks.map((m) => ({ content: m[1].trim() })),
    ...dollarBlocks.map((m) => ({ content: m[1].trim() })),
  ];
  for (let i = allBlocks.length - 1; i >= 0; i--) {
    const block = allBlocks[i];
    if (block.content.length > 0 && block.content.length < 500 && isValidLatex(block.content)) {
      return `$$${block.content}$$`;
    }
  }

  // 5. Plain-text "the answer is …" / "**Answer:**" patterns
  const textPatterns = [
    /\*{0,2}\s*the\s*answer\s*is\s*\*{0,2}\s*[:\-]?\s*\*{0,2}([^\n]+?)\*{0,2}\s*$/im,
    /\*\*Answer:\*\*\s*([^\n]+?)\s*$/im,
  ];
  for (const pattern of textPatterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      const cleaned = cleanCandidate(match[1]);
      if (cleaned) return cleaned;
    }
  }

  // 6. Simple numeric/short result at end: "= 42" or "= 100"
  const simpleResult = normalized.match(/=\s*([0-9][0-9,.\s]*)\s*$/m);
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
  isExplainMode?: boolean;
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

export function SolutionSteps({ subject, question, solution, questionImage, solveId, onFollowUp, isPremium = false, isHistory = false, followUpCount = 0, maxFollowUps = 2, isDeepMode = false, isExplainMode = false, isAuthenticated = false }: SolutionStepsProps) {
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

  // Extract optional graph/table visual from solution text
  const visual = useMemo(() => extractVisualFromText(displayedSolution), [displayedSolution]);
  // Solution text with the <visual> JSON block removed (used for all rendering/extraction)
  const cleanSolution = useMemo(() => stripVisualBlock(displayedSolution), [displayedSolution]);

  const finalAnswer = useMemo(() => extractFinalAnswer(cleanSolution), [cleanSolution]);
  // When the final answer is surfaced at the top, strip ANY "Final Answer:" / "Answer:" lines
  // from the body to avoid duplication (leading, trailing, or standalone).
  const bodySolution = useMemo(() => {
    let s = cleanSolution;
    // Strip ALL "Final Answer: ..." lines anywhere in the body (handles bold, leading spaces).
    s = s.replace(/^[ \t]*(?:\*\*)?\s*Final\s*Answer\s*:?\s*\**\s*[^\n]*\n?/gim, "");
    // Strip the Explain-mode upsell line — we render it as a separate CTA.
    s = s.replace(/^\s*Want a full breakdown \+ verification\??\s*$/gim, "");
    // Strip stray leading blank lines
    s = s.replace(/^\s+/, "");
    if (!isDeepMode) {
      s = s.replace(/^[ \t]*\**[ \t]*Answer[ \t]*\**[ \t]*[:\-][^\n]*$\n?/gim, "");
    }
    s = s.replace(/\n{3,}/g, "\n\n").trim();

    // INSTANT MODE: remove body if it's just a duplicate of the final answer
    if (!isDeepMode && !isExplainMode && finalAnswer) {
      const fa = finalAnswer.trim();
      const faEscaped = fa.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const dupPattern = new RegExp(
        `^\\s*[*_$]*\\s*(?:answer\\s*[:=]\\s*|=\\s*)?[*_$\\\\()\\[\\]{}]*\\s*${faEscaped}\\s*[*_$\\\\()\\[\\]{}]*\\s*\\.?\\s*$`,
        "i",
      );
      if (dupPattern.test(s)) {
        s = "";
      } else if (s.trim() === fa) {
        s = "";
      }
    }

    return s;
  }, [cleanSolution, finalAnswer, isDeepMode, isExplainMode]);
  const followUpLimitReached = !isPremium && localFollowUpCount >= maxFollowUps;
  const showFollowUp = !isHistory;

  // Always use the public production URL for shared solves
  const solveDeepLink = getPublicSolveUrl(solveId);

  const handleCopy = async () => {
    // Build copy text: ensure "Final Answer: X" label is present at the top
    let copyText = solution;
    if (finalAnswer) {
      const plainAnswer = finalAnswer.replace(/\$\$/g, "").replace(/\\\[|\\\]/g, "").trim();
      const hasLabel = /(?:^|\n)\s*(?:\*\*)?\s*Final\s*Answer\s*:/i.test(solution);
      if (!hasLabel) {
        copyText = `Final Answer: ${plainAnswer}\n\n${solution}`;
      }
    }
    await navigator.clipboard.writeText(copyText);
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
        {(() => {
          const hasImage = !!questionImage;
          const isPlaceholder = !question || /^image[- ]based question$/i.test(question.trim());
          const showText = !!question && !(hasImage && isPlaceholder);
          if (!hasImage && !showText) return null;
          return (
            <div className="glass-card p-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Question
              </h3>
              {hasImage && (
                <button
                  type="button"
                  onClick={() => setImageOpen(true)}
                  className="group relative inline-block mb-3 rounded-lg overflow-hidden border border-white/10 hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 p-1.5"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(var(--muted) / 0.5), hsl(var(--muted) / 0.25)), repeating-conic-gradient(hsl(var(--foreground) / 0.04) 0% 25%, transparent 0% 50%) 50% / 12px 12px",
                    boxShadow: "0 2px 10px hsl(0 0% 0% / 0.25), inset 0 0 0 1px hsl(var(--foreground) / 0.04)",
                  }}
                  aria-label="View question image full screen"
                >
                  <img
                    src={questionImage}
                    alt="Question"
                    loading="lazy"
                    decoding="async"
                    className="block max-h-[110px] w-auto object-contain rounded-md"
                  />
                  <span className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full bg-background/70 backdrop-blur-sm text-foreground/80 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </span>
                </button>
              )}
              {showText && <p className="text-foreground">{question}</p>}
            </div>
          );
        })()}

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

          {/* Optional AI-returned visual (graph or table) */}
          {visual && (
            <div className="mt-4">
              <SolutionVisual visual={visual} />
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

      {/* Full-screen image lightbox */}
      {questionImage && (
        <Dialog open={imageOpen} onOpenChange={setImageOpen}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto p-2 bg-background/95 backdrop-blur-sm border-border">
            <div className="flex items-center justify-center w-full h-full overflow-auto">
              <img
                src={questionImage}
                alt="Question (full view)"
                className="max-w-full max-h-[88vh] object-contain rounded-md touch-pinch-zoom"
                style={{ touchAction: "pinch-zoom" }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </motion.div>
  );
}
