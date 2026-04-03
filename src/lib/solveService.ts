/**
 * Unified Solve Service
 * 
 * ALL solving goes through the external OCR backend at http://46.224.199.130:8000/ocr
 * 
 * Camera solve: sends File (image) + mode via FormData
 * Text solve (Ask/Instant/Deep): sends text question + mode via FormData
 * 
 * NO Supabase edge functions are used for solving.
 * NO Groq / GPT-OSS calls.
 */

const OCR_BACKEND_URL = "http://46.224.199.130:8000/ocr";

export type SolveMode = "solve_free" | "solve_pro" | "solve_quiz";

export interface SolveResult {
  extracted_text: string;
  solution: string;
}

/**
 * Convert a base64 data URL to a File object
 */
function dataUrlToFile(dataUrl: string, filename = "photo.jpg"): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new File([array], filename, { type: mime });
}

/**
 * Solve an image-based problem via the OCR backend.
 * Accepts either a File or a base64 data URL string.
 */
export async function solveWithImage(
  imageInput: File | string,
  mode: SolveMode = "solve_free"
): Promise<SolveResult> {
  const file = typeof imageInput === "string" ? dataUrlToFile(imageInput) : imageInput;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", mode);

  console.log(`[SolveService] Image solve → ${OCR_BACKEND_URL} | mode=${mode}`);

  const response = await fetch(OCR_BACKEND_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    console.error(`[SolveService] Image solve failed: ${response.status}`, errorText);
    throw new Error(`Solve failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log("[SolveService] Image solve success");
  return {
    extracted_text: data.extracted_text || "",
    solution: data.solution || "",
  };
}

/**
 * Solve a text-based problem via the OCR backend.
 * Sends the question as a text file so the backend can process it.
 */
export async function solveWithText(
  question: string,
  mode: SolveMode = "solve_free"
): Promise<SolveResult> {
  // Create a text file containing the question
  const file = new File([question], "question.txt", { type: "text/plain" });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", mode);

  console.log(`[SolveService] Text solve → ${OCR_BACKEND_URL} | mode=${mode}`);

  const response = await fetch(OCR_BACKEND_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    console.error(`[SolveService] Text solve failed: ${response.status}`, errorText);
    throw new Error(`Solve failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log("[SolveService] Text solve success");
  return {
    extracted_text: data.extracted_text || question,
    solution: data.solution || "",
  };
}

/**
 * Determine the OCR backend mode string from app-level mode + premium status.
 */
export function getOcrMode(
  appMode: "instant" | "deep" | "essay" | "ask",
  isPremium: boolean
): SolveMode {
  // All modes use the same backend — just free vs pro tier
  return isPremium ? "solve_pro" : "solve_free";
}
