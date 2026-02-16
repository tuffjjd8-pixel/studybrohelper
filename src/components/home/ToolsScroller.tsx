import { useNavigate, useLocation } from "react-router-dom";
import { Brain, Trophy, BarChart3 } from "lucide-react";

const tools = [
  { icon: Brain, label: "Quiz", path: "/quiz" },
  { icon: Trophy, label: "Results", path: "/results" },
  { icon: BarChart3, label: "Polls", path: "/polls" },
];

export const ToolsScroller = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      className="flex items-center gap-3 overflow-x-auto whitespace-nowrap scroll-smooth px-4 py-2"
      style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
    >
      {tools.map((tool) => {
        const isActive = location.pathname === tool.path;
        return (
          <button
            key={tool.label}
            onClick={() => navigate(tool.path)}
            className={`flex flex-col items-center justify-center rounded-full px-4 py-2 border shrink-0 transition-colors ${
              isActive
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-accent active:bg-accent/80"
            }`}
          >
            <tool.icon className="w-5 h-5" />
            <span className="text-xs font-medium mt-0.5">{tool.label}</span>
          </button>
        );
      })}
    </div>
  );
};
