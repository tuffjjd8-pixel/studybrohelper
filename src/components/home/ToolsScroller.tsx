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
    <div className="w-full max-w-lg">
      <div
        className="flex gap-3 px-2 py-2 overflow-x-auto whitespace-nowrap scroll-smooth"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {tools.map((tool) => {
          const isActive = location.pathname === tool.path;
          return (
            <button
              key={tool.label}
              onClick={() => navigate(tool.path)}
              className={`flex flex-col items-center gap-1.5 px-4 py-2.5 min-w-[68px] rounded-xl border transition-all duration-200 shrink-0 ${
                isActive
                  ? "bg-primary/10 border-primary/50 text-primary"
                  : "bg-card border-border hover:border-primary/50 hover:bg-accent/50"
              }`}
            >
              <tool.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-primary"}`} />
              <span className={`text-xs font-medium whitespace-nowrap ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
