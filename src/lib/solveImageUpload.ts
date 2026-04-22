import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads a captured solve image (base64 data URL or blob URL) to the
 * persistent `solve-images` bucket and returns a public URL.
 *
 * Returns null on failure — caller should fall back to not persisting an image
 * rather than blocking the solve flow.
 */
export async function uploadSolveImage(
  imageData: string,
  userId: string,
): Promise<string | null> {
  try {
    let blob: Blob;

    if (imageData.startsWith("data:")) {
      const res = await fetch(imageData);
      blob = await res.blob();
    } else if (imageData.startsWith("blob:")) {
      const res = await fetch(imageData);
      blob = await res.blob();
    } else if (imageData.startsWith("http")) {
      // Already a remote URL — just return it.
      return imageData;
    } else {
      return null;
    }

    const ext = blob.type.includes("png") ? "png" : "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from("solve-images")
      .upload(path, blob, {
        contentType: blob.type || "image/jpeg",
        upsert: false,
      });

    if (error) {
      console.error("[uploadSolveImage] upload failed", error);
      return null;
    }

    const { data } = supabase.storage.from("solve-images").getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error("[uploadSolveImage] error", err);
    return null;
  }
}
