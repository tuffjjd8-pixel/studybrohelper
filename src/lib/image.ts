export type ImageOptimizeOptions = {
  /** Longest edge in pixels. */
  maxDimension?: number;
  /** 0..1 */
  quality?: number;
  /** Prefer webp, fall back to jpeg if unsupported */
  mimeType?: "image/webp" | "image/jpeg";
};

const DEFAULTS: Required<ImageOptimizeOptions> = {
  maxDimension: 1280,
  quality: 0.8,
  mimeType: "image/webp",
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

async function fileToImageBitmapSafe(file: File): Promise<ImageBitmap | null> {
  try {
    // Fast path in modern browsers
    return await createImageBitmap(file);
  } catch {
    return null;
  }
}

export async function fileToOptimizedDataUrl(
  file: File,
  options?: ImageOptimizeOptions
): Promise<string> {
  const { maxDimension, quality, mimeType } = { ...DEFAULTS, ...options };

  // If it's already small, keep it as-is to avoid extra CPU time.
  // (Most speed gains come from shrinking multi-megapixel photos.)
  if (file.size <= 350_000) {
    return await blobToDataUrl(file);
  }

  const bitmap = await fileToImageBitmapSafe(file);
  if (!bitmap) {
    // Fallback: no resize, but still return data URL
    return await blobToDataUrl(file);
  }

  const w = bitmap.width;
  const h = bitmap.height;
  const scale = Math.min(1, maxDimension / Math.max(w, h));
  const targetW = Math.max(1, Math.round(w * scale));
  const targetH = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return await blobToDataUrl(file);
  }

  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  const q = clamp(quality, 0.4, 0.95);

  // Some browsers may not support webp encode; try requested mime first, then jpeg.
  const blob =
    (await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), mimeType, q)
    )) ||
    (await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", q)
    ));

  if (!blob) {
    return await blobToDataUrl(file);
  }

  return await blobToDataUrl(blob);
}
