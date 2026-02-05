import { useMemo } from "react";
import "katex/dist/katex.min.css";
import katex from "katex";

interface MathRendererProps {
  content: string;
}

// Patterns that indicate LaTeX math content
const LATEX_COMMANDS = /\\(frac|sqrt|sum|int|prod|lim|sin|cos|tan|log|ln|exp|alpha|beta|gamma|delta|theta|phi|psi|omega|pi|sigma|lambda|mu|nu|rho|tau|epsilon|zeta|eta|iota|kappa|xi|omicron|upsilon|chi|cdot|times|div|pm|mp|leq|geq|neq|approx|equiv|subset|supset|cup|cap|infty|partial|nabla|hbar|vec|hat|bar|dot|ddot|tilde|overline|underline|overbrace|underbrace|left|right|big|Big|bigg|Bigg|text|mathrm|mathbf|mathit|mathsf|mathtt|mathbb|mathcal|binom|choose|over|atop)/;

// Check if content looks like a math expression
const isMathContent = (text: string): boolean => {
  // Contains LaTeX commands
  if (LATEX_COMMANDS.test(text)) return true;
  // Contains equation with = and variables/numbers
  if (/[a-zA-Z]\s*=/.test(text) || /=\s*[a-zA-Z]/.test(text)) return true;
  // Contains common math patterns like fractions, exponents
  if (/\^[\d{]/.test(text) || /_[\d{]/.test(text)) return true;
  // Simple equations like "0.5a = -0.6"
  if (/[\d.]+[a-zA-Z]\s*=/.test(text) || /=\s*[\d.]+[a-zA-Z]/.test(text)) return true;
  // Expressions with operators between variables
  if (/[a-zA-Z]\s*[+\-*/]\s*[a-zA-Z\d]/.test(text) && /=/.test(text)) return true;
  return false;
};

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

    // Handle math content wrapped in regular parentheses (common AI output format)
    // Match content in parentheses that looks like math equations
    processed = processed.replace(/\(([^()]+)\)/g, (match, inner) => {
      // Only convert if it looks like math content
      if (isMathContent(inner)) {
        return renderInlineMath(inner);
      }
      return match;
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
