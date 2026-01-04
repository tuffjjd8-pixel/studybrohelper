import { motion } from "framer-motion";
import { Sparkles, LineChart, Crown, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface SolveTogglesProps {
  animatedSteps: boolean;
  generateGraph: boolean;
  onAnimatedStepsChange: (value: boolean) => void;
  onGenerateGraphChange: (value: boolean) => void;
  isPremium: boolean;
  graphsUsed: number;
  maxGraphs: number;
  animatedStepsUsed: number;
  maxAnimatedSteps: number;
}

export function SolveToggles({
  animatedSteps,
  generateGraph,
  onAnimatedStepsChange,
  onGenerateGraphChange,
  isPremium,
  graphsUsed,
  maxGraphs,
  animatedStepsUsed,
  maxAnimatedSteps,
}: SolveTogglesProps) {
  const graphsRemaining = maxGraphs - graphsUsed;
  const canGenerateGraph = graphsRemaining > 0;
  
  const animatedStepsRemaining = maxAnimatedSteps - animatedStepsUsed;
  const canAnimateSteps = animatedStepsRemaining > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Solve Options
          </h4>
          {isPremium && (
            <div className="flex items-center gap-1 text-xs text-primary">
              <Crown className="w-3 h-3" />
              Pro
            </div>
          )}
        </div>

        {/* Animated Steps Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${canAnimateSteps ? "bg-primary/10" : "bg-muted"}`}>
              <Sparkles className={`w-4 h-4 ${canAnimateSteps ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div>
              <Label 
                htmlFor="animated-steps" 
                className={`text-sm font-medium cursor-pointer ${!canAnimateSteps && "text-muted-foreground"}`}
              >
                Animated Steps
              </Label>
              <p className="text-xs text-muted-foreground">
                {canAnimateSteps ? (
                  <span>{animatedStepsUsed}/{maxAnimatedSteps} used today</span>
                ) : (
                  <span className="flex items-center gap-1 text-orange-400">
                    <Clock className="w-3 h-3" />
                    Resets at midnight
                  </span>
                )}
              </p>
            </div>
          </div>
          <Switch
            id="animated-steps"
            checked={animatedSteps}
            onCheckedChange={onAnimatedStepsChange}
            disabled={!canAnimateSteps}
          />
        </div>

        {/* Generate Graph Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${canGenerateGraph ? "bg-secondary/10" : "bg-muted"}`}>
              <LineChart className={`w-4 h-4 ${canGenerateGraph ? "text-secondary" : "text-muted-foreground"}`} />
            </div>
            <div>
              <Label 
                htmlFor="generate-graph" 
                className={`text-sm font-medium cursor-pointer ${!canGenerateGraph && "text-muted-foreground"}`}
              >
                Generate Graph
              </Label>
              <p className="text-xs text-muted-foreground">
                {canGenerateGraph ? (
                  <span>{graphsRemaining}/{maxGraphs} remaining today</span>
                ) : (
                  <span className="flex items-center gap-1 text-orange-400">
                    <Clock className="w-3 h-3" />
                    Resets at midnight
                  </span>
                )}
              </p>
            </div>
          </div>
          <Switch
            id="generate-graph"
            checked={generateGraph}
            onCheckedChange={onGenerateGraphChange}
            disabled={!canGenerateGraph}
          />
        </div>

        {/* Upgrade hint for free users */}
        {!isPremium && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              <Crown className="w-3 h-3 inline mr-1" />
              Upgrade to Pro for 16 animated steps & 15 graphs/day
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
