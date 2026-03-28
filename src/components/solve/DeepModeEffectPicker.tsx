import { motion } from "framer-motion";
import type { DeepModeEffect } from "./DeepModeReveal";

interface DeepModeEffectPickerProps {
  selectedEffect: DeepModeEffect;
  onSelect: (effect: DeepModeEffect) => void;
  onClose: () => void;
}

const EFFECTS: { id: DeepModeEffect; label: string; emoji: string; description: string }[] = [
  { id: "fire", label: "Fire", emoji: "🔥", description: "Orange glow & flicker" },
  { id: "water", label: "Water", emoji: "💧", description: "Ripple distortion" },
  { id: "neon", label: "Neon", emoji: "💚", description: "Bright glow" },
  { id: "glitch", label: "Glitch", emoji: "⚡", description: "Jitter & RGB split" },
  { id: "sparkle", label: "Sparkle", emoji: "✨", description: "Particle bursts" },
];

export function DeepModeEffectPicker({ selectedEffect, onSelect, onClose }: DeepModeEffectPickerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Choose Your Effect
        </h4>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          Done
        </button>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {EFFECTS.map((fx) => (
          <button
            key={fx.id}
            onClick={() => onSelect(fx.id)}
            className={`
              flex flex-col items-center gap-1 p-2 rounded-xl transition-all
              ${selectedEffect === fx.id
                ? "bg-primary/20 ring-2 ring-primary scale-105"
                : "bg-muted/50 hover:bg-muted"
              }
            `}
          >
            <span className="text-xl">{fx.emoji}</span>
            <span className="text-[10px] font-medium">{fx.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
