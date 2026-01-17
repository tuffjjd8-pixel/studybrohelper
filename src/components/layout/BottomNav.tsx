import { Home, Clock, User, Sparkles, FileText, BarChart3 } from "lucide-react";
import { useLocation, Link } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Clock, label: "History", path: "/history" },
  { icon: Sparkles, label: "Quiz", path: "/quiz" },
  { icon: FileText, label: "Summarize", path: "/summarize" },
  { icon: BarChart3, label: "Poll", path: "/polls" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-50
        bg-card/80 backdrop-blur-xl border-t border-border/50
        px-6 py-3 pb-safe
      "
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center gap-1 p-2"
            >
              {isActive && (
                <div className="absolute inset-0 bg-primary/10 rounded-xl" />
              )}
              <item.icon
                className={`w-6 h-6 transition-colors relative z-10 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-xs transition-colors relative z-10 ${
                  isActive ? "text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
