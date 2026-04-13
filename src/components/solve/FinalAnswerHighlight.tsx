import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface FinalAnswerHighlightProps {
  solution: string;
}

/**
 * Extracts and displays the final answer prominently.
 * Looks for patterns like "Final Answer: ...", "The answer is ...", "**Answer:**", boxed answers, etc.
 */
export function FinalAnswerHighlight({ solution }: FinalAnswerHighlightProps) {
  const finalAnswer = extractFinalAnswer(solution);
  if (!finalAnswer) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: "hsl(var(--primary) / 0.5)",
        background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03))",
        boxShadow: "0 0 30px hsl(var(--primary) / 0.15)",
      }}
    >
      <div className="px-4 py-4">
        <p className="text-lg md:text-xl font-bold text-primary leading-relaxed">
          {finalAnswer}
        </p>
      </div>
    </motion.div>
  );
}

function extractFinalAnswer(solution: string): string | null {
  // Try common patterns
  const patterns = [
    /(?:final\s*answer|the\s*answer\s*is)[:\s]*\*{0,2}(.+?)(?:\*{0,2})(?:\n|$)/i,
    /\\boxed\{(.+?)\}/,
    /\*\*Answer:\*\*\s*(.+?)(?:\n|$)/i,
    /(?:therefore|thus|hence|so)[,:]?\s*(?:the\s*(?:answer|result|solution)\s*is\s*)?(.+?)(?:\.|$)/im,
    /=\s*\*{0,2}(.+?)\*{0,2}\s*$/m,
  ];

  for (const pattern of patterns) {
    const match = solution.match(pattern);
    if (match?.[1]) {
      const answer = match[1].trim().replace(/\*{1,2}/g, "").replace(/\\$/,"").trim();
      if (answer.length > 0 && answer.length < 200) {
        return answer;
      }
    }
  }
  return null;
}
