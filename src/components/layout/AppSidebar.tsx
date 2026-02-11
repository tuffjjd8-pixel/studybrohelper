import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Home, Clock, User, Crown, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const sidebarItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Clock, label: "History", path: "/history" },
  { icon: User, label: "Profile", path: "/profile" },
  { icon: Crown, label: "Premium", path: "/premium" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const location = useLocation();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60]"
          />

          {/* Sidebar */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar-background border-r border-sidebar-border z-[70] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-heading font-bold text-primary">C</span>
                </div>
                <div>
                  <h2 className="font-heading font-bold text-sidebar-foreground">
                    Study<span className="text-primary">Bro</span>
                  </h2>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">AI</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              {sidebarItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                      ${isActive 
                        ? "bg-sidebar-primary/10 text-sidebar-primary" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                      }
                    `}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? "text-sidebar-primary" : ""}`} />
                    <span className="font-medium">{item.label}</span>
                    {item.path === "/premium" && (
                      <span className="ml-auto text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        PRO
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-sidebar-border">
              <p className="text-xs text-muted-foreground text-center">
                © 2025 StudyBro AI
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
