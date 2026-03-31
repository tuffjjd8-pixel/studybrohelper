import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { Scene1Hook } from "./scenes/Scene1Hook";
import { Scene2CameraSnap } from "./scenes/Scene2CameraSnap";
import { Scene3SolutionReveal } from "./scenes/Scene3SolutionReveal";
import { Scene4SpeedMontage } from "./scenes/Scene4SpeedMontage";
import { Scene5Features } from "./scenes/Scene5Features";
import { Scene6Premium } from "./scenes/Scene6Premium";
import { Scene7EndCard } from "./scenes/Scene7EndCard";

// 30s at 30fps = 900 frames total
// Scene durations (before transition overlap):
// S1: 75, S2: 75, S3: 110, S4: 110, S5: 140, S6: 200, S7: 140
// Transitions: 6 × ~15 frames = 90 overlap
// Total: 850 - 90 = ~760, pad scenes to hit 900

export const MainVideo: React.FC = () => {
  return (
    <TransitionSeries>
      {/* Scene 1: Hook — "2 hours" */}
      <TransitionSeries.Sequence durationInFrames={80}>
        <Scene1Hook />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 12 })}
      />

      {/* Scene 2: Camera snap — "until I found this" */}
      <TransitionSeries.Sequence durationInFrames={80}>
        <Scene2CameraSnap />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={wipe({ direction: "from-right" })}
        timing={linearTiming({ durationInFrames: 10 })}
      />

      {/* Scene 3: Solution reveal — "Solved. Instantly." */}
      <TransitionSeries.Sequence durationInFrames={120}>
        <Scene3SolutionReveal />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-left" })}
        timing={linearTiming({ durationInFrames: 12 })}
      />

      {/* Scene 4: Speed montage — whip pan through screens */}
      <TransitionSeries.Sequence durationInFrames={110}>
        <Scene4SpeedMontage />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />

      {/* Scene 5: Features flash — card grid */}
      <TransitionSeries.Sequence durationInFrames={140}>
        <Scene5Features />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={wipe({ direction: "from-bottom" })}
        timing={linearTiming({ durationInFrames: 12 })}
      />

      {/* Scene 6: Premium + social proof */}
      <TransitionSeries.Sequence durationInFrames={220}>
        <Scene6Premium />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 18 })}
      />

      {/* Scene 7: End card — logo + CTA */}
      <TransitionSeries.Sequence durationInFrames={159}>
        <Scene7EndCard />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
