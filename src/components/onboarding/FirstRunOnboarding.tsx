import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Globe, X, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ANSWER_LANGUAGES } from "@/components/settings/AnswerLanguageSelector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ONBOARDED_KEY_GUEST = "studybro_onboarded";
const ANSWER_LANG_KEY = "answer_language";

function userKey(userId?: string | null) {
  return userId ? `studybro_onboarded_${userId}` : ONBOARDED_KEY_GUEST;
}

function detectDeviceLang(): string {
  try {
    const raw = (navigator.language || "en").toLowerCase().split("-")[0];
    const match = ANSWER_LANGUAGES.find((l) => l.code === raw);
    return match?.code || "en";
  } catch {
    return "en";
  }
}

interface Props {
  onFinish: () => void;
  userId?: string | null;
  isPremium?: boolean;
}

export function FirstRunOnboarding({ onFinish, userId, isPremium = false }: Props) {
  const [step, setStep] = useState<0 | 1>(0);
  const initialLang = useMemo(() => {
    const saved = localStorage.getItem(ANSWER_LANG_KEY);
    const candidate = saved || detectDeviceLang();
    // Free users: clamp to a free language
    if (!isPremium) {
      const lang = ANSWER_LANGUAGES.find((l) => l.code === candidate);
      if (!lang || !lang.free) return "en";
    }
    return candidate;
  }, [isPremium]);
  const [lang, setLang] = useState(initialLang);

  useEffect(() => {
    if (!localStorage.getItem(ANSWER_LANG_KEY)) {
      localStorage.setItem(ANSWER_LANG_KEY, initialLang);
    }
  }, [initialLang]);

  const persistCompletion = async () => {
    try {
      localStorage.setItem(userKey(userId), "1");
      // Also mark guest key so we don't reshow before auth resolves on next load
      localStorage.setItem(ONBOARDED_KEY_GUEST, "1");
    } catch {}
  };

  const persistLanguage = async (code: string) => {
    try {
      localStorage.setItem(ANSWER_LANG_KEY, code);
      if (userId) {
        // Best-effort; don't block
        supabase
          .from("profiles")
          .update({ answer_language: code } as any)
          .eq("user_id", userId)
          .then(() => {});
      }
    } catch {}
  };

  const finish = async () => {
    await persistLanguage(lang);
    await persistCompletion();
    onFinish();
  };

  const skip = async () => {
    await persistCompletion();
    onFinish();
  };

  const handleLangChange = (code: string) => {
    const l = ANSWER_LANGUAGES.find((x) => x.code === code);
    if (!l) return;
    if (!l.free && !isPremium) {
      toast.message("Pro language", {
        description: "Upgrade to Pro to use this language.",
      });
      return;
    }
    setLang(code);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={skip}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors active:scale-95"
        >
          Skip <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {step === 0 ? (
            <motion.div
              key="s0"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22 }}
              className="flex flex-col items-center text-center max-w-sm"
            >
              <GlowIcon>
                <Camera className="w-12 h-12 text-primary" strokeWidth={2.2} />
              </GlowIcon>
              <h1 className="mt-8 text-2xl font-heading font-bold leading-tight">
                Scan anything. <br />
                Get answers instantly.
              </h1>
              <p className="mt-3 text-muted-foreground text-sm">
                No categories. No typing. Just results.
              </p>
              <p className="mt-4 text-[11px] text-muted-foreground/60">
                Usually solved in seconds ⚡
              </p>

              <Button
                onClick={() => setStep(1)}
                variant="neonGreenFilled"
                size="lg"
                className="mt-10 w-full max-w-[260px] active:scale-[0.97] transition-transform"
              >
                Next →
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="s1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22 }}
              className="flex flex-col items-center text-center max-w-sm w-full"
            >
              <GlowIcon>
                <Globe className="w-12 h-12 text-primary" strokeWidth={2.2} />
              </GlowIcon>
              <h1 className="mt-8 text-2xl font-heading font-bold leading-tight">
                Understand it your way
              </h1>
              <p className="mt-3 text-muted-foreground text-sm">
                Answers in your language. Instantly.
              </p>
              <p className="mt-4 text-[11px] text-muted-foreground/60">
                Free includes 4 languages. Pro unlocks 24. 🌍
              </p>

              <div className="mt-6 w-full max-w-[260px]">
                <Select value={lang} onValueChange={handleLangChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {ANSWER_LANGUAGES.map((l) => {
                      const locked = !l.free && !isPremium;
                      return (
                        <SelectItem
                          key={l.code}
                          value={l.code}
                          disabled={locked}
                          className="flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            {l.label}
                            {locked && (
                              <Lock className="w-3 h-3 text-muted-foreground" />
                            )}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={finish}
                variant="neonGreenFilled"
                size="lg"
                className="mt-6 w-full max-w-[260px] active:scale-[0.97] transition-transform"
              >
                Start →
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function GlowIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{ background: "hsl(var(--primary) / 0.35)" }}
        animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.15, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="relative w-24 h-24 rounded-full flex items-center justify-center border-2 border-primary/40"
        style={{ background: "hsl(var(--background))" }}
      >
        {children}
      </div>
    </div>
  );
}

export function shouldShowOnboarding(userId?: string | null): boolean {
  try {
    if (userId) {
      // For signed-in users, only the user-scoped key matters.
      return !localStorage.getItem(`studybro_onboarded_${userId}`);
    }
    return !localStorage.getItem(ONBOARDED_KEY_GUEST);
  } catch {
    return false;
  }
}
