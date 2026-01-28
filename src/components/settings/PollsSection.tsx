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
  Check, 
  X, 
  Vote,
  Eye,
  EyeOff,
  Lock,
  Clock,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PollImageUpload } from "@/components/polls/PollImageUpload";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface PollOption {
  text: string;
  votes: number;
  imageUrl?: string | null;
}

interface Poll {
  id: string;
  title: string;
  description: string | null;
  options: PollOption[];
  is_public: boolean;
  created_at: string;
  ends_at: string | null;
  total_votes: number;
  views_count?: number;
  image_url?: string | null;
}

interface PollAnalytics {
  poll_id: string;
  total_views: number;
  unique_views: number;
  total_votes: number;
  total_conversions: number;
  vote_distribution: Record<string, number>;
  conversion_targets: Record<string, number>;
  unique_voters: number;
  premium_votes: number;
  free_votes: number;
  engagement_rate: number;
}

// Generate or retrieve persistent device ID
const getDeviceId = (): string => {
  const DEVICE_ID_KEY = "studybro_device_id";
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

// Get voter ID - requires authenticated user
const getVoterId = (userId?: string): string | null => {
  return userId || null;
};

// Check if poll has expired
const isPollExpired = (endsAt: string | null): boolean => {
  if (!endsAt) return false;
  return new Date(endsAt) < new Date();
};

// Get time remaining text
const getTimeRemaining = (endsAt: string | null): string | null => {
  if (!endsAt) return null;
  const end = new Date(endsAt);
  const now = new Date();
  
  if (end < now) return "Expired";
  
  const diffMs = end.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h left`;
  if (diffHours > 0) return `${diffHours}h left`;
  
  const diffMins = Math.floor(diffMs / (1000 * 60));
  return `${diffMins}m left`;
};

interface NewPollOption {
  text: string;
  imageUrl: string | null;
}

export function PollsSection() {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [votedPolls, setVotedPolls] = useState<Record<string, number>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [pollAnalytics, setPollAnalytics] = useState<Record<string, PollAnalytics>>({});
  const [userIsPremium, setUserIsPremium] = useState(false);
  const [deviceId] = useState(() => getDeviceId());
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  
  // Admin state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPoll, setNewPoll] = useState<{
    title: string;
    description: string;
    options: NewPollOption[];
    is_public: boolean;
    timeLimit: "none" | "24h" | "3d" | "7d";
    imageUrl: string | null;
  }>({
    title: "",
    description: "",
    options: [{ text: "", imageUrl: null }, { text: "", imageUrl: null }],
    is_public: true,
    timeLimit: "none",
    imageUrl: null
  });
  
  // Fetch user premium status
  useEffect(() => {
    const fetchPremiumStatus = async () => {
      if (!user?.id) {
        setUserIsPremium(false);
        return;
      }
      try {
        const { data } = await supabase
          .from("profiles")
          .select("is_premium")
          .eq("user_id", user.id)
          .maybeSingle();
        setUserIsPremium(data?.is_premium ?? false);
      } catch {
        setUserIsPremium(false);
      }
    };
    fetchPremiumStatus();
  }, [user?.id]);

  // Track unique poll view using poll_views table
  const trackPollView = async (pollId: string) => {
    try {
      // Use the RPC function to record unique view
      await supabase.rpc('record_poll_view', {
        poll_id_param: pollId,
        user_id_param: user?.id || null,
        device_id_param: deviceId
      });
    } catch (error) {
      console.error("Error tracking poll view:", error);
    }
  };

  // Track poll vote for analytics
  const trackPollVote = async (pollId: string, optionIndex: number) => {
    if (!user?.id) return;
    try {
      await supabase.from("poll_analytics").insert({
        poll_id: pollId,
        event_type: "vote",
        user_id: user.id,
        option_index: optionIndex
      });
    } catch (error) {
      console.error("Error tracking poll vote:", error);
    }
  };

  // Fetch analytics for admin - always returns data (zeros if none)
  const fetchPollAnalytics = async (pollId: string) => {
    if (!isAdmin) return;
    try {
      const { data, error } = await supabase.rpc('get_poll_analytics', {
        poll_id_param: pollId
      });
      
      // Always set analytics, use defaults if null/error
      const defaultAnalytics: PollAnalytics = {
        poll_id: pollId,
        total_views: 0,
        unique_views: 0,
        total_votes: 0,
        total_conversions: 0,
        vote_distribution: {},
        conversion_targets: {},
        unique_voters: 0,
        premium_votes: 0,
        free_votes: 0,
        engagement_rate: 0
      };
      
      if (!error && data) {
        setPollAnalytics(prev => ({ 
          ...prev, 
          [pollId]: { ...defaultAnalytics, ...data as unknown as PollAnalytics }
        }));
      } else {
        // Set zeros if no data
        setPollAnalytics(prev => ({ ...prev, [pollId]: defaultAnalytics }));
      }
    } catch (error) {
      console.error("Error fetching poll analytics:", error);
      // Still show zeros on error
      setPollAnalytics(prev => ({ 
        ...prev, 
        [pollId]: {
          poll_id: pollId,
          total_views: 0,
          unique_views: 0,
          total_votes: 0,
          total_conversions: 0,
          vote_distribution: {},
          conversion_targets: {},
          unique_voters: 0,
          premium_votes: 0,
          free_votes: 0,
          engagement_rate: 0
        }
      }));
    }
  };

  useEffect(() => {
    fetchPolls();
  }, [isAdmin]);

  // Load user votes from database when user or polls change
  useEffect(() => {
    loadUserVotes();
  }, [user?.id, polls, deviceId]);

  // Check admin status via edge function (server-side validation)
  useEffect(() => {
    const checkAdminStatus = async () => {
      setCheckingAdmin(true);
      
      if (!user) {
        setIsAdmin(false);
        setCheckingAdmin(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          setIsAdmin(false);
          setCheckingAdmin(false);
          return;
        }

        const response = await supabase.functions.invoke("check-poll-admin", {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        setIsAdmin(response.data?.isAdmin === true);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Load user's votes from database (server-side source of truth)
  // Also checks device-based votes for additional security
  const loadUserVotes = async () => {
    if (polls.length === 0) return;
    
    try {
      const votes: Record<string, number> = {};
      
      // Fetch votes for all polls - check both user_id and device_id
      for (const poll of polls) {
        // First check by user ID if logged in
        if (user?.id) {
          const { data, error } = await supabase.rpc('get_user_vote', {
            poll_id_param: poll.id,
            voter_id_param: user.id
          });
          
          if (!error && data !== null) {
            votes[poll.id] = data;
            continue;
          }
        }
        
        // Also check by device_id using check_vote_exists
        const { data: exists } = await supabase.rpc('check_vote_exists', {
          poll_id_param: poll.id,
          voter_id_param: user?.id || '',
          device_id_param: deviceId
        });
        
        // If device has voted, we need to fetch what option was chosen
        // For now, just mark as voted (will show results view)
        if (exists) {
          // Device has voted but we don't know which option
          // This is a fallback - user should be logged in to vote
        }
      }
      
      setVotedPolls(votes);
    } catch (error) {
      console.error("Error loading user votes:", error);
    }
  };

  const fetchPolls = async () => {
    try {
      // Use public_polls view to avoid exposing creator email addresses
      const { data, error } = await supabase
        .from("public_polls")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Parse options and fetch actual vote counts from database
      const parsedPolls = await Promise.all((data || []).map(async poll => {
        const options = poll.options as unknown as PollOption[];
        
        // Fetch actual vote counts from poll_votes table
        const { data: voteCounts } = await supabase.rpc('get_poll_vote_counts', {
          poll_id_param: poll.id
        });
        
        // Update options with real vote counts
        const updatedOptions = options.map((opt, idx) => {
          const countEntry = (voteCounts as { option_index: number; count: number }[] || [])
            .find(c => c.option_index === idx);
          return {
            ...opt,
            votes: countEntry?.count || 0
          };
        });
        
        const totalVotes = updatedOptions.reduce((sum, opt) => sum + opt.votes, 0);
        
        // Track view for analytics
        if (user?.id && poll.id) {
          trackPollView(poll.id);
        }
        
        return {
          ...poll,
          id: poll.id!,
          title: poll.title!,
          description: poll.description,
          options: updatedOptions,
          is_public: poll.is_public!,
          created_at: poll.created_at!,
          ends_at: poll.ends_at,
          total_votes: totalVotes,
          image_url: (poll as unknown as { image_url?: string | null }).image_url || null
        };
      }));
      
      setPolls(parsedPolls);
      
      // Fetch analytics for admin
      if (isAdmin) {
        parsedPolls.forEach(poll => fetchPollAnalytics(poll.id));
      }
    } catch (error) {
      console.error("Error fetching polls:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId: string, optionIndex: number) => {
    // Require authentication to vote
    if (!user?.id) {
      toast.error("Sign in to use History, Quizzes, and Polls.");
      return;
    }

    const poll = polls.find(p => p.id === pollId);
    if (!poll) {
      toast.error("Poll not found");
      return;
    }
    
    // Check if expired
    if (isPollExpired(poll.ends_at)) {
      toast.error("This poll has expired");
      return;
    }
    
    // Check if already voted (prevent double voting)
    const previousVote = votedPolls[pollId];
    if (previousVote !== undefined && previousVote === optionIndex) {
      // Same option - no change needed
      return;
    }

    try {
      // Check if user or device already voted using RPC
      const { data: alreadyVoted } = await supabase.rpc('check_vote_exists', {
        poll_id_param: pollId,
        voter_id_param: user.id,
        device_id_param: deviceId
      });

      if (alreadyVoted && previousVote === undefined) {
        // Device has already voted on a different account
        toast.error("This device has already voted on this poll");
        return;
      }

      // Insert or update vote with device_id and premium status
      const { error: voteError } = await supabase
        .from("poll_votes")
        .upsert({
          poll_id: pollId,
          voter_id: user.id,
          device_id: deviceId,
          option_index: optionIndex,
          is_premium: userIsPremium
        }, {
          onConflict: 'poll_id,voter_id'
        });

      if (voteError) {
        // Check if it's a device duplicate constraint violation
        if (voteError.code === '23505' && voteError.message?.includes('device')) {
          toast.error("This device has already voted on this poll");
          return;
        }
        throw voteError;
      }

      // Track vote in analytics
      await trackPollVote(pollId, optionIndex);

      // Fetch updated vote counts from database using RPC function
      const { data: voteCounts, error: countsError } = await supabase.rpc('get_poll_vote_counts', {
        poll_id_param: pollId
      });

      if (countsError) {
        console.error("Error fetching vote counts:", countsError);
      }

      // Calculate new totals and update local state
      const updatedOptions = poll.options.map((opt, idx) => {
        const countEntry = (voteCounts as { option_index: number; count: number }[] || [])
          .find(c => c.option_index === idx);
        return {
          ...opt,
          votes: countEntry?.count || 0
        };
      });

      const newTotalVotes = updatedOptions.reduce((sum, opt) => sum + opt.votes, 0);

      // Update local state immediately for responsive UI
      setPolls(prev => prev.map(p => 
        p.id === pollId 
          ? { ...p, options: updatedOptions, total_votes: newTotalVotes }
          : p
      ));

      // Update voted polls state
      setVotedPolls(prev => ({ ...prev, [pollId]: optionIndex }));
      
      // Refresh analytics for admin
      if (isAdmin) {
        fetchPollAnalytics(pollId);
      }
      
      toast.success(previousVote !== undefined ? "Vote changed!" : "Vote recorded!");
    } catch (error) {
      console.error("Vote error:", error);
      toast.error("Failed to record vote");
    }
  };

  const getEndsAt = (timeLimit: string): string | null => {
    if (timeLimit === "none") return null;
    
    const now = new Date();
    switch (timeLimit) {
      case "24h":
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      case "3d":
        return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
      case "7d":
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return null;
    }
  };

  const handleCreatePoll = async () => {
    if (!isAdmin) {
      toast.error("You do not have permission to manage polls");
      return;
    }

    if (!newPoll.title.trim() || newPoll.options.filter(o => o.text.trim()).length < 2) {
      toast.error("Please provide a title and at least 2 options");
      return;
    }

    try {
      const options = newPoll.options
        .filter(o => o.text.trim())
        .map(opt => ({ 
          text: opt.text.trim(), 
          votes: 0,
          imageUrl: opt.imageUrl || null
        }));

      const { error } = await supabase
        .from("polls")
        .insert({
          title: newPoll.title.trim(),
          description: newPoll.description.trim() || null,
          options,
          is_public: newPoll.is_public,
          created_by: user?.email || "admin",
          ends_at: getEndsAt(newPoll.timeLimit),
          image_url: newPoll.imageUrl || null
        });

      if (error) throw error;

      toast.success("Poll created!");
      setNewPoll({ 
        title: "", 
        description: "", 
        options: [{ text: "", imageUrl: null }, { text: "", imageUrl: null }], 
        is_public: true, 
        timeLimit: "none",
        imageUrl: null
      });
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
      setNewPoll(prev => ({ 
        ...prev, 
        options: [...prev.options, { text: "", imageUrl: null }] 
      }));
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

  const updateOptionText = (index: number, value: string) => {
    setNewPoll(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => 
        i === index ? { ...opt, text: value } : opt
      )
    }));
  };

  const updateOptionImage = (index: number, imageUrl: string | null) => {
    setNewPoll(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => 
        i === index ? { ...opt, imageUrl } : opt
      )
    }));
  };

  const handleMainImageError = (pollId: string) => {
    setImageErrors(prev => ({ ...prev, [pollId]: true }));
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
            <div className="p-4 sm:p-5 bg-card rounded-xl border border-primary/30 space-y-4">
              {/* Poll Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Poll Title</label>
                <Input
                  placeholder="What do you want to ask?"
                  value={newPoll.title}
                  onChange={(e) => setNewPoll(prev => ({ ...prev, title: e.target.value }))}
                  className="h-10"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
                <Textarea
                  placeholder="Add more context..."
                  value={newPoll.description}
                  onChange={(e) => setNewPoll(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Main Poll Image */}
              <PollImageUpload
                imageUrl={newPoll.imageUrl}
                onImageChange={(url) => setNewPoll(prev => ({ ...prev, imageUrl: url }))}
                label="Poll Image (optional)"
              />
              
              {/* Options */}
              <div className="space-y-2.5">
                <label className="text-xs font-medium text-muted-foreground">Options</label>
                {newPoll.options.map((opt, index) => (
                  <div key={index} className="p-3 bg-muted/20 rounded-lg space-y-2 border border-border/50">
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-muted-foreground w-5 shrink-0">{index + 1}.</span>
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={opt.text}
                        onChange={(e) => updateOptionText(index, e.target.value)}
                        className="flex-1 h-9"
                      />
                      {newPoll.options.length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeOption(index)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="pl-5">
                      <PollImageUpload
                        imageUrl={opt.imageUrl}
                        onImageChange={(url) => updateOptionImage(index, url)}
                        label="Option image (optional)"
                        aspectRatio={16 / 9}
                      />
                    </div>
                  </div>
                ))}
                {newPoll.options.length < 6 && (
                  <Button variant="ghost" size="sm" onClick={addOption} className="h-8 text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add option
                  </Button>
                )}
              </div>

              {/* Duration & Visibility Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Duration Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Duration
                  </label>
                  <Select
                    value={newPoll.timeLimit}
                    onValueChange={(value: "none" | "24h" | "3d" | "7d") => 
                      setNewPoll(prev => ({ ...prev, timeLimit: value }))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No limit</SelectItem>
                      <SelectItem value="24h">24 hours</SelectItem>
                      <SelectItem value="3d">3 days</SelectItem>
                      <SelectItem value="7d">7 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Visibility Toggle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Visibility</label>
                  <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background">
                    <Switch
                      checked={newPoll.is_public}
                      onCheckedChange={(checked) => 
                        setNewPoll(prev => ({ ...prev, is_public: checked }))
                      }
                      className="scale-90"
                    />
                    <span className="text-sm">
                      {newPoll.is_public ? "Public" : "Private"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Create Button */}
              <Button onClick={handleCreatePoll} className="w-full h-10">
                <Check className="w-4 h-4 mr-1.5" /> Create Poll
              </Button>
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
            const expired = isPollExpired(poll.ends_at);
            const timeRemaining = getTimeRemaining(poll.ends_at);
            const mainImageError = imageErrors[poll.id];
            
            return (
              <motion.div
                key={poll.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 bg-card rounded-xl border ${expired ? "border-muted opacity-75" : "border-border"}`}
              >
                {/* Poll Main Image */}
                {poll.image_url && (
                  <div className="mb-4 -mx-4 -mt-4">
                    {mainImageError ? (
                      <div className="w-full h-32 bg-muted flex items-center justify-center text-muted-foreground rounded-t-xl">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        <span className="text-sm">Image unavailable</span>
                      </div>
                    ) : (
                      <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-t-xl">
                        <img 
                          src={poll.image_url} 
                          alt={poll.title}
                          className="w-full h-full object-cover"
                          onError={() => handleMainImageError(poll.id)}
                        />
                      </AspectRatio>
                    )}
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{poll.title}</h4>
                    {poll.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {poll.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Time remaining - only show to admin */}
                    {isAdmin && timeRemaining && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        expired 
                          ? "bg-destructive/10 text-destructive" 
                          : "bg-primary/10 text-primary"
                      }`}>
                        <Clock className="w-3 h-3 inline mr-1" />
                        {timeRemaining}
                      </span>
                    )}
                    
                    {isAdmin && (
                      <>
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
                      </>
                    )}
                  </div>
                </div>

                {/* Admin Analytics Display - Always show for admin with zeros if no data */}
                {isAdmin && (
                  <div className="mb-3 p-2 bg-primary/5 rounded-lg border border-primary/20 space-y-2">
                    <div className="text-xs text-muted-foreground grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <div className="font-medium text-primary">
                          {pollAnalytics[poll.id]?.unique_views ?? 0}
                        </div>
                        <div>Unique Views</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-primary">
                          {pollAnalytics[poll.id]?.unique_voters ?? 0}
                        </div>
                        <div>Unique Voters</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-primary">
                          {pollAnalytics[poll.id]?.total_conversions ?? 0}
                        </div>
                        <div>Conversions</div>
                      </div>
                    </div>
                    {/* Premium vs Free vote breakdown + Engagement Rate */}
                    <div className="text-xs text-muted-foreground grid grid-cols-3 gap-2 pt-1 border-t border-primary/10">
                      <div className="text-center">
                        <div className="font-medium text-green-500">
                          {pollAnalytics[poll.id]?.premium_votes ?? 0}
                        </div>
                        <div>Premium</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-muted-foreground">
                          {pollAnalytics[poll.id]?.free_votes ?? 0}
                        </div>
                        <div>Free</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-blue-500">
                          {pollAnalytics[poll.id]?.engagement_rate ?? 0}%
                        </div>
                        <div>Engagement</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expired badge for non-admin */}
                {expired && !isAdmin && (
                  <div className="mb-3 text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    This poll has ended
                  </div>
                )}

                {/* Options */}
                <div className="space-y-2">
                  {poll.options.map((option, optIndex) => {
                    const percentage = poll.total_votes > 0 
                      ? Math.round((option.votes / poll.total_votes) * 100)
                      : 0;
                    const isSelected = votedOption === optIndex;
                    const optionImageErrorKey = `${poll.id}-opt-${optIndex}`;
                    const optionImageError = imageErrors[optionImageErrorKey];

                    return (
                      <button
                        key={optIndex}
                        onClick={() => !expired && handleVote(poll.id, optIndex)}
                        disabled={expired}
                        className={`w-full p-3 rounded-lg text-left transition-all relative overflow-hidden ${
                          expired
                            ? isSelected
                              ? "bg-primary/10 border border-primary/50"
                              : "bg-muted/30 border border-transparent cursor-not-allowed"
                            : hasVoted
                              ? isSelected
                                ? "bg-primary/20 border border-primary"
                                : "bg-muted/50 border border-transparent hover:border-primary/30 cursor-pointer"
                              : "bg-muted/30 border border-border hover:border-primary/50 cursor-pointer"
                        }`}
                      >
                        {(hasVoted || expired) && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5 }}
                            className={`absolute inset-y-0 left-0 ${
                              isSelected ? "bg-primary/20" : "bg-muted/50"
                            }`}
                          />
                        )}
                        <div className="relative">
                          {/* Option Image */}
                          {option.imageUrl && (
                            <div className="mb-2">
                              {optionImageError ? (
                                <div className="w-full h-16 bg-muted/50 rounded flex items-center justify-center text-muted-foreground">
                                  <AlertCircle className="w-4 h-4 mr-1" />
                                  <span className="text-xs">Image unavailable</span>
                                </div>
                              ) : (
                                <img 
                                  src={option.imageUrl} 
                                  alt={option.text}
                                  className="w-full h-20 object-cover rounded"
                                  onError={() => setImageErrors(prev => ({ 
                                    ...prev, 
                                    [optionImageErrorKey]: true 
                                  }))}
                                />
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className={`flex items-center gap-2 ${isSelected ? "font-medium" : ""}`}>
                              {option.text}
                              {isSelected && hasVoted && !expired && (
                                <RefreshCw className="w-3 h-3 text-primary" />
                              )}
                            </span>
                            {(hasVoted || expired) && (
                              <span className="text-sm text-muted-foreground">
                                {percentage}% ({option.votes})
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 text-xs text-muted-foreground text-center">
                  {poll.total_votes} vote{poll.total_votes !== 1 ? "s" : ""}
                  {hasVoted && !expired && " • Tap to change vote"}
                  {hasVoted && expired && " • You voted"}
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
          Only ApexWave Studios can create and manage polls
        </div>
      )}
    </div>
  );
}
