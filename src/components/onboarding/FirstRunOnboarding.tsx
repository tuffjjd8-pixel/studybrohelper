import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Globe, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ANSWER_LANGUAGES } from "@/components/settings/AnswerLanguageSelector";

const ONBOARDED_KEY = "studybro_onboarded";
const ANSWER_LANG_KEY = "answer_language";

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
}

export function FirstRunOnboarding({ onFinish }: Props) {
  const [step, setStep] = useState<0 | 1>(0);
  const initialLang = useMemo(
    () => localStorage.getItem(ANSWER_LANG_KEY) || detectDeviceLang(),
    []
  );
  const [lang, setLang] = useState(initialLang);

  // Pre-set the device language immediately so even Skip respects it
  useEffect(() => {
    if (!localStorage.getItem(ANSWER_LANG_KEY)) {
      localStorage.setItem(ANSWER_LANG_KEY, initialLang);
    }
  }, [initialLang]);

  const finish = () => {
    localStorage.setItem(ANSWER_LANG_KEY, lang);
    localStorage.setItem(ONBOARDED_KEY, "1");
    onFinish();
  };

  const skip = () => {
    localStorage.setItem(ONBOARDED_KEY, "1");
    onFinish();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Skip */}
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
                20+ languages supported 🌍
              </p>

              <div className="mt-6 w-full max-w-[260px]">
                <Select value={lang} onValueChange={setLang}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {ANSWER_LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.label}
                      </SelectItem>
                    ))}
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

export function shouldShowOnboarding(): boolean {
  try {
    return !localStorage.getItem(ONBOARDED_KEY);
  } catch {
    return false;
  }
}
