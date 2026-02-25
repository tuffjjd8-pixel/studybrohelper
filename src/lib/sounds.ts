let audioCtx: AudioContext | null = null;

const createClickBuffer = () => {
  if (!audioCtx) audioCtx = new AudioContext();
  const sampleRate = audioCtx.sampleRate;
  const duration = 0.06;
  const length = Math.floor(sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  const fadeIn = 0.008; // 8ms soft attack
  const fadeOut = 0.025; // 25ms smooth fade-out

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;

    // Smooth envelope: soft fade-in, body, then gentle fade-out
    let envelope = 1;
    if (t < fadeIn) {
      envelope = t / fadeIn; // linear fade-in
    } else {
      envelope = Math.exp(-(t - fadeIn) * 45); // gentle exponential decay
    }
    // Extra fade-out ramp at the tail to avoid any click
    const tailStart = duration - fadeOut;
    if (t > tailStart) {
      envelope *= 1 - ((t - tailStart) / fadeOut);
    }

    // Warm tone: low-mid fundamental (~520Hz) + soft sub-harmonic
    const tone = Math.sin(2 * Math.PI * 520 * t) * 0.5
               + Math.sin(2 * Math.PI * 340 * t) * 0.3;

    data[i] = envelope * tone * 0.22;
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
    gain.gain.value = 0.22;
    source.connect(gain);
    gain.connect(audioCtx.destination);
    source.start();
  } catch {
    // Silently fail - sound is non-critical
  }
};
