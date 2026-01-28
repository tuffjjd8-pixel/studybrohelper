import { motion } from "framer-motion";

interface ScannerLoadingStateProps {
  image?: string;
  stage: "extracting" | "classifying" | "solving";
}

const stageMessages = {
  extracting: { title: "Extracting Text", subtitle: "Reading your homework..." },
  classifying: { title: "Classifying Subject", subtitle: "Detecting topic..." },
  solving: { title: "Solving Problem", subtitle: "Generating step-by-step solution..." },
};

export function ScannerLoadingState({ image, stage }: ScannerLoadingStateProps) {
  const message = stageMessages[stage];
  const progress = stage === "extracting" ? 33 : stage === "classifying" ? 66 : 90;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-6 py-8 w-full max-w-md mx-auto"
    >
      {/* Image preview with shimmer overlay */}
      {image && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative rounded-2xl overflow-hidden border-2 border-primary/30"
          style={{
            boxShadow: "0 0 30px hsl(var(--primary) / 0.2)",
          }}
        >
          <img
            src={image}
            alt="Processing"
            className="max-h-40 object-contain"
          />
          {/* Shimmer overlay */}
          <div 
            className="absolute inset-0"
            style={{
              background: "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.2) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
            }}
          />
        </motion.div>
      )}

      {/* Loading spinner with neon glow */}
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-14 h-14 rounded-full border-4 border-muted border-t-primary"
          style={{
            boxShadow: "0 0 20px hsl(var(--primary) / 0.4)",
          }}
        />
        {/* Pulse ring */}
        <div 
          className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{ background: "hsl(var(--primary))" }}
        />
      </div>

      {/* Status text */}
      <div className="text-center space-y-1">
        <motion.p 
          key={stage}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-heading font-semibold text-lg text-foreground"
        >
          {message.title}
        </motion.p>
        <p className="text-sm text-muted-foreground">
          {message.subtitle}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full bg-primary rounded-full"
            style={{
              boxShadow: "0 0 10px hsl(var(--primary) / 0.6)",
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>OCR</span>
          <span>Classify</span>
          <span>Solve</span>
        </div>
      </div>
    </motion.div>
  );
}
