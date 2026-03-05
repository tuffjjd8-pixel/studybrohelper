import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { motion, AnimatePresence } from "framer-motion";

export type DeepModeEffect = "fire" | "water" | "neon" | "glitch" | "sparkle" | "none";

interface DeepModeRevealProps {
  content: string;
  effect: DeepModeEffect;
  onComplete?: () => void;
}

// LaTeX-aware chunking: find safe split points that don't break math delimiters
function computeSafePoints(content: string): number[] {
  const points: number[] = [0];
  let i = 0;
  while (i < content.length) {
    // Skip $$ ... $$ blocks
    if (content[i] === "$" && content[i + 1] === "$") {
      const end = content.indexOf("$$", i + 2);
      i = end !== -1 ? end + 2 : content.length;
      points.push(i);
      continue;
    }
    // Skip \( ... \) blocks
    if (content[i] === "\\" && content[i + 1] === "(") {
      const end = content.indexOf("\\)", i + 2);
      i = end !== -1 ? end + 2 : content.length;
      points.push(i);
      continue;
    }
    // Skip $ ... $ inline blocks
    if (content[i] === "$" && i > 0 && content[i - 1] !== "\\") {
      const end = content.indexOf("$", i + 1);
      if (end !== -1) {
        i = end + 1;
        points.push(i);
        continue;
      }
    }
    i++;
    points.push(i);
  }
  return points;
}

// Frontend safety: fix sizing+escaped-paren combos (\bigl\( → \bigl( etc.)
function fixSizingParens(text: string): string {
  let result = text;
  const sizingCmds = ["\\biggl", "\\biggr", "\\Biggl", "\\Biggr", "\\bigl", "\\bigr", "\\Bigl", "\\Bigr", "\\left", "\\right", "\\big", "\\Big"];
  const mathFnCmds = ["\\sin", "\\cos", "\\tan", "\\log", "\\ln", "\\Gamma", "\\operatorname", "\\text"];
  for (const cmd of [...sizingCmds, ...mathFnCmds]) {
    while (result.includes(cmd + "\\(")) result = result.split(cmd + "\\(").join(cmd + "(");
    while (result.includes(cmd + "\\)")) result = result.split(cmd + "\\)").join(cmd + ")");
    while (result.includes(cmd + "\\!\\(")) result = result.split(cmd + "\\!\\(").join(cmd + "\\!(");
    while (result.includes(cmd + "\\!\\)")) result = result.split(cmd + "\\!\\)").join(cmd + "\\!)");
  }
  return result;
}

export function DeepModeReveal({ content, effect, onComplete }: DeepModeRevealProps) {
  const sanitizedContent = fixSizingParens(content);
  const [displayedContent, setDisplayedContent] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!sanitizedContent) return;

    const safePoints = computeSafePoints(sanitizedContent);
    let pointIndex = 0;
    let lastTime = 0;

    // Base speed: ~20ms per char, faster for punctuation, jitter
    const getDelay = (char: string): number => {
      const isPunctuation = /[.,;:!?]/.test(char);
      const isNewline = char === "\n";
      const base = isPunctuation ? 7 : isNewline ? 80 : 20;
      const jitter = (Math.random() - 0.5) * 6; // ±3ms
      return Math.max(5, base + jitter);
    };

    // Paragraph pause detection
    const isParagraphBreak = (idx: number): boolean => {
      return content[idx] === "\n" && content[idx + 1] === "\n";
    };

    const animate = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp;
      const elapsed = timestamp - lastTime;

    const currentChar = sanitizedContent[safePoints[pointIndex]] || "";
      const delay = isParagraphBreak(safePoints[pointIndex])
        ? 200
        : getDelay(currentChar);

      if (elapsed >= delay) {
        // Advance by one safe point (could be a whole LaTeX block)
        pointIndex = Math.min(pointIndex + 1, safePoints.length - 1);
        setDisplayedContent(sanitizedContent.slice(0, safePoints[pointIndex]));
        lastTime = timestamp;

        if (pointIndex >= safePoints.length - 1) {
          setIsComplete(true);
          onComplete?.();
          return;
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    setDisplayedContent("");
    setIsComplete(false);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [sanitizedContent, onComplete]);

  // Skip animation on click
  const handleSkip = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setDisplayedContent(sanitizedContent);
    setIsComplete(true);
    onComplete?.();
  }, [sanitizedContent, onComplete]);

  const effectClass = getEffectClass(effect);

  return (
    <div
      ref={containerRef}
      className={`deep-mode-reveal ${effectClass} ${isComplete ? "reveal-complete" : "reveal-active"}`}
      onClick={!isComplete ? handleSkip : undefined}
      style={{ cursor: isComplete ? "default" : "pointer" }}
    >
      <div className="prose prose-invert prose-sm max-w-none math-solution">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-xl font-bold text-foreground mb-3">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-semibold text-foreground mb-2 mt-4">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-medium text-foreground mb-2 mt-3">{children}</h3>
            ),
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

      {/* Typing cursor */}
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-0.5 h-5 bg-primary ml-0.5 align-middle"
        />
      )}

      {!isComplete && (
        <p className="text-xs text-muted-foreground mt-3 opacity-50">
          Tap to skip animation
        </p>
      )}
    </div>
  );
}

function getEffectClass(effect: DeepModeEffect): string {
  switch (effect) {
    case "fire":
      return "deep-effect-fire";
    case "water":
      return "deep-effect-water";
    case "neon":
      return "deep-effect-neon";
    case "glitch":
      return "deep-effect-glitch";
    case "sparkle":
      return "deep-effect-sparkle";
    default:
      return "";
  }
}
