import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { preprocessMath } from "@/lib/mathPreprocess";

interface MathTextProps {
  children: string;
  className?: string;
  /** Render as inline-safe markup (no block elements). */
  inline?: boolean;
}

/**
 * Renders text with LaTeX math support.
 * Accepts \(...\), $...$, \[...\], $$...$$ and normalizes for remark-math.
 */
export function MathText({ children, className, inline = true }: MathTextProps) {
  if (!children) return null;

  const components = inline
    ? {
        // Force everything into inline-safe tags (Quiz options are inside buttons)
        p: ({ children: c }: { children: React.ReactNode }) => <span>{c}</span>,
        div: ({ children: c }: { children: React.ReactNode }) => <span>{c}</span>,
      }
    : undefined;

  return (
    <span className={className}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={components}>
        {preprocessMath(children)}
      </ReactMarkdown>
    </span>
  );
}
