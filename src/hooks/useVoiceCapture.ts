import { useEffect, useRef, useState } from "react";

/**
 * Hands-free voice trigger for the camera shutter.
 *
 * - Uses ONLY the browser-native Web Speech API (zero backend / AI / cost).
 * - Recognizes "go" → fires onTrigger immediately.
 * - Recognizes "next" → fires onNext immediately (if provided).
 * - Only listens while `enabled` is true (i.e. while the camera screen is open).
 * - Auto-restarts on transient end events so it stays warm with no user action.
 * - Fully silent on unsupported browsers (Safari iOS desktop fallback handled).
 *
 * Speed notes:
 *  - We match against `interimResults` (not just final) so the trigger fires the
 *    instant the word is recognized — typically faster than tapping the shutter.
 *  - We don't await anything before calling onTrigger.
 */

type SpeechRecognitionLike = any;

interface Options {
  enabled: boolean;
  onTrigger: () => void;
  onNext?: () => void;
}

// Accent-tolerant variants. Kept tight enough that random speech doesn't fire.
const TRIGGER_WORDS = new Set([
  // "go" family
  "go", "goh", "goo", "gooo", "gho", "geo", "goe", "gow",
  // "snap" family
  "snap", "snaps", "snab", "snapp", "snappp", "snip", "snap.", "snap!",
]);
const NEXT_WORDS = new Set(["next", "nex", "nextt", "continue"]);

// Strip non-letters so "go." / "snap!" / "go," still match.
const clean = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "").trim();

function getRecognitionCtor(): any | null {
  if (typeof window === "undefined") return null;
  // @ts-expect-error - vendor-prefixed
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function useVoiceCapture({ enabled, onTrigger, onNext }: Options) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const lastFireRef = useRef(0);
  const wantListeningRef = useRef(false);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  // Stable handler refs so we don't tear down recognition on each render
  const onTriggerRef = useRef(onTrigger);
  const onNextRef = useRef(onNext);
  useEffect(() => { onTriggerRef.current = onTrigger; }, [onTrigger]);
  useEffect(() => { onNextRef.current = onNext; }, [onNext]);

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    setSupported(!!Ctor);
    if (!Ctor) return;

    if (!enabled) {
      wantListeningRef.current = false;
      try { recognitionRef.current?.stop(); } catch { /* noop */ }
      return;
    }

    wantListeningRef.current = true;
    const recognition: SpeechRecognitionLike = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true; // critical for fastest possible trigger
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    const handleResult = (event: any) => {
      // Debounce — avoid double-fires from interim+final of the same utterance.
      const now = performance.now();
      if (now - lastFireRef.current < 1200) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = String(event.results[i][0]?.transcript || "")
          .toLowerCase()
          .trim();
        if (!transcript) continue;

        // Match whole-word at the END of the buffer (most recent speech).
        const tokens = transcript.split(/\s+/);
        const last = tokens[tokens.length - 1];
        const lastTwo = tokens.slice(-2).join(" ");

        if (TRIGGER_WORDS.includes(last) || TRIGGER_WORDS.some(w => lastTwo === w)) {
          lastFireRef.current = now;
          onTriggerRef.current();
          return;
        }
        if (onNextRef.current && (NEXT_WORDS.includes(last) || NEXT_WORDS.some(w => lastTwo === w))) {
          lastFireRef.current = now;
          onNextRef.current();
          return;
        }
      }
    };

    const handleStart = () => setListening(true);
    const handleEnd = () => {
      setListening(false);
      // Auto-restart while still desired (recognition naturally ends on silence).
      if (wantListeningRef.current) {
        try { recognition.start(); } catch { /* already starting */ }
      }
    };
    const handleError = (e: any) => {
      // "no-speech" / "aborted" / "audio-capture" — silently restart-on-end.
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        wantListeningRef.current = false;
      }
    };

    recognition.addEventListener("result", handleResult);
    recognition.addEventListener("start", handleStart);
    recognition.addEventListener("end", handleEnd);
    recognition.addEventListener("error", handleError);

    recognitionRef.current = recognition;
    try { recognition.start(); } catch { /* already started */ }

    return () => {
      wantListeningRef.current = false;
      recognition.removeEventListener("result", handleResult);
      recognition.removeEventListener("start", handleStart);
      recognition.removeEventListener("end", handleEnd);
      recognition.removeEventListener("error", handleError);
      try { recognition.stop(); } catch { /* noop */ }
      try { recognition.abort(); } catch { /* noop */ }
      recognitionRef.current = null;
      setListening(false);
    };
  }, [enabled]);

  return { listening, supported };
}
