import { useState, useEffect } from "react";
import { Home, Clock, User, BarChart3 } from "lucide-react";
import { useLocation, Link } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Clock, label: "History", path: "/history" },
  { icon: BarChart3, label: "Polls", path: "/polls" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function BottomNav() {
  const location = useLocation();
  const [isVertical, setIsVertical] = useState(() => {
    return localStorage.getItem("nav_layout") === "vertical";
  });

  useEffect(() => {
    localStorage.setItem("nav_layout", isVertical ? "vertical" : "horizontal");
  }, [isVertical]);

  const toggleLayout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVertical(!isVertical);
  };

  if (isVertical) {
    return (
      <nav
        className="
          fixed left-4 bottom-20 z-50
          bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl
          p-2 shadow-lg
        "
      >
        <div className="flex flex-col items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isHome = item.path === "/";
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-lg w-full transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <div className="relative">
                  <item.icon className="w-5 h-5" />
                  {isHome && (
                    <button
                      onClick={toggleLayout}
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full hover:bg-red-400 transition-colors"
                      aria-label="Toggle navigation layout"
                    />
                  )}
                </div>
                <span className={`text-sm ${isActive ? "font-medium" : ""}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

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
          const isHome = item.path === "/";
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center gap-1 p-2"
            >
              {isActive && (
                <div className="absolute inset-0 bg-primary/10 rounded-xl" />
              )}
              <div className="relative">
                <item.icon
                  className={`w-6 h-6 transition-colors relative z-10 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                {isHome && (
                  <button
                    onClick={toggleLayout}
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full hover:bg-red-400 transition-colors z-20"
                    aria-label="Toggle navigation layout"
                  />
                )}
              </div>
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
