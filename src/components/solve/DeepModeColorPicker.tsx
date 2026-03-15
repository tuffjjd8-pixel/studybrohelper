import { motion } from "framer-motion";
import type { DeepTextColor } from "@/hooks/useDeepMode";

interface DeepModeColorPickerProps {
  selectedColor: DeepTextColor;
  onSelect: (color: DeepTextColor) => void;
  onClose: () => void;
}

const COLORS: { id: DeepTextColor; label: string; swatch: string }[] = [
  { id: "gold", label: "Gold", swatch: "bg-amber-400" },
  { id: "sky", label: "Sky", swatch: "bg-sky-400" },
  { id: "purple", label: "Purple", swatch: "bg-purple-400" },
  { id: "mint", label: "Mint", swatch: "bg-emerald-400" },
  { id: "rose", label: "Rose", swatch: "bg-rose-400" },
  { id: "orange", label: "Orange", swatch: "bg-orange-400" },
];

export function DeepModeColorPicker({ selectedColor, onSelect, onClose }: DeepModeColorPickerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card p-4 space-y-3"
    >
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
                ? "ring-2 ring-primary scale-105 bg-muted"
                : "hover:bg-muted/50"
              }
            `}
          >
            <span className={`w-6 h-6 rounded-full ${c.swatch}`} />
            <span className="text-[10px] font-medium">{c.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
