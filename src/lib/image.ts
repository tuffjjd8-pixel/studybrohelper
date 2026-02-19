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

async function loadImageElement(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };
    img.src = url;
  });
}

/**
 * Read EXIF orientation tag from a JPEG file's raw bytes.
 * Returns 1-8 (1 = normal). Falls back to 1 on any error.
 */
function readExifOrientation(buffer: ArrayBuffer): number {
  const view = new DataView(buffer);
  if (view.getUint16(0, false) !== 0xFFD8) return 1; // not JPEG

  let offset = 2;
  while (offset < view.byteLength - 2) {
    const marker = view.getUint16(offset, false);
    offset += 2;
    if (marker === 0xFFE1) { // APP1
      const length = view.getUint16(offset, false);
      const exifStart = offset + 2;
      // Check "Exif\0\0"
      if (
        view.getUint32(exifStart, false) === 0x45786966 &&
        view.getUint16(exifStart + 4, false) === 0x0000
      ) {
        const tiffStart = exifStart + 6;
        const bigEndian = view.getUint16(tiffStart, false) === 0x4D4D;
        const ifdOffset = view.getUint32(tiffStart + 4, bigEndian);
        const numEntries = view.getUint16(tiffStart + ifdOffset, bigEndian);
        for (let i = 0; i < numEntries; i++) {
          const entryOffset = tiffStart + ifdOffset + 2 + i * 12;
          if (entryOffset + 12 > view.byteLength) break;
          if (view.getUint16(entryOffset, bigEndian) === 0x0112) {
            return view.getUint16(entryOffset + 8, bigEndian);
          }
        }
      }
      offset += length;
    } else if ((marker & 0xFF00) === 0xFF00) {
      offset += view.getUint16(offset, false);
    } else {
      break;
    }
  }
  return 1;
}

/**
 * Apply EXIF orientation transform to a canvas context.
 * Returns the corrected [width, height] for the canvas.
 */
function applyExifOrientation(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  w: number,
  h: number
): [number, number] {
  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, w, 0); return [w, h];
    case 3: ctx.transform(-1, 0, 0, -1, w, h); return [w, h];
    case 4: ctx.transform(1, 0, 0, -1, 0, h); return [w, h];
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); return [h, w];
    case 6: ctx.transform(0, 1, -1, 0, h, 0); return [h, w];
    case 7: ctx.transform(0, -1, -1, 0, h, w); return [h, w];
    case 8: ctx.transform(0, -1, 1, 0, 0, w); return [h, w];
    default: return [w, h];
  }
}

async function fileToImageBitmapSafe(file: File): Promise<ImageBitmap | HTMLImageElement | null> {
  // Try createImageBitmap first (fast, handles EXIF in modern browsers)
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through to HTMLImageElement path
    }
  }
  // Fallback for older iOS Safari and other browsers
  try {
    return await loadImageElement(file);
  } catch {
    return null;
  }
}

export async function fileToOptimizedDataUrl(
  file: File,
  options?: ImageOptimizeOptions
): Promise<string> {
  const { maxDimension, quality, mimeType } = { ...DEFAULTS, ...options };

  // Always process through canvas to normalize EXIF orientation.
  // createImageBitmap handles EXIF automatically in modern browsers,
  // but the HTMLImageElement fallback and small-file bypass do not.

  const bitmap = await fileToImageBitmapSafe(file);
  if (!bitmap) {
    return await blobToDataUrl(file);
  }

  const w = bitmap.width;
  const h = bitmap.height;

  // Check EXIF orientation for HTMLImageElement fallback
  let orientation = 1;
  const isBitmapAutoRotated = bitmap instanceof ImageBitmap;
  if (!isBitmapAutoRotated && file.type === "image/jpeg") {
    try {
      const buf = await file.arrayBuffer();
      orientation = readExifOrientation(buf);
    } catch { /* ignore */ }
  }

  const scale = Math.min(1, maxDimension / Math.max(w, h));
  const targetW = Math.max(1, Math.round(w * scale));
  const targetH = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    if ("close" in bitmap && typeof (bitmap as any).close === "function") {
      (bitmap as ImageBitmap).close();
    }
    return await blobToDataUrl(file);
  }

  if (!isBitmapAutoRotated && orientation > 1) {
    // Apply EXIF rotation
    const [cw, ch] = applyExifOrientation(ctx, orientation, targetW, targetH);
    canvas.width = cw;
    canvas.height = ch;
    // Re-apply transform after setting canvas size (it resets)
    applyExifOrientation(ctx, orientation, targetW, targetH);
  } else {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  if ("close" in bitmap && typeof bitmap.close === "function") {
    bitmap.close();
  }

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
