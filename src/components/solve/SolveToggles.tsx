import { motion } from "framer-motion";
import { Sparkles, Crown, Clock, Mic, Volume2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface SolveTogglesProps {
  animatedSteps: boolean;
  onAnimatedStepsChange: (value: boolean) => void;
  isPremium: boolean;
  animatedStepsUsed: number;
  maxAnimatedSteps: number;
  voiceInput?: boolean;
  onVoiceInputChange?: (value: boolean) => void;
  ttsUsed?: number;
  maxTts?: number;
}

export function SolveToggles({
  animatedSteps,
  onAnimatedStepsChange,
  isPremium,
  animatedStepsUsed,
  maxAnimatedSteps,
  voiceInput = false,
  onVoiceInputChange,
  ttsUsed = 0,
  maxTts = 5,
}: SolveTogglesProps) {
  const animatedStepsRemaining = maxAnimatedSteps - animatedStepsUsed;
  const canAnimateSteps = animatedStepsRemaining > 0;
  const usagePercent = (animatedStepsUsed / maxAnimatedSteps) * 100;

  const ttsRemaining = isPremium ? Infinity : maxTts - ttsUsed;
  const canUseTts = isPremium || ttsRemaining > 0;
  const ttsUsagePercent = isPremium ? 0 : (ttsUsed / maxTts) * 100;

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
                    Daily limit reached
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

        {/* Voice Input Toggle */}
        {onVoiceInputChange && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${voiceInput ? "bg-primary/10" : "bg-muted"}`}>
                <Mic className={`w-4 h-4 ${voiceInput ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <Label 
                  htmlFor="voice-input" 
                  className="text-sm font-medium cursor-pointer"
                >
                  Voice Input
                </Label>
                <p className="text-xs text-muted-foreground">
                  Speak your questions
                </p>
              </div>
            </div>
            <Switch
              id="voice-input"
              checked={voiceInput}
              onCheckedChange={onVoiceInputChange}
            />
          </div>
        )}

        {/* Text-to-Speech Usage (for free users) */}
        {!isPremium && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${canUseTts ? "bg-primary/10" : "bg-muted"}`}>
                <Volume2 className={`w-4 h-4 ${canUseTts ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <Label className="text-sm font-medium">
                  Text-to-Speech
                </Label>
                <p className="text-xs text-muted-foreground">
                  {canUseTts ? (
                    <span>{ttsUsed}/{maxTts} used today</span>
                  ) : (
                    <span className="flex items-center gap-1 text-orange-400">
                      <Clock className="w-3 h-3" />
                      Daily limit reached
                    </span>
                  )}
                </p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{ttsRemaining} left</span>
          </div>
        )}

        {/* Usage Progress Bar */}
        <div className="space-y-1">
          <Progress value={usagePercent} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {animatedStepsRemaining} remaining today • Resets at midnight
          </p>
        </div>
        
        {/* Limit message for animated steps */}
        {!canAnimateSteps && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            You've used all {maxAnimatedSteps} animated step{maxAnimatedSteps > 1 ? 's' : ''} for today. 
            Solving still works — you'll just see the static solution instead of the animation.
          </div>
        )}

        {/* Upgrade hint for free users */}
        {!isPremium && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              <Crown className="w-3 h-3 inline mr-1" />
              Upgrade to Pro for 16 animated steps/day + unlimited TTS
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
