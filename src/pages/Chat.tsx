import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { ToolsScroller } from "@/components/home/ToolsScroller";
import { FollowUpInput } from "@/components/chat/FollowUpInput";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Bot, User } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface Solve {
  id: string;
  subject: string;
  question_text: string | null;
  solution_markdown: string;
}

const FREE_FOLLOWUP_LIMIT = 2;

const Chat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [solve, setSolve] = useState<Solve | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading) {
      if (user && id) {
        fetchData();
      } else if (!user && id) {
        loadGuestData();
      }
    }
  }, [user, authLoading, id]);

  const loadGuestData = () => {
    try {
      const guestSolves = localStorage.getItem("guest_solves");
      if (guestSolves) {
        const solves = JSON.parse(guestSolves);
        const found = solves.find((s: Solve) => s.id === id);
        if (found) {
          setSolve(found);
          // Load guest chat messages from localStorage
          const guestChats = localStorage.getItem(`guest_chat_${id}`);
          if (guestChats) {
            setMessages(JSON.parse(guestChats));
          }
        } else {
          toast.error("Solve not found");
          navigate("/history");
        }
      } else {
        toast.error("Solve not found");
        navigate("/history");
      }
    } catch (error) {
      console.error("Error loading guest data:", error);
      navigate("/history");
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchData = async () => {
    try {
      const [solveRes, messagesRes, profileRes] = await Promise.all([
        supabase.from("solves").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("chat_messages")
          .select("*")
          .eq("solve_id", id)
          .order("created_at", { ascending: true }),
        user ? supabase.from("profiles").select("is_premium").eq("user_id", user.id).single() : Promise.resolve({ data: null }),
      ]);

      if (solveRes.error) throw solveRes.error;
      if (!solveRes.data) {
        toast.error("Solve not found");
        navigate("/history");
        return;
      }

      const typedMessages = (messagesRes.data || []).map((m) => ({
        ...m,
        role: m.role as "user" | "assistant",
      }));

      setSolve(solveRes.data);
      setMessages(typedMessages);
      if (profileRes.data) setIsPremium(profileRes.data.is_premium);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load chat");
    } finally {
      setPageLoading(false);
    }
  };

  // Count user messages for follow-up limit
  const userMessageCount = messages.filter(m => m.role === "user").length;
  const followUpLimitReached = !isPremium && userMessageCount >= FREE_FOLLOWUP_LIMIT;

  const handleSend = async (message: string) => {
    if (!message.trim() || !solve) return;
    if (followUpLimitReached) {
      toast.error("Follow-up limit reached. Upgrade to Pro for unlimited!");
      return;
    }

    const userMessage = message.trim();
    setIsLoading(true);

    // Optimistic update
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      // Call AI for response
      const { data, error } = await supabase.functions.invoke("follow-up-chat", {
        body: {
          solveId: solve.id,
          message: userMessage,
          context: {
            subject: solve.subject,
            question: solve.question_text,
            solution: solve.solution_markdown,
          },
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;

      const newUserMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userMessage,
        created_at: new Date().toISOString(),
      };

      const newAssistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response,
        created_at: new Date().toISOString(),
      };

      if (user) {
        // Save to database for authenticated users
        const { data: savedUserMsg, error: userMsgError } = await supabase
          .from("chat_messages")
          .insert({
            solve_id: solve.id,
            role: "user",
            content: userMessage,
          })
          .select()
          .single();

        if (userMsgError) throw userMsgError;

        const { data: savedAssistantMsg, error: assistantMsgError } = await supabase
          .from("chat_messages")
          .insert({
            solve_id: solve.id,
            role: "assistant",
            content: data.response,
          })
          .select()
          .single();

        if (assistantMsgError) throw assistantMsgError;

        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          { ...savedUserMsg, role: savedUserMsg.role as "user" | "assistant" },
          { ...savedAssistantMsg, role: savedAssistantMsg.role as "user" | "assistant" },
        ]);
      } else {
        // Save to localStorage for guests
        const updatedMessages = [
          ...messages,
          newUserMsg,
          newAssistantMsg,
        ];
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          newUserMsg,
          newAssistantMsg,
        ]);
        localStorage.setItem(`guest_chat_${id}`, JSON.stringify(updatedMessages));
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header streak={0} totalSolves={0} />

      <main className="flex-1 pt-20 pb-32 px-4 overflow-hidden">
        <div className="max-w-2xl mx-auto h-full flex flex-col">
          <button
            onClick={() => navigate(`/solve/${id}`)}
            className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Solution
          </button>

          {/* Context card */}
          <div className="p-4 bg-card rounded-xl border border-border mb-4">
            <p className="text-sm text-muted-foreground">Discussing:</p>
            <p className="font-medium truncate">
              {solve?.question_text || "Image question"}
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Ask me anything about this problem!</p>
                <p className="text-sm mt-2">Try: "Explain step 2 differently" or "Why did you use that formula?"</p>
              </div>
            )}

            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-4 rounded-2xl ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary" />
                  </div>
                )}
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="p-4 rounded-2xl bg-card border border-border">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.1s]" />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border">
        <div className="max-w-2xl mx-auto">
          {followUpLimitReached ? (
            <div className="text-center py-3">
              <p className="text-sm text-muted-foreground mb-1">
                Follow-up limit reached ({FREE_FOLLOWUP_LIMIT}/{FREE_FOLLOWUP_LIMIT})
              </p>
              <p className="text-xs text-primary">
                Upgrade to Pro for unlimited follow-ups
              </p>
            </div>
          ) : (
            <FollowUpInput
              onSubmit={handleSend}
              isLoading={isLoading}
              placeholder="Ask a follow-up question..."
            />
          )}
        </div>
      </div>

      <ToolsScroller />
    </div>
  );
};

export default Chat;
