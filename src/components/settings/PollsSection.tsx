import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  BarChart3, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Vote,
  Eye,
  EyeOff,
  Lock
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Poll {
  id: string;
  title: string;
  description: string | null;
  options: { text: string; votes: number }[];
  is_public: boolean;
  created_by: string;
  created_at: string;
  total_votes: number;
}

const ADMIN_EMAIL = "apexwavesstudios@gmail.com";

// Generate or get a persistent anonymous voter ID
const getVoterId = (userId?: string) => {
  if (userId) return userId;
  
  let anonId = localStorage.getItem("anon_voter_id");
  if (!anonId) {
    anonId = `anon_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem("anon_voter_id", anonId);
  }
  return anonId;
};

export function PollsSection() {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [votedPolls, setVotedPolls] = useState<Record<string, number>>({});
  
  // Admin state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
  const [newPoll, setNewPoll] = useState({
    title: "",
    description: "",
    options: ["", ""],
    is_public: true
  });
  
  const isAdmin = user?.email === ADMIN_EMAIL;
  const voterId = getVoterId(user?.id);

  useEffect(() => {
    fetchPolls();
    loadVotedPolls();
  }, []);

  const loadVotedPolls = () => {
    const stored = localStorage.getItem("voted_polls");
    if (stored) {
      setVotedPolls(JSON.parse(stored));
    }
  };

  const saveVotedPolls = (votes: Record<string, number>) => {
    localStorage.setItem("voted_polls", JSON.stringify(votes));
    setVotedPolls(votes);
  };

  const fetchPolls = async () => {
    try {
      const { data, error } = await supabase
        .from("polls")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Parse options from JSONB
      const parsedPolls = (data || []).map(poll => ({
        ...poll,
        options: poll.options as { text: string; votes: number }[]
      }));
      
      setPolls(parsedPolls);
    } catch (error) {
      console.error("Error fetching polls:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (votedPolls[pollId] !== undefined) {
      toast.error("You've already voted on this poll");
      return;
    }

    try {
      // Update the poll options with new vote count
      const poll = polls.find(p => p.id === pollId);
      if (!poll) return;

      const updatedOptions = poll.options.map((opt, idx) => ({
        ...opt,
        votes: idx === optionIndex ? opt.votes + 1 : opt.votes
      }));

      const { error: updateError } = await supabase
        .from("polls")
        .update({ 
          options: updatedOptions,
          total_votes: poll.total_votes + 1
        })
        .eq("id", pollId);

      if (updateError) throw updateError;

      // Record the vote
      const { error: voteError } = await supabase
        .from("poll_votes")
        .insert({
          poll_id: pollId,
          voter_id: voterId,
          option_index: optionIndex
        });

      if (voteError && !voteError.message.includes("duplicate")) {
        throw voteError;
      }

      // Update local state
      setPolls(prev => prev.map(p => 
        p.id === pollId 
          ? { ...p, options: updatedOptions, total_votes: p.total_votes + 1 }
          : p
      ));

      saveVotedPolls({ ...votedPolls, [pollId]: optionIndex });
      toast.success("Vote recorded!");
    } catch (error) {
      console.error("Vote error:", error);
      toast.error("Failed to record vote");
    }
  };

  const handleCreatePoll = async () => {
    if (!isAdmin) {
      toast.error("You do not have permission to manage polls");
      return;
    }

    if (!newPoll.title.trim() || newPoll.options.filter(o => o.trim()).length < 2) {
      toast.error("Please provide a title and at least 2 options");
      return;
    }

    try {
      const options = newPoll.options
        .filter(o => o.trim())
        .map(text => ({ text: text.trim(), votes: 0 }));

      const { error } = await supabase
        .from("polls")
        .insert({
          title: newPoll.title.trim(),
          description: newPoll.description.trim() || null,
          options,
          is_public: newPoll.is_public,
          created_by: user?.email || "admin"
        });

      if (error) throw error;

      toast.success("Poll created!");
      setNewPoll({ title: "", description: "", options: ["", ""], is_public: true });
      setShowCreateForm(false);
      fetchPolls();
    } catch (error) {
      console.error("Create poll error:", error);
      toast.error("Failed to create poll");
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!isAdmin) {
      toast.error("You do not have permission to manage polls");
      return;
    }

    try {
      const { error } = await supabase
        .from("polls")
        .delete()
        .eq("id", pollId);

      if (error) throw error;

      setPolls(prev => prev.filter(p => p.id !== pollId));
      toast.success("Poll deleted");
    } catch (error) {
      toast.error("Failed to delete poll");
    }
  };

  const handleToggleVisibility = async (pollId: string, isPublic: boolean) => {
    if (!isAdmin) {
      toast.error("You do not have permission to manage polls");
      return;
    }

    try {
      const { error } = await supabase
        .from("polls")
        .update({ is_public: isPublic })
        .eq("id", pollId);

      if (error) throw error;

      if (!isPublic) {
        setPolls(prev => prev.filter(p => p.id !== pollId));
      }
      toast.success(isPublic ? "Poll made public" : "Poll hidden");
      fetchPolls();
    } catch (error) {
      toast.error("Failed to update poll visibility");
    }
  };

  const addOption = () => {
    if (newPoll.options.length < 6) {
      setNewPoll(prev => ({ ...prev, options: [...prev.options, ""] }));
    }
  };

  const removeOption = (index: number) => {
    if (newPoll.options.length > 2) {
      setNewPoll(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  const updateOption = (index: number, value: string) => {
    setNewPoll(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  if (loading) {
    return (
      <div className="p-4 bg-card rounded-xl border border-border">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-bold">Community Polls</h3>
        </div>
        
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showCreateForm ? "Cancel" : "New Poll"}
          </Button>
        )}
      </div>

      {/* Admin Create Form */}
      <AnimatePresence>
        {showCreateForm && isAdmin && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-card rounded-xl border border-primary/30 space-y-4">
              <Input
                placeholder="Poll title..."
                value={newPoll.title}
                onChange={(e) => setNewPoll(prev => ({ ...prev, title: e.target.value }))}
              />
              <Textarea
                placeholder="Description (optional)..."
                value={newPoll.description}
                onChange={(e) => setNewPoll(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
              
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Options</label>
                {newPoll.options.map((opt, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={opt}
                      onChange={(e) => updateOption(index, e.target.value)}
                    />
                    {newPoll.options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {newPoll.options.length < 6 && (
                  <Button variant="ghost" size="sm" onClick={addOption}>
                    <Plus className="w-4 h-4 mr-1" /> Add option
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newPoll.is_public}
                    onCheckedChange={(checked) => 
                      setNewPoll(prev => ({ ...prev, is_public: checked }))
                    }
                  />
                  <span className="text-sm">
                    {newPoll.is_public ? "Public" : "Private"}
                  </span>
                </div>
                <Button onClick={handleCreatePoll}>
                  <Check className="w-4 h-4 mr-1" /> Create Poll
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Polls list */}
      {polls.length === 0 ? (
        <div className="p-8 bg-card/50 rounded-xl border border-dashed border-border text-center">
          <Vote className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No polls available yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map((poll, index) => {
            const hasVoted = votedPolls[poll.id] !== undefined;
            const votedOption = votedPolls[poll.id];
            
            return (
              <motion.div
                key={poll.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-card rounded-xl border border-border"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{poll.title}</h4>
                    {poll.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {poll.description}
                      </p>
                    )}
                  </div>
                  
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleVisibility(poll.id, !poll.is_public)}
                      >
                        {poll.is_public ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePoll(poll.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Options */}
                <div className="space-y-2">
                  {poll.options.map((option, optIndex) => {
                    const percentage = poll.total_votes > 0 
                      ? Math.round((option.votes / poll.total_votes) * 100)
                      : 0;
                    const isSelected = votedOption === optIndex;

                    return (
                      <button
                        key={optIndex}
                        onClick={() => !hasVoted && handleVote(poll.id, optIndex)}
                        disabled={hasVoted}
                        className={`w-full p-3 rounded-lg text-left transition-all relative overflow-hidden ${
                          hasVoted
                            ? isSelected
                              ? "bg-primary/20 border border-primary"
                              : "bg-muted/50 border border-transparent"
                            : "bg-muted/30 border border-border hover:border-primary/50 cursor-pointer"
                        }`}
                      >
                        {hasVoted && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5 }}
                            className={`absolute inset-y-0 left-0 ${
                              isSelected ? "bg-primary/20" : "bg-muted/50"
                            }`}
                          />
                        )}
                        <div className="relative flex items-center justify-between">
                          <span className={isSelected ? "font-medium" : ""}>
                            {option.text}
                          </span>
                          {hasVoted && (
                            <span className="text-sm text-muted-foreground">
                              {percentage}% ({option.votes})
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 text-xs text-muted-foreground text-center">
                  {poll.total_votes} vote{poll.total_votes !== 1 ? "s" : ""}
                  {hasVoted && " • You voted"}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Non-admin permission message */}
      {!isAdmin && user && (
        <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" />
          Only ApexWav can create and manage polls
        </div>
      )}
    </div>
  );
}