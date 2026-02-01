import { Home, Clock, User, BarChart3, Brain, Calculator } from "lucide-react";
import { useLocation, Link } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Clock, label: "History", path: "/history" },
  { icon: Brain, label: "Quiz", path: "/quiz" },
  { icon: Calculator, label: "Calc", path: "/calculator" },
  { icon: BarChart3, label: "Polls", path: "/polls" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-50
        bg-card/80 backdrop-blur-xl border-t border-border/50
        px-2 sm:px-4 md:px-6 py-2 sm:py-3 pb-safe
        overflow-x-auto overflow-y-hidden
      "
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div 
        className="flex items-center justify-around max-w-md mx-auto min-w-[320px]"
        style={{ minWidth: 'min-content' }}
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
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation'
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
    </nav>
  );
}
