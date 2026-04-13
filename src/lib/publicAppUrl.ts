const PREVIEW_HOST_PATTERNS = [
  /(^|\.)lovableproject\.com$/i,
  /^id-preview--/i,
  /(^|\.)lovable\.dev$/i,
  /^localhost$/i,
  /^127\.0\.0\.1$/,
];

const FALLBACK_PUBLIC_ORIGIN = "https://studybrohelper.lovable.app";

function isPreviewHost(hostname: string) {
  return PREVIEW_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

export function getPublicAppOrigin() {
  if (typeof window === "undefined") return FALLBACK_PUBLIC_ORIGIN;

  const { origin, hostname } = window.location;
  return isPreviewHost(hostname) ? FALLBACK_PUBLIC_ORIGIN : origin;
}

export function getPublicSolveUrl(solveId?: string) {
  const baseOrigin = getPublicAppOrigin();
  return solveId ? `${baseOrigin}/solve/${solveId}` : baseOrigin;
}
