import { useNavigate } from "react-router-dom";
import { Brain, Trophy, BarChart3, Calculator } from "lucide-react";

const tools = [
  { icon: Brain, label: "Quiz", path: "/quiz" },
  { icon: Calculator, label: "Calc", path: "/results" },
  { icon: BarChart3, label: "Polls", path: "/polls" },
];

export const ToolsScroller = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-lg mt-4">
      <div
        className="flex gap-3 px-2 py-3 overflow-x-auto whitespace-nowrap scroll-smooth"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
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
    </div>
  );
};
