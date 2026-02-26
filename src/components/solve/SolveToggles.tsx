import { motion } from "framer-motion";
import { toast } from "sonner";
import { Crown, Clock, Mic, ChevronDown, Zap, BookOpen } from "lucide-react";
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

export type SolveMode = "instant" | "deep";

interface SolveTogglesProps {
  animatedSteps: boolean;
  onAnimatedStepsChange: (value: boolean) => void;
  isPremium: boolean;
  solvesUsed: number;
  maxSolves: number;
  canSolve: boolean;
  speechInput?: boolean;
  onSpeechInputChange?: (value: boolean) => void;
  speechLanguage?: string;
  onSpeechLanguageChange?: (value: string) => void;
  isAuthenticated?: boolean;
  solveMode: SolveMode;
  onSolveModeChange: (mode: SolveMode) => void;
}

export function SolveToggles({
  animatedSteps,
  onAnimatedStepsChange,
  isPremium,
  solvesUsed,
  maxSolves,
  canSolve,
  speechInput = false,
  onSpeechInputChange,
  speechLanguage = "auto",
  onSpeechLanguageChange,
  isAuthenticated = false,
  solveMode,
  onSolveModeChange,
}: SolveTogglesProps) {
  const solvesRemaining = isPremium ? -1 : Math.max(0, maxSolves - solvesUsed);
  const usagePercent = isPremium ? 0 : (solvesUsed / maxSolves) * 100;
  
  // Premium features require authentication
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

        {/* Instant / Deep Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${solveMode === "deep" ? "bg-primary/10" : "bg-muted"}`}>
              {solveMode === "deep" ? (
                <BookOpen className="w-4 h-4 text-primary" />
              ) : (
                <Zap className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <Label className="text-sm font-medium cursor-pointer">
                {solveMode === "deep" ? "Deep Mode" : "Instant Mode"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isPremium ? (
                  solveMode === "deep" ? "Answer + short explanation" : "Final answer only"
                ) : (
                  <span className="inline-flex items-center gap-1.5 pr-1">
                    Final answer only
                    <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                  </span>
                )}
              </p>
            </div>
          </div>
          <Switch
            checked={solveMode === "deep"}
            onCheckedChange={(checked) => {
              if (!isPremium) {
                toast("Upgrade to Pro to unlock Deep Mode", { icon: "👑" });
                return;
              }
              onSolveModeChange(checked ? "deep" : "instant");
            }}
            disabled={!isPremium}
          />
        </div>

        {/* Animated Steps Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${canSolve ? "bg-primary/10" : "bg-muted"}`}>
              <AIBrainIcon size="sm" glowIntensity={canSolve ? "medium" : "subtle"} />
            </div>
            <div>
              <Label 
                htmlFor="animated-steps" 
                className={`text-sm font-medium cursor-pointer ${!canSolve && !isPremium && "text-muted-foreground"}`}
              >
                Animated Steps
              </Label>
              <p className="text-xs text-muted-foreground">
                {isPremium ? (
                  <span>Detailed step-by-step (unlimited)</span>
                ) : canSolve ? (
                  <span>Simplified steps • {solvesUsed}/{maxSolves} solves used</span>
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
          />
        </div>

        {/* Free user upsell banner for animated steps */}
        {!isPremium && animatedSteps && canSolve && (
          <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
            <Crown className="w-3 h-3 inline mr-1 text-primary" />
            Upgrade to Pro for detailed animated steps with full explanations.
          </div>
        )}

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
                    Voice transcription (15/day)
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

        {/* Usage Progress Bar - only for free users */}
        {!isPremium && (
          <div className="space-y-1">
            <Progress value={usagePercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {solvesRemaining} solve{solvesRemaining !== 1 ? "s" : ""} remaining today • Resets at midnight CST
            </p>
          </div>
        )}
        
        {/* Limit reached message */}
        {!isPremium && !canSolve && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            You've used all {maxSolves} solves for today. 
            Upgrade to Pro for unlimited solves with detailed animated steps.
          </div>
        )}

        {/* Upgrade hint for free users - only show to authenticated users */}
        {isAuthenticated && !isPremium && canSolve && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              <Crown className="w-3 h-3 inline mr-1" />
              Upgrade to Pro for unlimited solves + detailed steps + speech to text
            </p>
          </div>
        )}

        {/* Sign in hint for unauthenticated users */}
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
