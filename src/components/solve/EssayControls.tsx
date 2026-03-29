import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Crown, Lock } from "lucide-react";
import { useState } from "react";

export type LengthPreset = "short" | "medium" | "long" | "custom";

export interface EssaySettings {
  academicLevel: string;
  customGrade: string;
  paragraphCount: number;
  sentencesPerParagraph: number;
  tone: string;
  removeGreeting: boolean;
  lengthPreset: LengthPreset;
  customWordCount: number;
}

export const DEFAULT_ESSAY_SETTINGS: EssaySettings = {
  academicLevel: "elementary",
  customGrade: "",
  paragraphCount: 5,
  sentencesPerParagraph: 5,
  tone: "simple",
  removeGreeting: true,
  lengthPreset: "short",
  customWordCount: 200,
};

export const DEFAULT_PRO_ESSAY_SETTINGS: EssaySettings = {
  academicLevel: "high-school",
  customGrade: "",
  paragraphCount: 4,
  sentencesPerParagraph: 5,
  tone: "standard",
  removeGreeting: true,
  lengthPreset: "medium",
  customWordCount: 200,
};

const LENGTH_LABELS: Record<Exclude<LengthPreset, "custom">, string> = {
  short: "Short (100–150 words)",
  medium: "Medium (150–250 words)",
  long: "Long (250–400 words)",
};

const SLIDER_TO_PRESET: LengthPreset[] = ["short", "medium", "long", "custom"];

interface EssayControlsProps {
  settings: EssaySettings;
  onChange: (settings: EssaySettings) => void;
  isPremium?: boolean;
}

function ProLock({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-1 text-xs text-amber-500">
      <Crown className="w-3 h-3" />
      {label || "Pro"}
    </div>
  );
}

function LockedOverlay() {
  return (
    <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] rounded-lg flex items-center justify-center z-10 cursor-not-allowed">
      <div className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
        <Lock className="w-3.5 h-3.5" />
        Pro Feature
      </div>
    </div>
  );
}

