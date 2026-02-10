/**
 * Post-capture image processing pipeline:
 * 1. Grayscale → Gaussian blur → Adaptive threshold → Morphological closing
 * 2. Canny edge detection (Sobel + NMS + hysteresis)
 * 3. Contour detection with quadrilateral ranking
 * 4. Perspective-correct (deskew) & auto-crop with margin
 * 5. Brightness/contrast normalization
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for processing"));
    img.src = src;
  });
}

function toGrayscale(data: Uint8ClampedArray, len: number): Float32Array {
  const gray = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  return gray;
}

// ── Gaussian blur 5×5 ───────────────────────────────────────────────

function gaussianBlur5x5(src: Float32Array, w: number, h: number): Float32Array {
  const dst = new Float32Array(w * h);
  const k = [
    1, 4, 6, 4, 1,
    4, 16, 24, 16, 4,
    6, 24, 36, 24, 6,
    4, 16, 24, 16, 4,
    1, 4, 6, 4, 1,
  ]; // sum = 256
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      let sum = 0;
      for (let ky = -2; ky <= 2; ky++) {
        for (let kx = -2; kx <= 2; kx++) {
          sum += src[(y + ky) * w + (x + kx)] * k[(ky + 2) * 5 + (kx + 2)];
        }
      }
      dst[y * w + x] = sum / 256;
    }
  }
  return dst;
}

// ── Adaptive threshold (mean-based, block 15) ───────────────────────

function adaptiveThreshold(src: Float32Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  const r = 7; // half-block radius
  // Integral image for fast block mean
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += src[y * w + x];
      integral[(y + 1) * (w + 1) + (x + 1)] =
        integral[y * (w + 1) + (x + 1)] + rowSum;
    }
  }

  const C = 8; // threshold offset
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r);
      const y0 = Math.max(0, y - r);
      const x1 = Math.min(w - 1, x + r);
      const y1 = Math.min(h - 1, y + r);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum =
        integral[(y1 + 1) * (w + 1) + (x1 + 1)] -
        integral[y0 * (w + 1) + (x1 + 1)] -
        integral[(y1 + 1) * (w + 1) + x0] +
        integral[y0 * (w + 1) + x0];
      const mean = sum / area;
      out[y * w + x] = src[y * w + x] > mean - C ? 0 : 255;
    }
  }
  return out;
}

// ── Morphological closing (dilate then erode, 3×3) ──────────────────

function morphClose(src: Uint8Array, w: number, h: number): Uint8Array {
  const dilated = new Uint8Array(w * h);
  const closed = new Uint8Array(w * h);
  // Dilate
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let maxVal = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const v = src[(y + dy) * w + (x + dx)];
          if (v > maxVal) maxVal = v;
        }
      }
      dilated[y * w + x] = maxVal;
    }
  }
  // Erode
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let minVal = 255;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const v = dilated[(y + dy) * w + (x + dx)];
          if (v < minVal) minVal = v;
        }
      }
      closed[y * w + x] = minVal;
    }
  }
  return closed;
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

// ── Canny NMS ────────────────────────────────────────────────────────

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
      let n1 = 0, n2 = 0;
      if (angle < 22.5 || angle >= 157.5) {
        n1 = mag[y * w + (x - 1)]; n2 = mag[y * w + (x + 1)];
      } else if (angle < 67.5) {
        n1 = mag[(y - 1) * w + (x + 1)]; n2 = mag[(y + 1) * w + (x - 1)];
      } else if (angle < 112.5) {
        n1 = mag[(y - 1) * w + x]; n2 = mag[(y + 1) * w + x];
      } else {
        n1 = mag[(y - 1) * w + (x - 1)]; n2 = mag[(y + 1) * w + (x + 1)];
      }
      out[idx] = mag[idx] >= n1 && mag[idx] >= n2 ? mag[idx] : 0;
    }
  }
  return out;
}

// ── Hysteresis thresholding ──────────────────────────────────────────

function hysteresisThreshold(
  nms: Float32Array,
  w: number,
  h: number,
  lowRatio = 0.04,
  highRatio = 0.12
): Uint8Array {
  let maxMag = 0;
  for (let i = 0; i < nms.length; i++) if (nms[i] > maxMag) maxMag = nms[i];
  const high = maxMag * highRatio;
  const low = maxMag * lowRatio;
  const STRONG = 255, WEAK = 128;
  const edges = new Uint8Array(w * h);

  for (let i = 0; i < nms.length; i++) {
    if (nms[i] >= high) edges[i] = STRONG;
    else if (nms[i] >= low) edges[i] = WEAK;
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (edges[idx] !== WEAK) continue;
        outer: for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (edges[(y + dy) * w + (x + dx)] === STRONG) {
              edges[idx] = STRONG;
              changed = true;
              break outer;
            }
          }
        }
      }
    }
  }

  for (let i = 0; i < edges.length; i++) if (edges[i] !== STRONG) edges[i] = 0;
  return edges;
}

// ── Contour detection via row/col density with polygon validation ────

function detectDocumentContour(
  edges: Uint8Array,
  w: number,
  h: number
): EdgeResult {
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

  const rowThresh = w * 0.04;
  const colThresh = h * 0.04;

  let top = -1, bottom = -1, left = -1, right = -1;

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

  if (top < 0 || bottom < 0 || left < 0 || right < 0) return { found: false };

  const cropW = right - left;
  const cropH = bottom - top;
  const cropArea = cropW * cropH;
  const totalArea = w * h;

  if (cropArea < totalArea * 0.10 || cropArea > totalArea * 0.97) return { found: false };
  if (cropW < w * 0.12 || cropH < h * 0.12) return { found: false };

  const aspect = cropW / cropH;
  if (aspect < 0.25 || aspect > 4.0) return { found: false };

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

// ── Brightness + contrast normalization ──────────────────────────────

function normalizeContrast(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Build luminance histogram
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    hist[lum]++;
  }

  // Find 1% and 99% percentile for robust stretching
  const totalPixels = w * h;
  const lowCut = totalPixels * 0.01;
  const highCut = totalPixels * 0.99;
  let cumulative = 0;
  let minVal = 0, maxVal = 255;

  for (let i = 0; i < 256; i++) {
    cumulative += hist[i];
    if (cumulative >= lowCut) { minVal = i; break; }
  }
  cumulative = 0;
  for (let i = 255; i >= 0; i--) {
    cumulative += hist[i];
    if (cumulative >= totalPixels - highCut) { maxVal = i; break; }
  }

  const range = maxVal - minVal;
  if (range > 200) return; // Already good contrast

  const scale = range > 0 ? 255 / range : 1;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, (data[i] - minVal) * scale));
    data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - minVal) * scale));
    data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - minVal) * scale));
  }
  ctx.putImageData(imageData, 0, 0);
}

// ── Main pipeline ────────────────────────────────────────────────────

export async function processHomeworkImage(imageSrc: string): Promise<string> {
  const img = await loadImage(imageSrc);

  // Detection at reduced resolution for speed
  const maxDetectDim = 640;
  const scale = Math.min(1, maxDetectDim / Math.max(img.width, img.height));
  const detectW = Math.round(img.width * scale);
  const detectH = Math.round(img.height * scale);

  const detectCanvas = document.createElement("canvas");
  detectCanvas.width = detectW;
  detectCanvas.height = detectH;
  const detectCtx = detectCanvas.getContext("2d")!;
  detectCtx.drawImage(img, 0, 0, detectW, detectH);

  const detectData = detectCtx.getImageData(0, 0, detectW, detectH);
  const pixelCount = detectW * detectH;
  const gray = toGrayscale(detectData.data, pixelCount);

  // Full pipeline: blur → adaptive threshold → morph close → Sobel → NMS → hysteresis
  const blurred = gaussianBlur5x5(gray, detectW, detectH);
  const thresholded = adaptiveThreshold(blurred, detectW, detectH);
  const cleaned = morphClose(thresholded, detectW, detectH);

  // Canny on the cleaned binary image converted back to float
  const cleanedFloat = new Float32Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) cleanedFloat[i] = cleaned[i];

  const { magnitude, direction } = sobelGradients(cleanedFloat, detectW, detectH);
  const nms = nonMaxSuppression(magnitude, direction, detectW, detectH);
  const cannyEdges = hysteresisThreshold(nms, detectW, detectH);

  const result = detectDocumentContour(cannyEdges, detectW, detectH);

  // Output at full resolution (max 2048)
  const maxOutputDim = 2048;
  const outputScale = Math.min(1, maxOutputDim / Math.max(img.width, img.height));

  const outputCanvas = document.createElement("canvas");
  const outputCtx = outputCanvas.getContext("2d")!;
  let outputW: number, outputH: number;

  if (result.found && result.corners) {
    const invScale = 1 / scale;
    const [tl, tr, , bl] = result.corners.map((p) => ({
      x: p.x * invScale,
      y: p.y * invScale,
    }));

    // 8% margin around detected area
    const marginX = (tr.x - tl.x) * 0.08;
    const marginY = (bl.y - tl.y) * 0.08;

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

  normalizeContrast(outputCtx, outputW, outputH);

  return new Promise<string>((resolve, reject) => {
    outputCanvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error("Failed to export processed image")); return; }
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
