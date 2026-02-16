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
    <div className="w-full px-4 py-2">
      <div
        className="flex items-center gap-3 overflow-x-auto whitespace-nowrap scroll-smooth no-scrollbar"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
      >
        {tools.map((tool) => {
          const isActive = location.pathname === tool.path;
          return (
            <button
              key={tool.label}
              onClick={() => navigate(tool.path)}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-full border shrink-0 transition-colors duration-150 ${
                isActive
                  ? "bg-primary/10 border-primary/50 text-primary"
                  : "bg-card border-border text-muted-foreground hover:bg-accent/30 active:bg-accent/50"
              }`}
            >
              <tool.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tool.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
