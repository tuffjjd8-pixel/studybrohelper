import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { preprocessMath } from "@/lib/mathPreprocess";
import { DeepModeReveal } from "@/components/solve/DeepModeReveal";
import type { DeepTextColor } from "@/hooks/useDeepMode";

interface DeepModeSolutionProps {
  content: string;
  textColor: DeepTextColor;
  isHistory?: boolean;
}

export function DeepModeSolution({ content, textColor, isHistory = false }: DeepModeSolutionProps) {
  if (!isHistory) {
    return (
      <DeepModeReveal
        content={content}
        textColor={textColor}
      />
    );
  }

  // History view: static render with text color
  return (
    <div className={`prose prose-invert prose-sm max-w-none math-solution deep-text-${textColor}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => <h1 className="text-xl font-bold mb-3" style={{ color: "inherit" }}>{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-4" style={{ color: "inherit" }}>{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-medium mb-2 mt-3" style={{ color: "inherit" }}>{children}</h3>,
          p: ({ children }) => <p className="mb-3 leading-relaxed" style={{ color: "inherit", opacity: 0.9 }}>{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3" style={{ color: "inherit" }}>{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3" style={{ color: "inherit" }}>{children}</ol>,
          li: ({ children }) => <li style={{ color: "inherit" }}>{children}</li>,
          strong: ({ children }) => <strong className="font-bold" style={{ color: "inherit" }}>{children}</strong>,
          em: ({ children }) => <em className="italic" style={{ color: "inherit", opacity: 0.8 }}>{children}</em>,
          code: ({ children }) => (
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" style={{ color: "inherit" }}>
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
