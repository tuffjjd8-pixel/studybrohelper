let audioCache: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;

const createClickBuffer = () => {
  if (!audioCtx) audioCtx = new AudioContext();
  // Generate a very short click: 100ms, subtle tick sound
  const sampleRate = audioCtx.sampleRate;
  const duration = 0.08;
  const length = Math.floor(sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    // Quick attack, fast decay tick
    const envelope = Math.exp(-t * 80);
    data[i] = envelope * (Math.random() * 2 - 1) * 0.3;
    // Add a subtle tonal component
    data[i] += envelope * Math.sin(2 * Math.PI * 1800 * t) * 0.15;
  }
  return buffer;
};

let clickBuffer: AudioBuffer | null = null;

export const playClickSound = () => {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    if (!clickBuffer) clickBuffer = createClickBuffer();

    const source = audioCtx.createBufferSource();
    source.buffer = clickBuffer;

    const gain = audioCtx.createGain();
    gain.gain.value = 0.25;
    source.connect(gain);
    gain.connect(audioCtx.destination);
    source.start();
  } catch {
    // Silently fail - sound is non-critical
  }
};
