import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

interface DeepModeGateProps {
  open: boolean;
  onClose: () => void;
  onContinueBasic: () => void;
}

/**
 * Lightweight, dismissible modal when free user taps Deep Mode.
 */
export function DeepModeGate({ open, onClose, onContinueBasic }: DeepModeGateProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
          <Crown className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-heading font-bold">Deep Mode is a Pro Feature</h3>
        <p className="text-sm text-muted-foreground">
          Unlock step-by-step, higher-accuracy explanations with Deep Mode.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={() => { onClose(); navigate("/premium"); }}
            className="gap-1.5 rounded-full"
          >
            <Crown className="w-4 h-4" />
            Upgrade to Pro
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { onClose(); onContinueBasic(); }}
            className="text-muted-foreground"
          >
            Continue with Basic
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
