import { useMemo } from "react";
import "katex/dist/katex.min.css";
import katex from "katex";

interface MathRendererProps {
  content: string;
}

export function MathRenderer({ content }: MathRendererProps) {
  const renderedContent = useMemo(() => {
    let processed = content;

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
