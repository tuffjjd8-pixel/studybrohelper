import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";

const SEGMENTS = [
  { label: "5%", value: 5, color: "hsl(82, 80%, 35%)", weight: 25 },
  { label: "10%", value: 10, color: "hsl(82, 70%, 28%)", weight: 22 },
  { label: "15%", value: 15, color: "hsl(82, 80%, 35%)", weight: 18 },
  { label: "20%", value: 20, color: "hsl(82, 70%, 28%)", weight: 15 },
  { label: "25%", value: 25, color: "hsl(82, 80%, 35%)", weight: 10 },
  { label: "30%", value: 30, color: "hsl(82, 70%, 28%)", weight: 7 },
  { label: "50%", value: 50, color: "hsl(50, 90%, 50%)", weight: 2 },
  { label: "VIP", value: 0, color: "hsl(82, 60%, 22%)", weight: 1 },
];

const TOTAL_WEIGHT = SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
const SEGMENT_ANGLE = 360 / SEGMENTS.length;

function pickSegment(): number {
  let r = Math.random() * TOTAL_WEIGHT;
  for (let i = 0; i < SEGMENTS.length; i++) {
    r -= SEGMENTS[i].weight;
    if (r <= 0) return i;
  }
  return 0;
}

interface SpinWheelProps {
  onResult?: (discount: number) => void;
}

export function SpinWheel({ onResult }: SpinWheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const hasSpun = useRef(false);

  const spin = useCallback(() => {
    if (spinning || hasSpun.current) return;
    setResult(null);
    const winIndex = pickSegment();
    // The pointer is at the top (12 o'clock). We need the winning segment's center
    // to land under the pointer. Segment 0 starts at 0° going clockwise.
    const segCenter = winIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const fullSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full rotations
    // We rotate clockwise; pointer at top means we need (360 - segCenter) offset
    const targetAngle = fullSpins * 360 + (360 - segCenter);
    setRotation((prev) => prev + targetAngle);
    setSpinning(true);

    setTimeout(() => {
      setSpinning(false);
      hasSpun.current = true;
      const discount = SEGMENTS[winIndex].value;
      setResult(discount);
      onResult?.(discount);
    }, 4000);
  }, [spinning, onResult]);

  const radius = 120;
  const cx = 140;
  const cy = 140;

  function segmentPath(index: number) {
    const startAngle = (index * SEGMENT_ANGLE - 90) * (Math.PI / 180);
    const endAngle = ((index + 1) * SEGMENT_ANGLE - 90) * (Math.PI / 180);
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;
    return `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`;
  }

  function labelPos(index: number) {
    const midAngle = ((index + 0.5) * SEGMENT_ANGLE - 90) * (Math.PI / 180);
    const r = radius * 0.65;
    return { x: cx + r * Math.cos(midAngle), y: cy + r * Math.sin(midAngle) };
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-0.5">Applies to:</p>
        <p className="font-heading font-bold text-foreground text-sm">
          Premium Monthly ($7.99)
        </p>
        <p className="text-2xl font-heading font-bold text-foreground mt-1">
          $7.99
          <span className="text-sm font-normal text-muted-foreground">/month</span>
        </p>
        <p className="text-xs text-muted-foreground">
          ≈ $4.99/month · Save $12/year
        </p>
      </div>

      {/* Wheel */}
      <div className="relative w-[280px] h-[280px]">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl scale-110" />

        {/* Pointer at top */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent border-t-primary drop-shadow-[0_0_6px_hsl(82,100%,67%)]" />

        {/* Spinning wheel */}
        <motion.div
          className="w-full h-full"
          animate={{ rotate: rotation }}
          transition={{
            duration: 4,
            ease: [0.2, 0.8, 0.3, 1],
          }}
        >
          <svg viewBox="0 0 280 280" className="w-full h-full drop-shadow-lg">
            {/* Outer ring */}
            <circle cx={cx} cy={cy} r={radius + 6} fill="none" stroke="hsl(82,60%,30%)" strokeWidth="3" />
            <circle cx={cx} cy={cy} r={radius + 2} fill="none" stroke="hsl(82,80%,50%)" strokeWidth="1" opacity="0.4" />

            {/* Segments */}
            {SEGMENTS.map((seg, i) => (
              <path key={i} d={segmentPath(i)} fill={seg.color} stroke="hsl(0,0%,10%)" strokeWidth="1.5" />
            ))}

            {/* Labels */}
            {SEGMENTS.map((seg, i) => {
              const pos = labelPos(i);
              const angle = (i + 0.5) * SEGMENT_ANGLE;
              return (
                <text
                  key={`t-${i}`}
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={seg.value === 50 ? "#1a1a1a" : "#fff"}
                  fontSize={seg.value === 50 || seg.label === "VIP" ? "13" : "11"}
                  fontWeight="bold"
                  fontFamily="sans-serif"
                  transform={`rotate(${angle}, ${pos.x}, ${pos.y})`}
                >
                  {seg.label}
                </text>
              );
            })}

            {/* Center circle */}
            <circle cx={cx} cy={cy} r="32" fill="hsl(82,70%,45%)" />
            <circle cx={cx} cy={cy} r="28" fill="hsl(82,80%,40%)" />
          </svg>
        </motion.div>

        {/* SPIN button in center */}
        <button
          onClick={spin}
          disabled={spinning || hasSpun.current}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-14 h-14 rounded-full bg-primary text-primary-foreground font-heading font-bold text-xs uppercase tracking-wider shadow-lg disabled:opacity-60 hover:brightness-110 transition-all"
        >
          {spinning ? "..." : hasSpun.current ? "✓" : "SPIN"}
        </button>
      </div>

      {/* Result */}
      {result !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-3 rounded-xl bg-primary/10 border border-primary/30"
        >
          {result > 0 ? (
            <>
              <p className="text-lg font-heading font-bold text-primary">
                🎉 {result}% OFF!
              </p>
              <p className="text-xs text-muted-foreground">
                Premium Monthly now ${(7.99 * (1 - result / 100)).toFixed(2)}/month
              </p>
            </>
          ) : (
            <p className="text-sm font-heading font-bold text-primary">
              🌟 VIP — Try again next time!
            </p>
          )}
        </motion.div>
      )}

      <p className="text-center text-xs text-primary font-medium">
        Spin to unlock a discount on Premium Monthly ($7.99)
      </p>
    </div>
  );
}