export function EssayControls({ settings, onChange, isPremium = false }: EssayControlsProps) {
  const [open, setOpen] = useState(true);

  const update = (partial: Partial<EssaySettings>) =>
    onChange({ ...settings, ...partial });

  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  const sliderIndex = SLIDER_TO_PRESET.indexOf(settings.lengthPreset);

  // Free user limits
  const maxParagraphs = isPremium ? 10 : 5;
  const maxSentences = isPremium ? 10 : 5;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="glass-card overflow-hidden">
          <CollapsibleTrigger className="w-full flex items-center justify-between p-4 pb-2 hover:bg-muted/30 transition-colors">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Essay Controls
            </h4>
            <div className="flex items-center gap-2">
              {!isPremium && <ProLock label="Limited" />}
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
              />
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="px-4 pb-4 space-y-4">
            {/* Upgrade banner for free users */}
            {!isPremium && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <Crown className="w-3.5 h-3.5 flex-shrink-0" />
                Upgrade to unlock full Essay Controls.
              </div>
            )}

            {/* Academic Level */}
            <div className="space-y-1.5">
              <Label className="text-sm">Academic Level</Label>
              <Select
                value={settings.academicLevel}
                onValueChange={(v) => update({ academicLevel: v, customGrade: v === "custom" ? settings.customGrade : "" })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="elementary">Elementary</SelectItem>
                  <SelectItem value="middle-school">Middle School</SelectItem>
                  {isPremium ? (
                    <>
                      <SelectItem value="high-school">High School</SelectItem>
                      <SelectItem value="college">College</SelectItem>
                      <SelectItem value="university">University</SelectItem>
                      <SelectItem value="custom">Custom Grade</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="high-school" disabled>
                        <span className="flex items-center gap-1.5">High School <Crown className="w-3 h-3 text-amber-400" /></span>
                      </SelectItem>
                      <SelectItem value="college" disabled>
                        <span className="flex items-center gap-1.5">College <Crown className="w-3 h-3 text-amber-400" /></span>
                      </SelectItem>
                      <SelectItem value="university" disabled>
                        <span className="flex items-center gap-1.5">University <Crown className="w-3 h-3 text-amber-400" /></span>
                      </SelectItem>
                      <SelectItem value="custom" disabled>
                        <span className="flex items-center gap-1.5">Custom Grade <Crown className="w-3 h-3 text-amber-400" /></span>
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              {isPremium && settings.academicLevel === "custom" && (
                <Input
                  placeholder="e.g. Grade 9, AP level..."
                  value={settings.customGrade}
                  onChange={(e) => update({ customGrade: e.target.value })}
                  className="mt-1.5"
                />
              )}
            </div>

            {/* Paragraph Count */}
            <div className="space-y-1.5">
              <Label className="text-sm">Paragraphs</Label>
              <Input
                type="number"
                min={1}
                max={maxParagraphs}
                value={settings.paragraphCount}
                onChange={(e) =>
                  update({ paragraphCount: clamp(parseInt(e.target.value) || 1, 1, maxParagraphs) })
                }
              />
              <p className="text-xs text-muted-foreground">1–{maxParagraphs} paragraphs</p>
            </div>

            {/* Sentences Per Paragraph */}
            <div className="space-y-1.5">
              <Label className="text-sm">Sentences per Paragraph</Label>
              <Input
                type="number"
                min={1}
                max={maxSentences}
                value={settings.sentencesPerParagraph}
                onChange={(e) =>
                  update({ sentencesPerParagraph: clamp(parseInt(e.target.value) || 1, 1, maxSentences) })
                }
              />
              <p className="text-xs text-muted-foreground">1–{maxSentences} sentences</p>
            </div>

            {/* Length - Free users only get Short */}
            {isPremium ? (
              <div className="space-y-2">
                <Label className="text-sm">Length</Label>
                <Slider
                  min={0}
                  max={3}
                  step={1}
                  value={[sliderIndex >= 0 ? sliderIndex : 3]}
                  onValueChange={([v]) => {
                    const preset = SLIDER_TO_PRESET[v];
                    update({ lengthPreset: preset });
                  }}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                  <span>Short</span>
                  <span>Medium</span>
                  <span>Long</span>
                  <span>Custom</span>
                </div>
                {settings.lengthPreset !== "custom" && (
                  <p className="text-xs text-muted-foreground">
                    {LENGTH_LABELS[settings.lengthPreset]}
                  </p>
                )}
                {settings.lengthPreset === "custom" && (
                  <div className="space-y-1">
                    <Input
                      type="number"
                      min={50}
                      max={2000}
                      value={settings.customWordCount}
                      onChange={(e) =>
                        update({ customWordCount: clamp(parseInt(e.target.value) || 200, 50, 2000) })
                      }
                      placeholder="Exact word count"
                    />
                    <p className="text-xs text-muted-foreground">50–2000 words</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Length</Label>
                  <ProLock />
                </div>
                <p className="text-xs text-muted-foreground">Short (100–150 words)</p>
                <p className="text-[10px] text-amber-500">Medium, Long & Custom lengths require Pro</p>
              </div>
            )}

            {/* Tone - Free users only get Simple */}
            {isPremium ? (
              <div className="space-y-1.5">
                <Label className="text-sm">Tone</Label>
                <Select
                  value={settings.tone}
                  onValueChange={(v) => update({ tone: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Tone</Label>
                  <ProLock />
                </div>
                <p className="text-xs text-muted-foreground">Simple</p>
                <p className="text-[10px] text-amber-500">Standard, Advanced & Academic tones require Pro</p>
              </div>
            )}

            {/* Remove Greeting - Pro only */}
            {isPremium ? (
              <div className="flex items-center justify-between">
                <Label className="text-sm cursor-pointer">
                  Start essay without greetings
                </Label>
                <Switch
                  checked={settings.removeGreeting}
                  onCheckedChange={(v) => update({ removeGreeting: v })}
                />
              </div>
            ) : (
              <div className="relative">
                <LockedOverlay />
                <div className="flex items-center justify-between opacity-50">
                  <Label className="text-sm">Start essay without greetings</Label>
                  <Switch checked={false} disabled />
                </div>
              </div>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>
    </motion.div>
  );
}
