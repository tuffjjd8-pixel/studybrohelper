import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Globe, X, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    if (!isPremium) {
      const lang = ANSWER_LANGUAGES.find((l) => l.code === candidate);
      if (!lang || !lang.free) return "en";
    }
    return candidate;
  }, [isPremium]);
  const [lang, setLang] = useState(initialLang);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(ANSWER_LANG_KEY)) {
      localStorage.setItem(ANSWER_LANG_KEY, initialLang);
    }
  }, [initialLang]);

  const persistCompletion = async () => {
    try {
      localStorage.setItem(userKey(userId), "1");
      localStorage.setItem(ONBOARDED_KEY_GUEST, "1");
      if (userId) {
        // Best-effort DB flag for cross-device persistence
        supabase
          .from("profiles")
          .update({ onboarded: true } as any)
          .eq("user_id", userId)
          .then(() => {});
      }
    } catch {}
  };

  const persistLanguage = async (code: string) => {
    try {
      localStorage.setItem(ANSWER_LANG_KEY, code);
      if (userId) {
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

  const currentLangLabel =
    ANSWER_LANGUAGES.find((l) => l.code === lang)?.label || "English";

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

              {/* Compact language pill — optional, non-blocking */}
              <div className="mt-5 flex w-full flex-col items-center">
                <button
                  type="button"
                  onClick={() => setLangOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-xs font-medium border border-border/50 transition-colors active:scale-95"
                >
                  <span>🌍</span>
                  <span>{currentLangLabel}</span>
                  <span className="text-muted-foreground">▼</span>
                </button>

                <AnimatePresence>
                  {langOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -3, scale: 0.99 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -3, scale: 0.99 }}
                      transition={{ duration: 0.1 }}
                      className="mt-2 w-52 max-h-[168px] overflow-y-auto overscroll-contain rounded-lg border border-border bg-popover text-popover-foreground shadow-lg p-1 text-left"
                    >
                      {ANSWER_LANGUAGES.map((l) => {
                        const locked = !l.free && !isPremium;
                        const isActive = l.code === lang;
                        return (
                          <button
                            key={l.code}
                            type="button"
                            onClick={() => {
                              if (locked) {
                                toast.message("Pro language", {
                                  description: "Upgrade to Pro to use this language.",
                                });
                                return;
                              }
                              handleLangChange(l.code);
                              setLangOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition-colors ${
                              locked
                                ? "opacity-60 cursor-not-allowed"
                                : "hover:bg-accent"
                            } ${isActive ? "bg-accent/60" : ""}`}
                          >
                            <span>{l.label}</span>
                            {locked ? (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Lock className="w-3 h-3" /> Pro
                              </span>
                            ) : isActive ? (
                              <span className="text-[10px] text-primary">●</span>
                            ) : null}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <p className="mt-3 text-[11px] text-muted-foreground/70">
                Free includes 4 languages • Pro unlocks 24 🌍
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/50">
                Change anytime in Profile → Settings
              </p>

              <Button
                onClick={finish}
                variant="neonGreenFilled"
                size="lg"
                className="mt-8 w-full max-w-[260px] active:scale-[0.97] transition-transform"
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

/**
 * Sync onboarding state from DB for signed-in users.
 * If the DB says onboarded=true, mirror to localStorage so we don't reshow.
 * If DB says false but local says true, push local truth to DB.
 * Returns true if onboarding should be shown.
 */
export async function resolveOnboardingForUser(userId: string): Promise<boolean> {
  try {
    const localKey = `studybro_onboarded_${userId}`;
    const localDone = !!localStorage.getItem(localKey);

    const { data } = await supabase
      .from("profiles")
      .select("onboarded" as any)
      .eq("user_id", userId)
      .maybeSingle();

    const dbDone = !!(data as any)?.onboarded;

    if (dbDone) {
      try { localStorage.setItem(localKey, "1"); } catch {}
      return false;
    }
    if (localDone) {
      // push local truth to DB
      supabase.from("profiles").update({ onboarded: true } as any).eq("user_id", userId).then(() => {});
      return false;
    }
    return true;
  } catch {
    // Fall back to local-only
    try {
      return !localStorage.getItem(`studybro_onboarded_${userId}`);
    } catch {
      return false;
    }
  }
}

export function shouldShowOnboarding(userId?: string | null): boolean {
  try {
    if (userId) {
      return !localStorage.getItem(`studybro_onboarded_${userId}`);
    }
    return !localStorage.getItem(ONBOARDED_KEY_GUEST);
  } catch {
    return false;
  }
}
