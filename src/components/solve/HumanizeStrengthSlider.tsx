import { Crown } from "lucide-react";

export type HumanizeStrength = "soft" | "medium" | "strong" | "auto";

const MODES: { value: HumanizeStrength; label: string }[] = [
  { value: "soft", label: "Soft" },
  { value: "medium", label: "Medium" },
  { value: "strong", label: "Strong" },
  { value: "auto", label: "Auto" },
];

interface HumanizeStrengthSliderProps {
  value: HumanizeStrength;
  onChange: (value: HumanizeStrength) => void;
  isPremium: boolean;
  onUpgradeClick: () => void;
}

export function HumanizeStrengthSlider({
  value,
  onChange,
  isPremium,
  onUpgradeClick,
}: HumanizeStrengthSliderProps) {
  const activeIndex = MODES.findIndex((m) => m.value === value);

  const handleClick = (mode: HumanizeStrength) => {
    if (!isPremium) {
      onUpgradeClick();
      return;
    }
    onChange(mode);
  };

  return (
    <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1">
      {MODES.map((mode, i) => (
        <button
          key={mode.value}
          onClick={() => handleClick(mode.value)}
          className={`
            relative px-3 py-1 rounded-full text-xs font-medium transition-all
            ${i === activeIndex && isPremium
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
            }
            ${!isPremium ? "opacity-60 cursor-pointer" : ""}
          `}
        >
          {mode.label}
          {mode.value === "auto" && isPremium && (
            <span className="ml-1 text-[9px] opacity-70">✦</span>
          )}
        </button>
      ))}
      {!isPremium && (
        <Crown className="w-3 h-3 text-amber-400 ml-1 mr-1 shrink-0" />
      )}
    </div>
  );
}
