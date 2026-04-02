/**
 * Converts a blob URL, data URL, or raw base64 string into a clean base64
 * string (no `data:...;base64,` prefix, no whitespace).
 */
export async function toCleanBase64(input: string): Promise<string> {
  // If it's a blob URL, fetch the blob and convert
  if (input.startsWith("blob:")) {
    const res = await fetch(input);
    const blob = await res.blob();
    return blobToBase64(blob);
  }

  // If it's a data URL, strip the prefix
  if (input.startsWith("data:")) {
    const parts = input.split(",");
    if (parts.length >= 2) {
      return cleanBase64(parts[1]);
    }
  }

  // Assume it's already base64 — just clean it
  return cleanBase64(input);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix
      const base64 = result.split(",")[1] || result;
      resolve(cleanBase64(base64));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function cleanBase64(base64String: string): string {
  if (!base64String) return "";
  // Remove whitespace/newlines
  return base64String.replace(/\s/g, "");
}
