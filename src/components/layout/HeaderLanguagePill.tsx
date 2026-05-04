import { useState } from "react";
import { Globe, Check, Crown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { useAnswerLanguage } from "@/hooks/useAnswerLanguage";
import { ANSWER_LANGUAGES } from "@/components/settings/AnswerLanguageSelector";
import { useNavigate } from "react-router-dom";

interface HeaderLanguagePillProps {
  isPremium?: boolean;
}

export function HeaderLanguagePill({ isPremium = false }: HeaderLanguagePillProps) {
  const { user } = useAuth();
  const { answerLanguage, updateLanguage } = useAnswerLanguage(user?.id, !!isPremium);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const current = ANSWER_LANGUAGES.find((l) => l.code === answerLanguage) || ANSWER_LANGUAGES[0];

  const handlePick = (code: string) => {
    const lang = ANSWER_LANGUAGES.find((l) => l.code === code);
    if (!lang) return;
    if (!lang.free && !isPremium) {
      setOpen(false);
      navigate("/premium");
      return;
    }
    updateLanguage(code);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-card/60 border border-border hover:border-primary/40 transition-colors text-xs font-medium"
          aria-label="Change answer language"
        >
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span className="hidden sm:inline">{current.label}</span>
          <span className="sm:hidden uppercase">{current.code}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-0">
        <div className="px-3 py-2 border-b border-border">
          <p className="text-xs font-medium">Answer Language</p>
          <p className="text-[10px] text-muted-foreground">20+ languages supported</p>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {ANSWER_LANGUAGES.map((lang) => {
            const locked = !lang.free && !isPremium;
            const active = lang.code === answerLanguage;
            return (
              <button
                key={lang.code}
                onClick={() => handlePick(lang.code)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors ${
                  active ? "text-primary font-medium" : "text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  {lang.label}
                  {locked && <Crown className="w-3 h-3 text-primary/60" />}
                </span>
                {active && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
