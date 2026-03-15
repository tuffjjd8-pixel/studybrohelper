import { Crown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Clock, Mic } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WHISPER_LANGUAGES, getLanguageDisplayName } from "@/lib/whisperLanguages";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { toast } from "sonner";

export type SolveMode = "instant" | "deep";

interface ModeSelectorProps {
  solveMode: SolveMode;
  onSolveModeChange: (mode: SolveMode) => void;
  keepMode: boolean;
  onKeepModeChange: (value: boolean) => void;
  isPremium: boolean;
  solvesUsed: number;
  maxSolves: number;
  canSolve: boolean;
  speechInput?: boolean;
  onSpeechInputChange?: (value: boolean) => void;
  speechLanguage?: string;
  onSpeechLanguageChange?: (value: string) => void;
  isAuthenticated?: boolean;
}

export function ModeSelector({
  solveMode,
  onSolveModeChange,
  keepMode,
  onKeepModeChange,
  isPremium,
  solvesUsed,
  maxSolves,
  canSolve,
  speechInput = false,
  onSpeechInputChange,
  speechLanguage = "auto",
  onSpeechLanguageChange,
  isAuthenticated = false,
}: ModeSelectorProps) {
  const solvesRemaining = isPremium ? -1 : Math.max(0, maxSolves - solvesUsed);
  const usagePercent = isPremium ? 0 : (solvesUsed / maxSolves) * 100;
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

        {/* Mode Dropdown */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Solve Mode</Label>
          <Select
            value={solveMode}
            onValueChange={(val) => {
              if (val === "deep" && !isPremium) {
                toast("Upgrade to Pro to unlock Deep Mode", { icon: "👑" });
                return;
              }
              onSolveModeChange(val as SolveMode);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instant">Instant</SelectItem>
              <SelectItem value="deep" disabled={!isPremium}>
                <span className="flex items-center gap-1.5">
                  Deep
                  {!isPremium && <Crown className="w-3 h-3 text-amber-400" />}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {solveMode === "deep" ? "Answer + step-by-step explanation" : "Final answer only"}
          </p>
        </div>

        {/* Keep mode toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="keep-mode" className="text-sm cursor-pointer">
            Keep this mode for this session
          </Label>
          <Switch
            id="keep-mode"
            checked={keepMode}
            onCheckedChange={onKeepModeChange}
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
                  <Label htmlFor="speech-input" className="text-sm font-medium cursor-pointer">
                    Speech to Text
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Voice transcription (unlimited)
                  </p>
                </div>
              </div>
              <Switch
                id="speech-input"
                checked={speechInput}
                onCheckedChange={onSpeechInputChange}
              />
            </div>

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

        {!isPremium && !canSolve && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            You've used all {maxSolves} solves for today.
            Upgrade to Pro for unlimited solves.
          </div>
        )}

        {isAuthenticated && !isPremium && canSolve && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              <Crown className="w-3 h-3 inline mr-1" />
              Upgrade to Pro for unlimited solves + Deep Mode + speech to text
            </p>
          </div>
        )}

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

