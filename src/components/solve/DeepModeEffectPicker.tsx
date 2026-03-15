import type { DeepModeTextColor } from "./DeepModeReveal";

interface DeepModeColorPickerProps {
  selectedColor: DeepModeTextColor;
  onSelect: (color: DeepModeTextColor) => void;
  onClose: () => void;
}

const COLORS: { id: DeepModeTextColor; label: string; swatch: string }[] = [
  { id: "default", label: "Default", swatch: "bg-[hsl(0,0%,95%)]" },
  { id: "gold", label: "Gold", swatch: "bg-[hsl(45,90%,55%)]" },
  { id: "sky", label: "Sky", swatch: "bg-[hsl(200,85%,55%)]" },
  { id: "purple", label: "Purple", swatch: "bg-[hsl(270,70%,60%)]" },
  { id: "rose", label: "Rose", swatch: "bg-[hsl(340,75%,55%)]" },
  { id: "orange", label: "Orange", swatch: "bg-[hsl(25,95%,55%)]" },
];

export function DeepModeColorPicker({ selectedColor, onSelect, onClose }: DeepModeColorPickerProps) {
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
              flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all
              ${selectedColor === c.id
                ? "bg-primary/20 ring-2 ring-primary scale-105"
                : "bg-muted/50 hover:bg-muted"
              }
            `}
          >
            <span className={`w-5 h-5 rounded-full ${c.swatch}`} />
            <span className="text-[10px] font-medium">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
