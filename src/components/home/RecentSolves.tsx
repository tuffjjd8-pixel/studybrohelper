import { motion } from "framer-motion";
import { BookOpen, Calculator, Beaker, Globe, Pencil } from "lucide-react";

interface RecentSolve {
  id: string;
  subject: string;
  question: string;
  createdAt: Date;
}

interface RecentSolvesProps {
  solves: RecentSolve[];
  onSelect?: (id: string) => void;
}

const subjectIcons: Record<string, React.ReactNode> = {
  math: <Calculator className="w-4 h-4" />,
  science: <Beaker className="w-4 h-4" />,
  history: <Globe className="w-4 h-4" />,
  english: <Pencil className="w-4 h-4" />,
  other: <BookOpen className="w-4 h-4" />,
};

const subjectColors: Record<string, string> = {
  math: "bg-primary/20 text-primary border-primary/30",
  science: "bg-secondary/20 text-secondary border-secondary/30",
  history: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  english: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  other: "bg-muted text-muted-foreground border-border",
};

export function RecentSolves({ solves, onSelect }: RecentSolvesProps) {
  if (solves.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-8"
      >
        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground text-sm">
          No solved problems yet. Snap your first homework!
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="w-full max-w-2xl mx-auto"
    >
      <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
        Recent Solves
      </h3>
      <div className="space-y-2">
        {solves.slice(0, 5).map((solve, index) => (
          <motion.button
            key={solve.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelect?.(solve.id)}
            className="
              w-full glass-card p-3 text-left
              hover:border-primary/40 transition-all duration-200
              group cursor-pointer
            "
          >
            <div className="flex items-start gap-3">
              <span className={`
                shrink-0 p-2 rounded-lg border
                ${subjectColors[solve.subject] || subjectColors.other}
              `}>
                {subjectIcons[solve.subject] || subjectIcons.other}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {solve.question}
                </p>
                <p className="text-xs text-muted-foreground mt-1 capitalize">
                  {solve.subject} • {formatTimeAgo(solve.createdAt)}
                </p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  return `${diffDays}d ago`;
}
