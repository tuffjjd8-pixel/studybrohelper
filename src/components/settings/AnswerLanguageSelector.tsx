import { useState } from "react";
import { Globe, Lock, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface LanguageOption {
  code: string;
  label: string;
  free: boolean;
}

export const ANSWER_LANGUAGES: LanguageOption[] = [
  // Free languages
  { code: "en", label: "English", free: true },
  { code: "es", label: "Spanish", free: true },
  { code: "hi", label: "Hindi", free: true },
  { code: "ar", label: "Arabic", free: true },
  // Pro languages
  { code: "zh", label: "Chinese", free: false },
  { code: "fr", label: "French", free: false },
  { code: "de", label: "German", free: false },
  { code: "ko", label: "Korean", free: false },
  { code: "ja", label: "Japanese", free: false },
  { code: "pt", label: "Portuguese", free: false },
  { code: "it", label: "Italian", free: false },
  { code: "tr", label: "Turkish", free: false },
  { code: "bn", label: "Bengali", free: false },
  { code: "ur", label: "Urdu", free: false },
  { code: "te", label: "Telugu", free: false },
  { code: "ta", label: "Tamil", free: false },
  { code: "vi", label: "Vietnamese", free: false },
  { code: "ru", label: "Russian", free: false },
  { code: "id", label: "Indonesian", free: false },
  { code: "ne", label: "Nepali", free: false },
  { code: "th", label: "Thai", free: false },
  { code: "pl", label: "Polish", free: false },
  { code: "nl", label: "Dutch", free: false },
  { code: "uk", label: "Ukrainian", free: false },
];

interface AnswerLanguageSelectorProps {
  value: string;
  onChange: (lang: string) => void;
  isPremium: boolean;
}

export function AnswerLanguageSelector({
  value,
  onChange,
  isPremium,
}: AnswerLanguageSelectorProps) {
  const [showUpsell, setShowUpsell] = useState(false);
  const navigate = useNavigate();

  const currentLabel =
    ANSWER_LANGUAGES.find((l) => l.code === value)?.label || "English";

  const handleSelect = (code: string) => {
    const lang = ANSWER_LANGUAGES.find((l) => l.code === code);
    if (!lang) return;

    if (!lang.free && !isPremium) {
      setShowUpsell(true);
      return;
    }

    onChange(code);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.12 }}
        className="p-4 bg-card rounded-xl border border-border"
      >
        <div className="flex items-center gap-3 mb-3">
          <Globe className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <span className="text-sm font-medium">Answer Language</span>
            <p className="text-xs text-muted-foreground">
              AI will respond in this language
            </p>
          </div>
        </div>

        <Select value={value} onValueChange={handleSelect}>
          <SelectTrigger className="w-full">
            <SelectValue>{currentLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {ANSWER_LANGUAGES.map((lang) => {
              const isLocked = !lang.free && !isPremium;
              return (
                <SelectItem
                  key={lang.code}
                  value={lang.code}
                  className="flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    {lang.label}
                    {isLocked && <span className="text-xs">🔒</span>}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Pro Upsell Dialog */}
      <Dialog open={showUpsell} onOpenChange={setShowUpsell}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Pro Feature
            </DialogTitle>
            <DialogDescription>
              This language is available with StudyBro Pro. Upgrade to unlock
              all 24+ answer languages.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowUpsell(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setShowUpsell(false);
                navigate("/premium");
              }}
            >
              Upgrade
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
