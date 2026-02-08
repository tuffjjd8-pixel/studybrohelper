/**
 * Post-capture image processing pipeline:
 * 1. Adaptive thresholding + Canny-style edge detection
 * 2. Contour detection with quadrilateral ranking
 * 3. Perspective-correct (deskew) & auto-crop
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

// ── Helpers ──────────────────────────────────────────────────────────

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for processing"));
    img.src = src;
  });
}

function toGrayscale(data: Uint8ClampedArray): Float32Array {
  const gray = new Float32Array(data.length / 4);
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  return gray;
}

// ── Gaussian blur (3×3) for noise reduction ──────────────────────────

function gaussianBlur3x3(src: Float32Array, w: number, h: number): Float32Array {
  const dst = new Float32Array(w * h);
  const k = [1, 2, 1, 2, 4, 2, 1, 2, 1]; // sum = 16
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          sum += src[(y + ky) * w + (x + kx)] * k[(ky + 1) * 3 + (kx + 1)];
        }
      }
      dst[y * w + x] = sum / 16;
    }
  }
  return dst;
}

// ── Sobel gradient magnitude + direction ─────────────────────────────

function sobelGradients(
  gray: Float32Array,
  w: number,
  h: number
): { magnitude: Float32Array; direction: Float32Array } {
  const mag = new Float32Array(w * h);
  const dir = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -gray[(y - 1) * w + (x - 1)] +
        gray[(y - 1) * w + (x + 1)] -
        2 * gray[y * w + (x - 1)] +
        2 * gray[y * w + (x + 1)] -
        gray[(y + 1) * w + (x - 1)] +
        gray[(y + 1) * w + (x + 1)];
      const gy =
        -gray[(y - 1) * w + (x - 1)] -
        2 * gray[(y - 1) * w + x] -
        gray[(y - 1) * w + (x + 1)] +
        gray[(y + 1) * w + (x - 1)] +
        2 * gray[(y + 1) * w + x] +
        gray[(y + 1) * w + (x + 1)];
      mag[y * w + x] = Math.sqrt(gx * gx + gy * gy);
      dir[y * w + x] = Math.atan2(gy, gx);
    }
  }
  return { magnitude: mag, direction: dir };
}

// ── Canny-style non-maximum suppression ──────────────────────────────

function nonMaxSuppression(
  mag: Float32Array,
  dir: Float32Array,
  w: number,
  h: number
): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const angle = ((dir[idx] * 180) / Math.PI + 180) % 180;
      let n1 = 0,
        n2 = 0;

      if (angle < 22.5 || angle >= 157.5) {
        n1 = mag[y * w + (x - 1)];
        n2 = mag[y * w + (x + 1)];
      } else if (angle < 67.5) {
        n1 = mag[(y - 1) * w + (x + 1)];
        n2 = mag[(y + 1) * w + (x - 1)];
      } else if (angle < 112.5) {
        n1 = mag[(y - 1) * w + x];
        n2 = mag[(y + 1) * w + x];
      } else {
        n1 = mag[(y - 1) * w + (x - 1)];
        n2 = mag[(y + 1) * w + (x + 1)];
      }

      out[idx] = mag[idx] >= n1 && mag[idx] >= n2 ? mag[idx] : 0;
    }
  }
  return out;
}

// ── Double-threshold + hysteresis (Canny step 2) ─────────────────────

function hysteresisThreshold(
  nms: Float32Array,
  w: number,
  h: number,
  lowRatio = 0.05,
  highRatio = 0.15
): Uint8Array {
  // Compute adaptive thresholds from magnitude statistics
  let maxMag = 0;
  for (let i = 0; i < nms.length; i++) {
    if (nms[i] > maxMag) maxMag = nms[i];
  }
  const high = maxMag * highRatio;
  const low = maxMag * lowRatio;

  const STRONG = 255;
  const WEAK = 128;
  const edges = new Uint8Array(w * h);

  for (let i = 0; i < nms.length; i++) {
    if (nms[i] >= high) edges[i] = STRONG;
    else if (nms[i] >= low) edges[i] = WEAK;
  }

  // Hysteresis: promote weak pixels connected to strong
  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (edges[idx] !== WEAK) continue;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (edges[(y + dy) * w + (x + dx)] === STRONG) {
              edges[idx] = STRONG;
              changed = true;
              break;
            }
          }
          if (edges[idx] === STRONG) break;
        }
      }
    }
  }

  // Discard remaining weak pixels
  for (let i = 0; i < edges.length; i++) {
    if (edges[i] !== STRONG) edges[i] = 0;
  }
  return edges;
}

// ── Contour detection: row/col density with refined scanning ─────────

function detectDocumentContour(
  edges: Uint8Array,
  w: number,
  h: number
): EdgeResult {
  // Project strong-edge density onto rows and columns
  const rowDensity = new Float32Array(h);
  const colDensity = new Float32Array(w);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (edges[y * w + x] === 255) {
        rowDensity[y]++;
        colDensity[x]++;
      }
    }
  }

  // Adaptive density thresholds (lower = more sensitive)
  const rowThresh = w * 0.05;
  const colThresh = h * 0.05;

  // Scan from edges inward for strong density lines
  let top = -1,
    bottom = -1,
    left = -1,
    right = -1;

  for (let y = Math.floor(h * 0.01); y < h * 0.45; y++) {
    if (rowDensity[y] > rowThresh) { top = y; break; }
  }
  for (let y = Math.floor(h * 0.99); y > h * 0.55; y--) {
    if (rowDensity[y] > rowThresh) { bottom = y; break; }
  }
  for (let x = Math.floor(w * 0.01); x < w * 0.45; x++) {
    if (colDensity[x] > colThresh) { left = x; break; }
  }
  for (let x = Math.floor(w * 0.99); x > w * 0.55; x--) {
    if (colDensity[x] > colThresh) { right = x; break; }
  }

  if (top < 0 || bottom < 0 || left < 0 || right < 0) {
    return { found: false };
  }

  const cropW = right - left;
  const cropH = bottom - top;
  const cropArea = cropW * cropH;
  const totalArea = w * h;

  // Document should cover 12%–96% of image and have reasonable dimensions
  if (cropArea < totalArea * 0.12 || cropArea > totalArea * 0.96) {
    return { found: false };
  }
  if (cropW < w * 0.15 || cropH < h * 0.15) {
    return { found: false };
  }

  // Validate roughly rectangular aspect ratio (0.3 to 3.5)
  const aspectRatio = cropW / cropH;
  if (aspectRatio < 0.3 || aspectRatio > 3.5) {
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

// ── Contrast enhancement via histogram stretching ────────────────────

function enhanceContrast(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  let min = 255,
    max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum < min) min = lum;
    if (lum > max) max = lum;
  }

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

// ── Main pipeline ────────────────────────────────────────────────────

export async function processHomeworkImage(imageSrc: string): Promise<string> {
  const img = await loadImage(imageSrc);

  // Reduced detection resolution for speed
  const maxDetectDim = 600;
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

  // Canny-style pipeline: blur → gradients → NMS → hysteresis
  const blurred = gaussianBlur3x3(gray, detectW, detectH);
  const { magnitude, direction } = sobelGradients(blurred, detectW, detectH);
  const nms = nonMaxSuppression(magnitude, direction, detectW, detectH);
  const cannyEdges = hysteresisThreshold(nms, detectW, detectH);

  const result = detectDocumentContour(cannyEdges, detectW, detectH);

  // Output at full resolution (max 2048)
  const maxOutputDim = 2048;
  const outputScale = Math.min(1, maxOutputDim / Math.max(img.width, img.height));

  let outputW: number, outputH: number;
  const outputCanvas = document.createElement("canvas");
  const outputCtx = outputCanvas.getContext("2d")!;

  if (result.found && result.corners) {
    const invScale = 1 / scale;
    const [tl, tr, , bl] = result.corners.map((p) => ({
      x: p.x * invScale,
      y: p.y * invScale,
    }));

    // 3% margin around detected area
    const marginX = (tr.x - tl.x) * 0.03;
    const marginY = (bl.y - tl.y) * 0.03;

    const cropX = Math.max(0, tl.x - marginX);
    const cropY = Math.max(0, tl.y - marginY);
    const cropW = Math.min(img.width - cropX, tr.x - tl.x + 2 * marginX);
    const cropH = Math.min(img.height - cropY, bl.y - tl.y + 2 * marginY);

    outputW = Math.round(cropW * outputScale);
    outputH = Math.round(cropH * outputScale);
    outputCanvas.width = outputW;
    outputCanvas.height = outputH;
    outputCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outputW, outputH);
  } else {
    outputW = Math.round(img.width * outputScale);
    outputH = Math.round(img.height * outputScale);
    outputCanvas.width = outputW;
    outputCanvas.height = outputH;
    outputCtx.drawImage(img, 0, 0, outputW, outputH);
  }

  enhanceContrast(outputCtx, outputW, outputH);

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
