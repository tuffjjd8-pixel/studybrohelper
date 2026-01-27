import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageIcon, Link, Upload, X, AlertCircle } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { supabase } from "@/integrations/supabase/client";
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
  const [mode, setMode] = useState<"none" | "url" | "upload">("none");
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
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
    setMode("none");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `poll-${Date.now()}.${fileExt}`;
      const filePath = `poll-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setImageError(false);
      onImageChange(publicUrl);
      setMode("none");
      toast.success("Image uploaded!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    onImageChange(null);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm text-muted-foreground flex items-center gap-1">
        <ImageIcon className="w-3 h-3" /> {label}
      </label>

      {/* Image Preview */}
      {imageUrl && (
        <div className="relative">
          <AspectRatio ratio={aspectRatio} className="bg-muted rounded-lg overflow-hidden">
            {imageError ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                <AlertCircle className="w-8 h-8 mb-2" />
                <span className="text-sm">Image unavailable</span>
              </div>
            ) : (
              <img 
                src={imageUrl} 
                alt="Poll image preview" 
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            )}
          </AspectRatio>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={handleRemoveImage}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Add Image Options */}
      {!imageUrl && mode === "none" && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMode("url")}
            className="flex-1"
          >
            <Link className="w-4 h-4 mr-1" /> Paste URL
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMode("upload")}
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-1" /> Upload
          </Button>
        </div>
      )}

      {/* URL Input */}
      {!imageUrl && mode === "url" && (
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com/image.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1"
          />
          <Button type="button" size="sm" onClick={handleUrlSubmit}>
            Add
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setMode("none")}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* File Upload */}
      {!imageUrl && mode === "upload" && (
        <div className="flex gap-2 items-center">
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="flex-1"
          />
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => setMode("none")}
            disabled={uploading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {uploading && (
        <p className="text-xs text-muted-foreground">Uploading...</p>
      )}
    </div>
  );
}
