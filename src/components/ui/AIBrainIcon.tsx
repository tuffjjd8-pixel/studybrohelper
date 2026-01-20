import { Brain, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIBrainIconProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  animate?: boolean;
  glowIntensity?: "subtle" | "medium" | "strong";
}

const sizeMap = {
  sm: { brain: "w-4 h-4", bolt: "w-2 h-2", container: "w-4 h-4" },
  md: { brain: "w-5 h-5", bolt: "w-2.5 h-2.5", container: "w-5 h-5" },
  lg: { brain: "w-6 h-6", bolt: "w-3 h-3", container: "w-6 h-6" },
  xl: { brain: "w-8 h-8", bolt: "w-4 h-4", container: "w-8 h-8" },
};

const glowMap = {
  subtle: "drop-shadow-[0_0_3px_hsl(var(--primary))]",
  medium: "drop-shadow-[0_0_6px_hsl(var(--primary))] drop-shadow-[0_0_12px_hsl(var(--primary)/0.5)]",
  strong: "drop-shadow-[0_0_8px_hsl(var(--primary))] drop-shadow-[0_0_16px_hsl(var(--primary)/0.6)] drop-shadow-[0_0_24px_hsl(var(--primary)/0.3)]",
};

export function AIBrainIcon({ 
  className, 
  size = "md", 
  animate = false,
  glowIntensity = "medium"
}: AIBrainIconProps) {
  const sizes = sizeMap[size];
  const glow = glowMap[glowIntensity];

  return (
    <div className={cn("relative inline-flex items-center justify-center", sizes.container, className)}>
      {/* Main brain icon with glow */}
      <Brain 
        className={cn(
          sizes.brain,
          "text-primary",
          glow,
          animate && "animate-pulse"
        )} 
      />
      {/* Bolt overlay positioned at top-right */}
      <Zap 
        className={cn(
          sizes.bolt,
          "absolute -top-0.5 -right-0.5 text-primary fill-primary",
          glow,
          animate && "animate-pulse"
        )} 
      />
    </div>
  );
}
