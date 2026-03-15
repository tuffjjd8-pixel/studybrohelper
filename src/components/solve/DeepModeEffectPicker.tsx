import type { DeepTextColor } from "./DeepModeReveal";

interface DeepModeTextColorPickerProps {
  selectedColor: DeepTextColor;
  onSelect: (color: DeepTextColor) => void;
  onClose: () => void;
}

const COLORS: { id: DeepTextColor; label: string; swatch: string }[] = [
  { id: "default", label: "Default", swatch: "bg-white" },
  { id: "gold", label: "Gold", swatch: "bg-amber-400" },
  { id: "sky", label: "Sky", swatch: "bg-sky-400" },
  { id: "purple", label: "Purple", swatch: "bg-purple-400" },
  { id: "rose", label: "Rose", swatch: "bg-rose-400" },
  { id: "orange", label: "Orange", swatch: "bg-orange-400" },
];

export function DeepModeEffectPicker({ selectedColor, onSelect, onClose }: DeepModeTextColorPickerProps) {
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Text Color
        </h4>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          Done
        </button>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {COLORS.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`
              flex flex-col items-center gap-1 p-2 rounded-xl transition-all
              ${selectedColor === c.id
                ? "bg-primary/20 ring-2 ring-primary scale-105"
                : "bg-muted/50 hover:bg-muted"
              }
            `}
          >
            <span className={`w-5 h-5 rounded-full ${c.swatch} border border-border/50`} />
            <span className="text-[10px] font-medium">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
