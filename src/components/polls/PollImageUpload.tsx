import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageIcon, X, AlertCircle, Link2 } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { toast } from "sonner";

interface PollImageUploadProps {
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  label?: string;
  aspectRatio?: number;
}

// Simple URL validation
const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

export function PollImageUpload({ 
  imageUrl, 
  onImageChange, 
  label = "Image",
  aspectRatio = 16 / 9 
}: PollImageUploadProps) {
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      toast.error("Please enter a URL");
      return;
    }
    
    if (!isValidImageUrl(urlInput.trim())) {
      toast.error("Please enter a valid image URL (http:// or https://)");
      return;
    }
    
    setImageError(false);
    onImageChange(urlInput.trim());
    setUrlInput("");
    setShowUrlInput(false);
  };

  const handleRemoveImage = () => {
    onImageChange(null);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleUrlSubmit();
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground flex items-center gap-1.5">
        <ImageIcon className="w-3 h-3" /> {label}
      </label>

      {/* Image Preview */}
      {imageUrl && (
        <div className="relative group">
          <AspectRatio ratio={aspectRatio} className="bg-muted rounded-lg overflow-hidden border border-border">
            {imageError ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                <AlertCircle className="w-6 h-6 mb-1" />
                <span className="text-xs">Image unavailable</span>
              </div>
            ) : (
              <img 
                src={imageUrl} 
                alt="Preview" 
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            )}
          </AspectRatio>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemoveImage}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* URL Input Toggle */}
      {!imageUrl && !showUrlInput && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowUrlInput(true)}
          className="w-full h-9 border border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
        >
          <Link2 className="w-3.5 h-3.5 mr-1.5" /> 
          Paste Image URL
        </Button>
      )}

      {/* URL Input Field */}
      {!imageUrl && showUrlInput && (
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com/image.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 h-9 text-sm"
            autoFocus
          />
          <Button 
            type="button" 
            size="sm" 
            onClick={handleUrlSubmit}
            className="h-9 px-3"
          >
            Add
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setShowUrlInput(false);
              setUrlInput("");
            }}
            className="h-9 px-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
