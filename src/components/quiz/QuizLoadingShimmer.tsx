import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export function QuizLoadingShimmer() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Progress indicator shimmer */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Progress bar shimmer */}
      <Skeleton className="h-2 w-full rounded-full" />

      {/* Question Card shimmer */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        {/* Question text */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>

        {/* Options shimmer */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton 
              key={i} 
              className="h-14 w-full rounded-xl" 
              style={{ 
                animationDelay: `${i * 150}ms`,
                animationDuration: '1.5s'
              }}
            />
          ))}
        </div>
      </div>

      {/* Navigation buttons shimmer */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
      </div>

      {/* Loading message */}
      <p className="text-center text-sm text-muted-foreground animate-pulse">
        Generating your quiz questions...
      </p>
    </motion.div>
  );
}
