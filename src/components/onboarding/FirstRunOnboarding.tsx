import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Globe, ArrowRight } from "lucide-react";

interface FirstRunOnboardingProps {
  onDone: () => void;
}

const SCREENS = [
  {
    icon: Camera,
    headline: "Scan anything. Get answers instantly.",
    subtext: "No categories. No typing.",
  },
  {
    icon: Globe,
    headline: "Understand it your way",
    subtext: "Answers in your language",
  },
];

export function FirstRunOnboarding({ onDone }: FirstRunOnboardingProps) {
  const [step, setStep] = useState(0);
  const isLast = step === SCREENS.length - 1;
  const screen = SCREENS[step];
  const Icon = screen.icon;

  const next = () => {
    if (isLast) onDone();
    else setStep((s) => s + 1);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Skip */}
      <div className="flex justify-end px-5 pt-5" style={{ paddingTop: "calc(env(safe-area-inset-top, 16px) + 12px)" }}>
        <button
          onClick={onDone}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full"
          aria-label="Skip onboarding"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="text-center max-w-sm space-y-6"
          >
            <div className="flex justify-center">
              <div className="relative w-24 h-24 rounded-3xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-2xl opacity-60" />
                <Icon className="w-10 h-10 text-primary relative" />
              </div>
            </div>
            <h1 className="text-3xl font-heading font-bold leading-tight tracking-tight">
              {screen.headline}
            </h1>
            <p className="text-base text-muted-foreground">{screen.subtext}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div
        className="px-6 pb-8 space-y-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 24px) + 24px)" }}
      >
        {/* Dots */}
        <div className="flex justify-center gap-1.5">
          {SCREENS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="w-full max-w-sm mx-auto flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-base active:scale-[0.98] transition-transform"
          style={{ display: "flex" }}
        >
          {isLast ? "Start" : "Next"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
