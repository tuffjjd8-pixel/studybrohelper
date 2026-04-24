import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  Label,
  ScatterChart,
  Scatter,
} from "recharts";
import { BarChart3, Table as TableIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  evalEquation,
  type GraphPayload,
  type SolveVisual,
  type TablePayload,
} from "@/lib/solveVisual";

interface SolutionVisualProps {
  visual: SolveVisual;
}

const SAMPLE_COUNT = 80;

function buildLineSeries(p: GraphPayload): Array<{ x: number; y: number }> {
  const xMin = typeof p.x_min === "number" ? p.x_min : -10;
  const xMax = typeof p.x_max === "number" ? p.x_max : 10;
  if (xMax <= xMin) return [];

  // points-based
  if (p.type === "points" && p.points && p.points.length) {
    return p.points
      .slice()
      .sort((a, b) => a[0] - b[0])
      .map(([x, y]) => ({ x, y }));
  }

  // slope/intercept fallback
  if (
    !p.equation &&
    typeof p.slope === "number" &&
    typeof p.intercept === "number"
  ) {
    const m = p.slope;
    const b = p.intercept;
    const out: Array<{ x: number; y: number }> = [];
    const step = (xMax - xMin) / SAMPLE_COUNT;
    for (let i = 0; i <= SAMPLE_COUNT; i++) {
      const x = xMin + step * i;
      out.push({ x, y: m * x + b });
    }
    return out;
  }

  // equation-based
  if (p.equation) {
    const out: Array<{ x: number; y: number }> = [];
    const step = (xMax - xMin) / SAMPLE_COUNT;
    for (let i = 0; i <= SAMPLE_COUNT; i++) {
      const x = xMin + step * i;
      const y = evalEquation(p.equation, x);
      if (y !== null) out.push({ x: round(x), y: round(y) });
    }
    return out;
  }

  return [];
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function GraphVisual({ payload }: { payload: GraphPayload }) {
  const data = useMemo(() => buildLineSeries(payload), [payload]);
  const keyPointEntries = useMemo<Array<[string, [number, number]]>>(() => {
    const entries: Array<[string, [number, number]]> = [];
    if (payload.key_points) {
      for (const [k, v] of Object.entries(payload.key_points)) entries.push([k, v]);
    } else if (payload.vertex) {
      entries.push(["vertex", payload.vertex]);
    }
    return entries;
  }, [payload]);

  if (data.length === 0) return null;

  const isScatter = payload.type === "points" && (!payload.equation && data.length < 30);
  const accent = "hsl(var(--primary))";
  const grid = "hsl(var(--border))";
  const axis = "hsl(var(--muted-foreground))";
  const xLabel = payload.x_label || "x";
  const yLabel = payload.y_label || "y";

  const CustomTooltip = ({ active, payload: tipPayload }: { active?: boolean; payload?: Array<{ payload?: { x: number; y: number } }> }) => {
    if (!active || !tipPayload || !tipPayload.length) return null;
    const point = tipPayload[0]?.payload;
    if (!point || typeof point.x !== "number" || typeof point.y !== "number") return null;
    return (
      <div
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "8px",
          color: "hsl(var(--foreground))",
          padding: "6px 10px",
          fontSize: "12px",
          lineHeight: 1.4,
        }}
      >
        <div>{xLabel}: {round(point.x)}</div>
        <div>{yLabel}: {round(point.y)}</div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {payload.equation ? payload.equation : payload.type === "points" ? "Plot" : "Graph"}
        </span>
      </div>
      <div className="w-full h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          {isScatter ? (
            <ScatterChart margin={{ top: 8, right: 16, left: 8, bottom: 20 }}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                stroke={axis}
                tick={{ fill: axis, fontSize: 11 }}
              >
                <Label value={xLabel} position="insideBottom" offset={-8} fill={axis} fontSize={11} />
              </XAxis>
              <YAxis
                type="number"
                dataKey="y"
                stroke={axis}
                tick={{ fill: axis, fontSize: 11 }}
              >
                <Label value={yLabel} angle={-90} position="insideLeft" fill={axis} fontSize={11} />
              </YAxis>
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: axis, strokeOpacity: 0.3 }} />
              <ReferenceLine x={0} stroke={axis} strokeOpacity={0.4} />
              <ReferenceLine y={0} stroke={axis} strokeOpacity={0.4} />
              <Scatter data={data} fill={accent} />
              {keyPointEntries.map(([k, [x, y]]) => (
                <ReferenceDot key={k} x={x} y={y} r={4} fill={accent} stroke="hsl(var(--background))" strokeWidth={1.5} />
              ))}
            </ScatterChart>
          ) : (
            <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 20 }}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="x"
                type="number"
                domain={["dataMin", "dataMax"]}
                stroke={axis}
                tick={{ fill: axis, fontSize: 11 }}
              >
                <Label value={xLabel} position="insideBottom" offset={-8} fill={axis} fontSize={11} />
              </XAxis>
              <YAxis
                stroke={axis}
                tick={{ fill: axis, fontSize: 11 }}
              >
                <Label value={yLabel} angle={-90} position="insideLeft" fill={axis} fontSize={11} />
              </YAxis>
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: axis, strokeOpacity: 0.3 }} />
              <ReferenceLine x={0} stroke={axis} strokeOpacity={0.4} />
              <ReferenceLine y={0} stroke={axis} strokeOpacity={0.4} />
              <Line
                type="monotone"
                dataKey="y"
                stroke={accent}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              {keyPointEntries.map(([k, [x, y]]) => (
                <ReferenceDot key={k} x={x} y={y} r={4} fill={accent} stroke="hsl(var(--background))" strokeWidth={1.5} />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      {keyPointEntries.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          {keyPointEntries
            .map(([k, [x, y]]) => `${k}: (${x}, ${y})`)
            .join(" · ")}
        </p>
      )}
      {keyPointEntries.length === 0 && payload.vertex && (
        <p className="text-xs text-muted-foreground mt-2">
          Vertex: ({payload.vertex[0]}, {payload.vertex[1]})
        </p>
      )}
    </div>
  );
}

function TableVisual({ payload }: { payload: TablePayload }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <TableIcon className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Table
        </span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-primary/30 hover:bg-transparent">
              {payload.columns.map((c, i) => (
                <TableHead
                  key={i}
                  className="text-primary font-bold uppercase tracking-wide text-xs bg-primary/10"
                >
                  {c}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payload.rows.map((row, rIdx) => (
              <TableRow key={rIdx} className="border-border/40">
                {row.map((cell, cIdx) => (
                  <TableCell key={cIdx} className="text-foreground/90 font-mono text-sm">
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function SolutionVisual({ visual }: SolutionVisualProps) {
  if (visual.visual_type === "graph") return <GraphVisual payload={visual.visual_payload} />;
  if (visual.visual_type === "table") return <TableVisual payload={visual.visual_payload} />;
  return null;
}
