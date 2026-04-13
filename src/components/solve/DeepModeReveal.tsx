import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { motion } from "framer-motion";
import { preprocessMath } from "@/lib/mathPreprocess";

interface DeepModeRevealProps {
  content: string;
  onComplete?: () => void;
}

// LaTeX-aware chunking: find safe split points that don't break math delimiters
function computeSafePoints(content: string): number[] {
  const points: number[] = [0];
  let i = 0;
  while (i < content.length) {
    if (content[i] === "$" && content[i + 1] === "$") {
      const end = content.indexOf("$$", i + 2);
      i = end !== -1 ? end + 2 : content.length;
      points.push(i);
      continue;
    }
    if (content[i] === "\\" && content[i + 1] === "(") {
      const end = content.indexOf("\\)", i + 2);
      i = end !== -1 ? end + 2 : content.length;
      points.push(i);
      continue;
    }
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

export function DeepModeReveal({ content, onComplete }: DeepModeRevealProps) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!content) return;

    const safePoints = computeSafePoints(content);
    let pointIndex = 0;
    const CHARS_PER_FRAME = 3;

    const animate = () => {
      pointIndex = Math.min(pointIndex + CHARS_PER_FRAME, safePoints.length - 1);
      setDisplayedContent(content.slice(0, safePoints[pointIndex]));

      if (pointIndex >= safePoints.length - 1) {
        setIsComplete(true);
        onComplete?.();
        return;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    setDisplayedContent("");
    setIsComplete(false);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const handleSkip = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setDisplayedContent(content);
    setIsComplete(true);
    onComplete?.();
  }, [content, onComplete]);

  return (
    <div
      ref={containerRef}
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
              <p className="text-foreground/80 mb-3 leading-relaxed">{children}</p>
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
          {preprocessMath(displayedContent)}
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
