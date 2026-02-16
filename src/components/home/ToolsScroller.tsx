import { Home, Clock, User, BarChart3, Brain, Trophy } from "lucide-react";
import { useLocation, Link } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Clock, label: "History", path: "/history" },
  { icon: Brain, label: "Quiz", path: "/quiz" },
  { icon: Trophy, label: "Results", path: "/results" },
  { icon: BarChart3, label: "Polls", path: "/polls" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function ToolsScroller() {
  const location = useLocation();

  return (
    <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap scroll-smooth touch-pan-x px-4 py-3"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className="
              relative flex flex-col items-center justify-center gap-0.5 sm:gap-1
              min-w-[48px] min-h-[48px] p-1.5 sm:p-2
              touch-manipulation select-none
              flex-shrink-0
            "
            style={{
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            {isActive && (
              <div className="absolute inset-0 bg-primary/10 rounded-xl" />
            )}
            <item.icon
              className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors relative z-10 flex-shrink-0 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <span
              className={`text-[10px] sm:text-xs transition-colors relative z-10 whitespace-nowrap truncate max-w-[48px] sm:max-w-[56px] text-center ${
                isActive ? "text-primary font-medium" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
