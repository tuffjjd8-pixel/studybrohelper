import { useMemo } from "react";
import "katex/dist/katex.min.css";
import katex from "katex";

interface MathRendererProps {
  content: string;
}

export function MathRenderer({ content }: MathRendererProps) {
  const renderedContent = useMemo(() => {
    // Process the content to render LaTeX math
    let processed = content;

    // Replace display math $$...$$ with rendered HTML
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      try {
        return `<div class="math-display my-4 overflow-x-auto">${katex.renderToString(math.trim(), {
          displayMode: true,
          throwOnError: false,
          trust: true,
        })}</div>`;
      } catch (e) {
        return `<code class="text-destructive">${math}</code>`;
      }
    });

    // Replace inline math $...$ with rendered HTML (but not escaped \$)
    processed = processed.replace(/(?<!\\)\$([^\$\n]+?)\$/g, (_, math) => {
      try {
        return katex.renderToString(math.trim(), {
          displayMode: false,
          throwOnError: false,
          trust: true,
        });
      } catch (e) {
        return `<code>${math}</code>`;
      }
    });

    // Handle \boxed{} specially for final answers
    processed = processed.replace(/\\boxed\{([^}]+)\}/g, (_, content) => {
      try {
        return `<div class="inline-block px-3 py-2 my-2 border-2 border-primary rounded-lg bg-primary/10">${katex.renderToString(content.trim(), {
          displayMode: false,
          throwOnError: false,
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
