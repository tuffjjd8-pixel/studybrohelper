import { Home, Clock, User, Brain } from "lucide-react";
import { useLocation, Link } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Clock, label: "History", path: "/history" },
  { icon: Brain, label: "Quiz", path: "/quiz" },
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
      "
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                relative flex flex-col items-center justify-center gap-0.5
                min-w-[56px] min-h-[48px] px-3 py-1.5
                touch-manipulation select-none rounded-xl
                transition-all duration-100 ease-out
                ${isActive ? "scale-110" : "scale-100"}
              `}
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
            >
              {isActive && (
                <div
                  className="absolute inset-0 rounded-xl transition-opacity duration-100 ease-out"
                  style={{
                    background: 'hsl(var(--primary) / 0.12)',
                    boxShadow: '0 0 12px hsl(var(--primary) / 0.15)',
                  }}
                />
              )}
              <item.icon
                className={`w-6 h-6 transition-colors duration-100 relative z-10 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] sm:text-xs transition-colors duration-100 relative z-10 whitespace-nowrap ${
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
