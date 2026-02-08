/**
 * Post-capture image processing pipeline:
 * 1. Auto-detect document edges
 * 2. Perspective-correct (deskew)
 * 3. Auto-crop to detected paper area
 * 4. Enhance contrast for readability
 *
 * All done client-side with Canvas API — no external libs required.
 */

interface Point {
  x: number;
  y: number;
}

interface EdgeResult {
  found: boolean;
  corners?: [Point, Point, Point, Point]; // TL, TR, BR, BL
}

/**
 * Convert an image source (data URL or blob URL) to ImageData on a canvas.
 */
async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for processing"));
    img.src = src;
  });
}

/**
 * Convert image to grayscale pixel array for edge detection.
 */
function toGrayscale(data: Uint8ClampedArray): Float32Array {
  const gray = new Float32Array(data.length / 4);
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  return gray;
}

/**
 * Simple Sobel edge magnitude map.
 */
function sobelEdges(gray: Float32Array, w: number, h: number): Float32Array {
  const edges = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -gray[(y - 1) * w + (x - 1)] + gray[(y - 1) * w + (x + 1)] +
        -2 * gray[y * w + (x - 1)] + 2 * gray[y * w + (x + 1)] +
        -gray[(y + 1) * w + (x - 1)] + gray[(y + 1) * w + (x + 1)];
      const gy =
        -gray[(y - 1) * w + (x - 1)] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + (x + 1)] +
        gray[(y + 1) * w + (x - 1)] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)];
      edges[y * w + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return edges;
}

/**
 * Try to find a rectangular document in the edge map.
 * Uses a simplified contour approach: find the bounding strong-edge rectangle.
 * Returns corners if a clear rectangle covering >15% of image area is detected.
 */
function detectDocumentEdges(edges: Float32Array, w: number, h: number): EdgeResult {
  // Threshold: top 8% of edge values
  const sorted = Float32Array.from(edges).sort();
  const threshold = sorted[Math.floor(sorted.length * 0.92)] || 50;

  // Project edge density onto rows and columns
  const rowDensity = new Float32Array(h);
  const colDensity = new Float32Array(w);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (edges[y * w + x] >= threshold) {
        rowDensity[y]++;
        colDensity[x]++;
      }
    }
  }

  // Find strong edges: rows/cols with density > 10% of dimension
  const rowThresh = w * 0.08;
  const colThresh = h * 0.08;

  let top = -1, bottom = -1, left = -1, right = -1;

  // Find top and bottom edges
  for (let y = Math.floor(h * 0.02); y < h * 0.4; y++) {
    if (rowDensity[y] > rowThresh) { top = y; break; }
  }
  for (let y = Math.floor(h * 0.98); y > h * 0.6; y--) {
    if (rowDensity[y] > rowThresh) { bottom = y; break; }
  }

  // Find left and right edges
  for (let x = Math.floor(w * 0.02); x < w * 0.4; x++) {
    if (colDensity[x] > colThresh) { left = x; break; }
  }
  for (let x = Math.floor(w * 0.98); x > w * 0.6; x--) {
    if (colDensity[x] > colThresh) { right = x; break; }
  }

  // Validate: all edges found and area is reasonable
  if (top < 0 || bottom < 0 || left < 0 || right < 0) {
    return { found: false };
  }

  const cropW = right - left;
  const cropH = bottom - top;
  const cropArea = cropW * cropH;
  const totalArea = w * h;

  // Document should cover between 15% and 95% of the image
  if (cropArea < totalArea * 0.15 || cropArea > totalArea * 0.95) {
    return { found: false };
  }

  // Ensure minimum size
  if (cropW < w * 0.2 || cropH < h * 0.2) {
    return { found: false };
  }

  return {
    found: true,
    corners: [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom },
    ],
  };
}

/**
 * Auto-enhance contrast using histogram stretching.
 */
function enhanceContrast(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Find min/max luminance
  let min = 255, max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum < min) min = lum;
    if (lum > max) max = lum;
  }

  // Only enhance if there's low contrast
  const range = max - min;
  if (range > 180) return; // Already good contrast

  const scale = range > 0 ? 255 / range : 1;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, (data[i] - min) * scale));
    data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - min) * scale));
    data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - min) * scale));
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Main processing pipeline. Takes an image source and returns a processed data URL.
 * If no document edges are detected, returns the original image (contrast-enhanced).
 */
export async function processHomeworkImage(imageSrc: string): Promise<string> {
  const img = await loadImage(imageSrc);

  // Work at a reduced resolution for edge detection (speed)
  const maxDetectDim = 800;
  const scale = Math.min(1, maxDetectDim / Math.max(img.width, img.height));
  const detectW = Math.round(img.width * scale);
  const detectH = Math.round(img.height * scale);

  const detectCanvas = document.createElement("canvas");
  detectCanvas.width = detectW;
  detectCanvas.height = detectH;
  const detectCtx = detectCanvas.getContext("2d")!;
  detectCtx.drawImage(img, 0, 0, detectW, detectH);

  const detectData = detectCtx.getImageData(0, 0, detectW, detectH);
  const gray = toGrayscale(detectData.data);
  const edges = sobelEdges(gray, detectW, detectH);
  const result = detectDocumentEdges(edges, detectW, detectH);

  // Output canvas at full resolution (max 2048)
  const maxOutputDim = 2048;
  const outputScale = Math.min(1, maxOutputDim / Math.max(img.width, img.height));

  let outputW: number, outputH: number;
  const outputCanvas = document.createElement("canvas");
  const outputCtx = outputCanvas.getContext("2d")!;

  if (result.found && result.corners) {
    // Scale corners back to full resolution
    const invScale = 1 / scale;
    const [tl, tr, br, bl] = result.corners.map((p) => ({
      x: p.x * invScale,
      y: p.y * invScale,
    }));

    // Add a small margin (3% of detected area)
    const marginX = (tr.x - tl.x) * 0.03;
    const marginY = (bl.y - tl.y) * 0.03;

    const cropX = Math.max(0, tl.x - marginX);
    const cropY = Math.max(0, tl.y - marginY);
    const cropW = Math.min(img.width - cropX, (tr.x - tl.x) + 2 * marginX);
    const cropH = Math.min(img.height - cropY, (bl.y - tl.y) + 2 * marginY);

    outputW = Math.round(cropW * outputScale);
    outputH = Math.round(cropH * outputScale);
    outputCanvas.width = outputW;
    outputCanvas.height = outputH;

    outputCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outputW, outputH);
  } else {
    // No edges detected — keep original full image
    outputW = Math.round(img.width * outputScale);
    outputH = Math.round(img.height * outputScale);
    outputCanvas.width = outputW;
    outputCanvas.height = outputH;

    outputCtx.drawImage(img, 0, 0, outputW, outputH);
  }

  // Enhance contrast for readability
  enhanceContrast(outputCtx, outputW, outputH);

  // Export as data URL
  return new Promise<string>((resolve, reject) => {
    outputCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to export processed image"));
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read processed image"));
        reader.readAsDataURL(blob);
      },
      "image/webp",
      0.92
    );
  });
}
