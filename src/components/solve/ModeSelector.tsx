import { useState } from "react";
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
import { DeepModeGate } from "@/components/solve/DeepModeGate";

export type SolveMode = "instant" | "deep" | "essay";

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
              <SelectItem value="essay">Essay</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {solveMode === "deep"
              ? "Answer + step-by-step explanation"
              : solveMode === "essay"
              ? "Structured essay with custom controls"
              : "Final answer only"}
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

        {/* Speech Input Toggle - Hidden */}

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
              Upgrade to Pro for unlimited solves + Deep Mode
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

