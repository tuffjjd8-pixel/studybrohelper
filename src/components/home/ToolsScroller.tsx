import { useNavigate } from "react-router-dom";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Brain, RotateCcw, Layers, History, Settings } from "lucide-react";

const tools = [
  { icon: Brain, label: "Quiz", path: "/quiz" },
  { icon: RotateCcw, label: "Review Mode", path: "/history" },
  { icon: Layers, label: "Flashcards", path: "/quiz" },
  { icon: History, label: "History", path: "/history" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export const ToolsScroller = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-md">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 px-1 py-2">
          {tools.map((tool) => (
            <button
              key={tool.label}
              onClick={() => navigate(tool.path)}
              className="flex flex-col items-center gap-2 px-4 py-3 min-w-[80px] rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-accent/50 transition-all duration-200"
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
