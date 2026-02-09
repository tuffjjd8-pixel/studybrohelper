import { useNavigate } from "react-router-dom";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Brain, Trophy, BarChart3 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useAuth } from "@/hooks/useAuth";

// Tools with optional feature flag keys
const tools = [
  { icon: Brain, label: "Quiz", path: "/quiz" },
  { icon: Trophy, label: "Results", path: "/results", flag: "show_advanced_results" },
  { icon: BarChart3, label: "Polls", path: "/polls" },
];

export const ToolsScroller = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { isFeatureEnabled, loading } = useFeatureFlags(user?.email);

  if (isMobile !== true) return null;

  // Filter tools by feature flags
  const visibleTools = tools.filter((tool) => {
    if (!tool.flag) return true;
    return isFeatureEnabled(tool.flag);
  });

  if (visibleTools.length === 0 || loading) return null;

  return (
    <div className="w-full max-w-lg mt-6">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 px-2 py-3">
          {visibleTools.map((tool) => (
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
        <ScrollBar orientation="horizontal" className="h-2" />
      </ScrollArea>
    </div>
  );
};
