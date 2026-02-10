import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Target, Trash2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ADMIN_EMAIL = "apexwavesstudios@gmail.com";

interface GoalContent {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  visible: boolean;
}

interface CommunityGoalEditorProps {
  userEmail: string | undefined;
}

export const CommunityGoalEditor = ({ userEmail }: CommunityGoalEditorProps) => {
  const [goal, setGoal] = useState<GoalContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isAdmin = userEmail === ADMIN_EMAIL;

  useEffect(() => {
    if (isAdmin) fetchGoal();
  }, [isAdmin]);

  if (!isAdmin) return null;

  const fetchGoal = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("community_goal_content")
      .select("id, title, body, image_url, visible")
      .limit(1)
      .maybeSingle();

    if (data) setGoal(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!goal) return;
    setSaving(true);
    const { error } = await supabase
      .from("community_goal_content")
      .update({
        title: goal.title,
        body: goal.body,
        image_url: goal.image_url,
        visible: goal.visible,
        updated_at: new Date().toISOString(),
      })
      .eq("id", goal.id);

    if (error) {
      toast.error("Failed to save community goal");
    } else {
      toast.success("Community goal updated!");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!goal) return;
    const { error } = await supabase
      .from("community_goal_content")
      .delete()
      .eq("id", goal.id);

    if (error) {
      toast.error("Failed to delete");
    } else {
      setGoal(null);
      toast.success("Community goal deleted");
    }
  };

  const handleCreate = async () => {
    const { data, error } = await supabase
      .from("community_goal_content")
      .insert({ title: "🎯 New Goal", body: "Edit this goal!", visible: false })
      .select("id, title, body, image_url, visible")
      .single();

    if (error) {
      toast.error("Failed to create goal");
    } else if (data) {
      setGoal(data);
      toast.success("Community goal created");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !goal) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Images only");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `community-goal/${goal.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      setGoal({ ...goal, image_url: publicUrl });
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-card rounded-xl border border-border text-center text-muted-foreground text-sm">
        Loading community goal...
      </div>
    );
  }

  if (!goal) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Button onClick={handleCreate} variant="outline" className="w-full">
          <Target className="w-4 h-4 mr-2" />
          Create Community Goal
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 text-primary">
        <Target className="w-5 h-5" />
        <h3 className="font-heading font-bold text-lg">Community Goal Editor</h3>
      </div>

      <div className="p-4 bg-card rounded-xl border border-border space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Title (emoji-friendly)</label>
          <Input
            value={goal.title}
            onChange={(e) => setGoal({ ...goal, title: e.target.value })}
            placeholder="🎯 Community Goal"
            className="bg-background"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Body (multiline, emoji-friendly)</label>
          <Textarea
            value={goal.body}
            onChange={(e) => setGoal({ ...goal, body: e.target.value })}
            placeholder="Help us reach 1,000 solves!"
            className="bg-background min-h-[80px]"
          />
        </div>

        {goal.image_url && (
          <div className="relative">
            <img src={goal.image_url} alt="Goal" className="rounded-lg max-h-32 object-cover" />
            <button
              onClick={() => setGoal({ ...goal, image_url: null })}
              className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <ImagePlus className="w-4 h-4 mr-1" />
            {uploading ? "Uploading..." : "Add Image"}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

          <label className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
            <Switch
              checked={goal.visible}
              onCheckedChange={(v) => setGoal({ ...goal, visible: v })}
            />
            Visible
          </label>
        </div>

        <div className="flex gap-2 pt-2 border-t border-border">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "Saving..." : "Save Goal"}
          </Button>
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
