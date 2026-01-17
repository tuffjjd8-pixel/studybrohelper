import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Upload, Loader2, Sparkles, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Profile {
  is_premium: boolean;
  streak_count: number;
  total_solves: number;
}

export default function Summarize() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("is_premium, streak_count, total_solves")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    }
  }, [user]);

  const isPremium = profile?.is_premium || false;

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast.error("Please upload a PDF file");
        return;
      }
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast.error("File size must be under 20MB");
        return;
      }
      setFile(selectedFile);
      setSummary("");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type !== "application/pdf") {
        toast.error("Please upload a PDF file");
        return;
      }
      if (droppedFile.size > 20 * 1024 * 1024) {
        toast.error("File size must be under 20MB");
        return;
      }
      setFile(droppedFile);
      setSummary("");
    }
  }, []);

  // Simple text extraction from PDF using basic parsing
  const extractTextFromPDF = async (pdfFile: File): Promise<string> => {
    // Convert file to base64 and send to edge function for parsing
    const arrayBuffer = await pdfFile.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );
    return base64;
  };

  const handleSummarize = async () => {
    if (!file) {
      toast.error("Please upload a PDF first");
      return;
    }

    setLoading(true);
    setSummary("");

    try {
      // Convert PDF to base64
      const pdfBase64 = await extractTextFromPDF(file);

      // Send to edge function for extraction and summarization
      const { data, error } = await supabase.functions.invoke("summarize-pdf", {
        body: {
          pdfBase64,
          fileName: file.name,
          isPremium,
        },
      });

      if (error) throw error;

      setSummary(data.summary || "Unable to generate summary.");
    } catch (error: unknown) {
      console.error("Error summarizing PDF:", error);
      toast.error("Failed to summarize PDF. Please try again.");
      setSummary(`SUMMARY:
- An error occurred while processing.

KEY POINTS:
- Please try again with a different PDF.`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setSummary("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header streak={profile?.streak_count || 0} totalSolves={profile?.total_solves || 0} />

      <main className="pt-20 pb-24 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2"
          >
            <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center justify-center gap-2">
              <FileText className="w-7 h-7 text-primary" />
              PDF Summarizer
            </h1>
            <p className="text-muted-foreground text-sm">
              Upload a PDF and get a clean, study-friendly summary
            </p>
          </motion.div>

          {/* Upload Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card
              className={`relative p-8 border-2 border-dashed transition-colors ${
                file ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30"
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={loading}
              />

              <div className="flex flex-col items-center gap-4 text-center">
                {file ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearFile();
                      }}
                      disabled={loading}
                    >
                      Remove file
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Drop your PDF here</p>
                      <p className="text-xs text-muted-foreground">or click to browse (max 20MB)</p>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Summarize Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={handleSummarize}
              disabled={!file || loading}
              className="w-full h-12 text-base font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Summarizing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Summarize PDF
                </>
              )}
            </Button>
          </motion.div>

          {/* Premium hint */}
          {!isPremium && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-2 text-xs text-muted-foreground"
            >
              <Crown className="w-3 h-3" />
              <span>Premium users get expanded summaries with more terms & notes</span>
            </motion.div>
          )}

          {/* Summary Output */}
          <AnimatePresence mode="wait">
            {summary && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <Card className="p-6 bg-card/50 backdrop-blur">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground bg-transparent p-0 m-0 overflow-visible">
                      {summary}
                    </pre>
                  </div>
                </Card>

                {/* Copy button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(summary);
                    toast.success("Summary copied to clipboard!");
                  }}
                >
                  Copy Summary
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
