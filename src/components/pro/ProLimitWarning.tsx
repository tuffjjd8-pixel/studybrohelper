import { useState } from "react";
import { AlertTriangle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface ProUsageItem {
  used: number;
  limit: number;
}

interface ProUsageSummary {
  instant_solves: ProUsageItem;
  deep_solves: ProUsageItem;
  humanize: ProUsageItem;
  followups: ProUsageItem;
  quizzes: ProUsageItem;
}

interface ProLimitWarningProps {
  proUsage: ProUsageSummary | null;
}

const FEATURE_LABELS: Record<string, string> = {
  instant_solves: "Instant Solves",
  deep_solves: "Deep Solves",
  humanize: "Humanize",
  followups: "Follow-Ups",
  quizzes: "Quizzes",
};

export function ProLimitWarning({ proUsage }: ProLimitWarningProps) {
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(true);

  if (!proUsage) return null;

  const warnings: { key: string; label: string; percent: number; used: number; limit: number }[] = [];

  for (const [key, label] of Object.entries(FEATURE_LABELS)) {
    const item = proUsage[key as keyof ProUsageSummary];
    if (!item) continue;
    const percent = (item.used / item.limit) * 100;
    if (percent >= 80) {
      warnings.push({ key, label, percent, used: item.used, limit: item.limit });
    }
  }

  if (warnings.length === 0) return null;

  // Check for any 100% features
  const maxedOut = warnings.filter((w) => w.percent >= 100);

  // Show modal for 100% limits
  if (maxedOut.length > 0 && showModal) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="w-full max-w-sm bg-card border border-destructive/50 rounded-2xl p-6 space-y-4"
          >
            <div className="flex justify-center">
              <XCircle className="w-12 h-12 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-center">Monthly Limit Reached</h2>
            <div className="space-y-2">
              {maxedOut.map((w) => (
                <div key={w.key} className="text-sm text-center text-muted-foreground">
                  <span className="font-medium text-foreground">{w.label}</span>: {w.used}/{w.limit} used
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Your limits will reset at the start of next month.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setShowModal(false)}>
              Dismiss
            </Button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Banners for 80%/90% warnings
  const banners = warnings.filter((w) => w.percent < 100 && !dismissedKeys.has(w.key));

  if (banners.length === 0) return null;

  return (
    <div className="space-y-2">
      {banners.map((w) => {
        const isOrange = w.percent >= 90;
        return (
          <motion.div
            key={w.key}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${
              isOrange
                ? "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400"
                : "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400"
            }`}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">
              {w.label}: {w.used}/{w.limit} used ({Math.round(w.percent)}%)
            </span>
            <button
              onClick={() => setDismissedKeys((prev) => new Set(prev).add(w.key))}
              className="text-xs opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
