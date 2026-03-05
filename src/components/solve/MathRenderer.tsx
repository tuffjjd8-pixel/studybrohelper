import { useMemo } from "react";
import "katex/dist/katex.min.css";
import katex from "katex";

interface MathRendererProps {
  content: string;
}

export function MathRenderer({ content }: MathRendererProps) {
  const renderedContent = useMemo(() => {
    // Frontend safety net: fix sizing+escaped-paren combos before rendering
    let processed = content;
    const sizingCmds = ["\\biggl", "\\biggr", "\\Biggl", "\\Biggr", "\\bigl", "\\bigr", "\\Bigl", "\\Bigr", "\\left", "\\right", "\\big", "\\Big"];
    const mathFnCmds = ["\\sin", "\\cos", "\\tan", "\\log", "\\ln", "\\Gamma", "\\operatorname", "\\text"];
    for (const cmd of [...sizingCmds, ...mathFnCmds]) {
      while (processed.includes(cmd + "\\(")) processed = processed.split(cmd + "\\(").join(cmd + "(");
      while (processed.includes(cmd + "\\)")) processed = processed.split(cmd + "\\)").join(cmd + ")");
      while (processed.includes(cmd + "\\!\\(")) processed = processed.split(cmd + "\\!\\(").join(cmd + "\\!(");
      while (processed.includes(cmd + "\\!\\)")) processed = processed.split(cmd + "\\!\\)").join(cmd + "\\!)");
    }

    // Helper function to render display math
    const renderDisplayMath = (math: string): string => {
      try {
        return `<div class="math-display my-4 overflow-x-auto">${katex.renderToString(math.trim(), {
          displayMode: true,
          throwOnError: false,
          trust: true,
          strict: false,
        })}</div>`;
      } catch (e) {
        return `<code class="text-destructive">${math}</code>`;
      }
    };

    // Helper function to render inline math
    const renderInlineMath = (math: string): string => {
      try {
        return katex.renderToString(math.trim(), {
          displayMode: false,
          throwOnError: false,
          trust: true,
          strict: false,
        });
      } catch (e) {
        return `<code>${math}</code>`;
      }
    };

    // Replace display math \[...\] with rendered HTML (must come before $$ to avoid conflicts)
    processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
      return renderDisplayMath(math);
    });

    // Replace display math $$...$$ with rendered HTML
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      return renderDisplayMath(math);
    });

    // Fallback: bare [ ... ] on its own line containing math-like content
    processed = processed.replace(/^\[\s*([\s\S]*?)\s*\]$/gm, (match, inner) => {
      if (/[\\{}^_=\d]/.test(inner)) {
        return renderDisplayMath(inner);
      }
      return match;
    });

    // Replace inline math $...$ with rendered HTML (but not escaped \$)
    processed = processed.replace(/(?<!\\)\$([^\$\n]+?)\$/g, (_, math) => {
      return renderInlineMath(math);
    });

    // Replace inline math \(...\) with rendered HTML
    processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
      return renderInlineMath(math);
    });

    // Handle \boxed{} specially for final answers
    processed = processed.replace(/\\boxed\{([^}]+)\}/g, (_, content) => {
      try {
        return `<div class="inline-block px-3 py-2 my-2 border-2 border-primary rounded-lg bg-primary/10">${katex.renderToString(content.trim(), {
          displayMode: false,
          throwOnError: false,
          trust: true,
          strict: false,
        })}</div>`;
      } catch (e) {
        return `<span class="px-2 py-1 border border-primary rounded">${content}</span>`;
      }
    });

    return processed;
  }, [content]);

  return (
    <div
      className="math-content"
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
}
