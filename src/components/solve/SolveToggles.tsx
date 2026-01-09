import { motion } from "framer-motion";
import { Sparkles, Crown, Clock, Mic, Lock, Globe } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WHISPER_LANGUAGES, WhisperLanguageCode } from "@/lib/whisperLanguages";

interface SolveTogglesProps {
  animatedSteps: boolean;
  onAnimatedStepsChange: (value: boolean) => void;
  isPremium: boolean;
  animatedStepsUsed: number;
  maxAnimatedSteps: number;
  speechInput?: boolean;
  onSpeechInputChange?: (value: boolean) => void;
  speechLanguage?: WhisperLanguageCode;
  onSpeechLanguageChange?: (value: WhisperLanguageCode) => void;
}

export function SolveToggles({
  animatedSteps,
  onAnimatedStepsChange,
  isPremium,
  animatedStepsUsed,
  maxAnimatedSteps,
  speechInput = false,
  onSpeechInputChange,
  speechLanguage = "auto",
  onSpeechLanguageChange,
}: SolveTogglesProps) {
  const animatedStepsRemaining = maxAnimatedSteps - animatedStepsUsed;
  const canAnimateSteps = animatedStepsRemaining > 0;
  const usagePercent = (animatedStepsUsed / maxAnimatedSteps) * 100;

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

        {/* Speech Input Toggle - Premium Only */}
        {onSpeechInputChange && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isPremium && speechInput ? "bg-primary/10" : "bg-muted"}`}>
                  {isPremium ? (
                    <Mic className={`w-4 h-4 ${speechInput ? "text-primary" : "text-muted-foreground"}`} />
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <Label 
                    htmlFor="speech-input" 
                    className={`text-sm font-medium cursor-pointer ${!isPremium && "text-muted-foreground"}`}
                  >
                    Speech Input
                    {!isPremium && (
                      <span className="ml-2 text-xs text-primary">Pro</span>
                    )}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isPremium ? (
                      "Multilingual voice transcription"
                    ) : (
                      <span className="flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        Premium feature
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Switch
                id="speech-input"
                checked={speechInput && isPremium}
                onCheckedChange={onSpeechInputChange}
                disabled={!isPremium}
              />
            </div>

            {/* Language Dropdown - Only show when speech is enabled */}
            {isPremium && speechInput && onSpeechLanguageChange && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="ml-11 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">Speech Language</Label>
                </div>
                <Select
                  value={speechLanguage}
                  onValueChange={(value) => onSpeechLanguageChange(value as WhisperLanguageCode)}
                >
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {WHISPER_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <span className="flex items-center gap-2">
                          <span>{lang.name}</span>
                          {lang.nativeName !== lang.name && (
                            <span className="text-muted-foreground text-xs">({lang.nativeName})</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}
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
              Upgrade to Pro for 16 animated steps/day + multilingual speech input
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
