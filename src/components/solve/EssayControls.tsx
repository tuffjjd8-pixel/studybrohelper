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
import { ChevronDown } from "lucide-react";
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
}

export function EssayControls({ settings, onChange }: EssayControlsProps) {
  const [open, setOpen] = useState(true);

  const update = (partial: Partial<EssaySettings>) =>
    onChange({ ...settings, ...partial });

  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  const sliderIndex = SLIDER_TO_PRESET.indexOf(settings.lengthPreset);

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
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          </CollapsibleTrigger>

          <CollapsibleContent className="px-4 pb-4 space-y-4">
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
                  <SelectItem value="high-school">High School</SelectItem>
                  <SelectItem value="college">College</SelectItem>
                  <SelectItem value="university">University</SelectItem>
                  <SelectItem value="custom">Custom Grade</SelectItem>
                </SelectContent>
              </Select>
              {settings.academicLevel === "custom" && (
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
                max={10}
                value={settings.paragraphCount}
                onChange={(e) =>
                  update({ paragraphCount: clamp(parseInt(e.target.value) || 4, 1, 10) })
                }
              />
              <p className="text-xs text-muted-foreground">1–10 paragraphs</p>
            </div>

            {/* Sentences Per Paragraph */}
            <div className="space-y-1.5">
              <Label className="text-sm">Sentences per Paragraph</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={settings.sentencesPerParagraph}
                onChange={(e) =>
                  update({ sentencesPerParagraph: clamp(parseInt(e.target.value) || 5, 1, 10) })
                }
              />
              <p className="text-xs text-muted-foreground">1–10 sentences</p>
            </div>

            {/* Length */}
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

            {/* Tone */}
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

            {/* Remove Greeting */}
            <div className="flex items-center justify-between">
              <Label className="text-sm cursor-pointer">
                Start essay without greetings
              </Label>
              <Switch
                checked={settings.removeGreeting}
                onCheckedChange={(v) => update({ removeGreeting: v })}
              />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </motion.div>
  );
}
