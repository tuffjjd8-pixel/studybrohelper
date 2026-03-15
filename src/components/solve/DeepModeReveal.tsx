import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { preprocessMath } from "@/lib/mathPreprocess";

export type DeepTextColor = "default" | "gold" | "sky" | "purple" | "rose" | "orange";

interface DeepModeRevealProps {
  content: string;
  textColor: DeepTextColor;
}

const textColorClass: Record<DeepTextColor, string> = {
  default: "",
  gold: "deep-text-gold",
  sky: "deep-text-sky",
  purple: "deep-text-purple",
  rose: "deep-text-rose",
  orange: "deep-text-orange",
};

export function DeepModeReveal({ content, textColor }: DeepModeRevealProps) {
  return (
    <div className={`prose prose-invert prose-sm max-w-none math-solution ${textColorClass[textColor] || ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => <h1 className="text-xl font-bold mb-3">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-4">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-medium mb-2 mt-3">{children}</h3>,
          p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
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
        {preprocessMath(content)}
      </ReactMarkdown>
    </div>
  );
}
