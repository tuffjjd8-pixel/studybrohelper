import { Link, useLocation } from "react-router-dom";
import { Home, Clock, Brain, Trophy, BarChart3, User } from "lucide-react";

const tools = [
  { name: "Home", path: "/", icon: Home },
  { name: "History", path: "/history", icon: Clock },
  { name: "Quiz", path: "/quiz", icon: Brain },
  { name: "Results", path: "/results", icon: Trophy },
  { name: "Polls", path: "/polls", icon: BarChart3 },
  { name: "Profile", path: "/profile", icon: User },
];

export function ToolsScroller() {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-full border-t border-border bg-card/80 backdrop-blur-xl px-4 py-3 pb-safe">
      <div className="flex items-center justify-around gap-2 overflow-x-auto whitespace-nowrap scroll-smooth touch-pan-x max-w-md mx-auto">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const active = location.pathname === tool.path;

          return (
            <Link
              key={tool.name}
              to={tool.path}
              className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-full border transition min-w-[48px]
                ${active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-accent"}
              `}
            >
              <Icon size={18} />
              <span className="text-[10px] mt-0.5">{tool.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
