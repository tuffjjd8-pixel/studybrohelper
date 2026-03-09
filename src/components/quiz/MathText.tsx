import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { preprocessMath } from "@/lib/mathPreprocess";

interface MathTextProps {
  children: string;
  className?: string;
}

/**
 * Renders text with inline LaTeX math support.
 * Handles \(...\), $...$, \[...\], $$...$$ delimiters.
 */
export function MathText({ children, className }: MathTextProps) {
  if (!children) return null;
  
  return (
    <span className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Render everything inline - no wrapping <p> tags
          p: ({ children: c }) => <span>{c}</span>,
        }}
      >
        {preprocessMath(children)}
      </ReactMarkdown>
    </span>
  );
}
