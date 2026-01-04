import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface GraphDataset {
  label: string;
  data: number[];
  borderColor?: string;
  fill?: boolean;
}

interface GraphData {
  type: string;
  title?: string;
  xLabel?: string;
  yLabel?: string;
  labels: number[];
  datasets: GraphDataset[];
  equation?: string;
  domain?: string;
  range?: string;
}

interface GraphRendererProps {
  graph: {
    type: string;
    data: Record<string, unknown>;
  };
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

export const GraphRenderer = ({ graph }: GraphRendererProps) => {
  const graphData = graph.data as unknown as GraphData;

  // Transform data for Recharts format
  const chartData = useMemo(() => {
    if (!graphData.labels || !graphData.datasets?.[0]?.data) {
      return [];
    }

    return graphData.labels.map((x, index) => {
      const point: Record<string, number> = { x };
      graphData.datasets.forEach((dataset, i) => {
        point[`y${i}`] = dataset.data[index];
      });
      return point;
    });
  }, [graphData]);

  if (!chartData.length) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-muted-foreground">Unable to render graph data</p>
      </div>
    );
  }

  const renderChart = () => {
    const type = graphData.type?.toLowerCase() || "line";

    switch (type) {
      case "bar":
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="x"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              label={{
                value: graphData.xLabel || "x",
                position: "insideBottom",
                offset: -5,
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              label={{
                value: graphData.yLabel || "y",
                angle: -90,
                position: "insideLeft",
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))",
              }}
            />
            <Legend />
            {graphData.datasets.map((dataset, index) => (
              <Bar
                key={index}
                dataKey={`y${index}`}
                name={dataset.label}
                fill={dataset.borderColor || COLORS[index % COLORS.length]}
              />
            ))}
          </BarChart>
        );

      case "scatter":
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="x"
              type="number"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              label={{
                value: graphData.xLabel || "x",
                position: "insideBottom",
                offset: -5,
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <YAxis
              dataKey="y0"
              type="number"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              label={{
                value: graphData.yLabel || "y",
                angle: -90,
                position: "insideLeft",
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))",
              }}
            />
            <Legend />
            {graphData.datasets.map((dataset, index) => (
              <Scatter
                key={index}
                name={dataset.label}
                data={chartData}
                fill={dataset.borderColor || COLORS[index % COLORS.length]}
              />
            ))}
          </ScatterChart>
        );

      // Default: line chart (also handles "parabola")
      default:
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="x"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              label={{
                value: graphData.xLabel || "x",
                position: "insideBottom",
                offset: -5,
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              label={{
                value: graphData.yLabel || "y",
                angle: -90,
                position: "insideLeft",
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))",
              }}
            />
            <Legend />
            {graphData.datasets.map((dataset, index) => (
              <Line
                key={index}
                type="monotone"
                dataKey={`y${index}`}
                name={dataset.label}
                stroke={dataset.borderColor || COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ fill: dataset.borderColor || COLORS[index % COLORS.length], r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="space-y-4">
        {/* Title */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-secondary uppercase tracking-wider">
            Graph Visualization
          </h3>
          {graphData.equation && (
            <span className="text-sm font-mono text-primary">
              {graphData.equation}
            </span>
          )}
        </div>

        {/* Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>

        {/* Domain/Range info */}
        {(graphData.domain || graphData.range) && (
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            {graphData.domain && (
              <span>
                <span className="font-medium">Domain:</span> {graphData.domain}
              </span>
            )}
            {graphData.range && (
              <span>
                <span className="font-medium">Range:</span> {graphData.range}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
