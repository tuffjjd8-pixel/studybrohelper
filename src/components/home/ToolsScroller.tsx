import { useNavigate } from "react-router-dom";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Brain, Calculator, BarChart3 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

// Only Quiz, Calc, Polls - these are hidden from bottom nav on mobile
const tools = [
  { icon: Brain, label: "Quiz", path: "/quiz" },
  { icon: Calculator, label: "Calc", path: "/calculator" },
  { icon: BarChart3, label: "Polls", path: "/polls" },
];

export const ToolsScroller = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Only show on mobile - desktop/tablet has all items in bottom nav
  // Also hide while detecting to prevent flash
  if (isMobile !== true) {
    return null;
  }

  return (
    <div className="w-full max-w-lg mt-6">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 px-2 py-3">
          {tools.map((tool) => (
            <button
              key={tool.label}
              onClick={() => navigate(tool.path)}
              className="flex flex-col items-center gap-2 px-5 py-3 min-w-[72px] rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 shrink-0"
            >
              <tool.icon className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {tool.label}
              </span>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="h-2" />
      </ScrollArea>
    </div>
  );
};
