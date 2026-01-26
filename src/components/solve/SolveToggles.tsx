import { motion } from "framer-motion";
import { Crown, Clock, Mic, ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { AIBrainIcon } from "@/components/ui/AIBrainIcon";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WHISPER_LANGUAGES, getLanguageDisplayName } from "@/lib/whisperLanguages";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SolveTogglesProps {
  animatedSteps: boolean;
  onAnimatedStepsChange: (value: boolean) => void;
  isPremium: boolean;
  animatedStepsUsed: number;
  maxAnimatedSteps: number;
  speechInput?: boolean;
  onSpeechInputChange?: (value: boolean) => void;
  speechLanguage?: string;
  onSpeechLanguageChange?: (value: string) => void;
  isAuthenticated?: boolean; // Must be signed in for premium features
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
  isAuthenticated = false,
}: SolveTogglesProps) {
  const animatedStepsRemaining = maxAnimatedSteps - animatedStepsUsed;
  const canAnimateSteps = animatedStepsRemaining > 0;
  const usagePercent = (animatedStepsUsed / maxAnimatedSteps) * 100;
  
  // Premium features require authentication - CRITICAL: never show to unsigned users
  const canShowPremiumFeatures = isAuthenticated && isPremium;

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
              <AIBrainIcon size="sm" glowIntensity={canAnimateSteps ? "medium" : "subtle"} />
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

        {/* Speech Input Toggle - Premium Only AND Authenticated Only */}
        {canShowPremiumFeatures && onSpeechInputChange && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${speechInput ? "bg-primary/10" : "bg-muted"}`}>
                  <Mic className={`w-4 h-4 ${speechInput ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <Label 
                    htmlFor="speech-input" 
                    className="text-sm font-medium cursor-pointer"
                  >
                    Speech to Text
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Voice transcription (25/day)
                  </p>
                </div>
              </div>
              <Switch
                id="speech-input"
                checked={speechInput}
                onCheckedChange={onSpeechInputChange}
              />
            </div>

            {/* Language Dropdown - Only visible when Speech Input is ON */}
            {speechInput && onSpeechLanguageChange && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="pl-11"
              >
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Speech Language
                </Label>
                <Select value={speechLanguage} onValueChange={onSpeechLanguageChange}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue>
                      {getLanguageDisplayName(speechLanguage)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-[300px]">
                      {WHISPER_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.nativeName ? `${lang.name} (${lang.nativeName})` : lang.name}
                        </SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Used for "Transcribe in My Language" mode
                </p>
              </motion.div>
            )}
          </>
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

        {/* Upgrade hint for free users - only show to authenticated users */}
        {isAuthenticated && !isPremium && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              <Crown className="w-3 h-3 inline mr-1" />
              Upgrade to Pro for 16 animated steps/day + speech to text
            </p>
          </div>
        )}

        {/* Sign in hint for unauthenticated users - friendly, non-salesy */}
        {!isAuthenticated && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              Sign in to use History, Quizzes, and Polls.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
