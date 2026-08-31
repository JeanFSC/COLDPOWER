"use client";

import { useEffect, useRef } from "react";

type AdminChartProps = {
  comparison?: boolean;
  accent?: "blue" | "orange";
  data?: number[];
  previous?: number[];
  labels?: string[];
  currencyAxis?: boolean;
};
type SparklineProps = { tone?: "blue" | "orange" | "green" | "red" | "purple"; data?: number[] };

const sparklineColors = {
  blue: "#2277ee",
  orange: "#f58b20",
  green: "#1aa873",
  red: "#ed5353",
  purple: "#8057e8",
};
const sparklineFills = {
  blue: "rgba(34,119,238,0.14)",
  orange: "rgba(245,139,32,0.14)",
  green: "rgba(26,168,115,0.14)",
  red: "rgba(237,83,83,0.14)",
  purple: "rgba(128,87,232,0.14)",
};

function validSeries(series?: number[]) {
  return series?.filter((value) => Number.isFinite(value)) ?? [];
}
function setupCanvas(canvas: HTMLCanvasElement) {
  const bounds = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(bounds.width, 320);
  const height = Math.max(bounds.height, 180);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  return { context, width, height };
}

function formatSalesAxisValue(value: number) {
  if (!Number.isFinite(value) || value === 0) return "S/ 0";
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `S/ ${(value / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `S/ ${(value / 1_000).toFixed(absolute >= 10_000 ? 0 : 1)}k`;
  return `S/ ${Math.round(value)}`;
}

function drawSmoothSparkline(
  context: CanvasRenderingContext2D,
  series: number[],
  tone: keyof typeof sparklineColors,
  width: number,
  height: number,
) {
  const max = Math.max(...series, 1);
  const minY = 4;
  const maxY = height - 5;
  const points = series.map((value, index) => ({
    x: series.length <= 1 ? width / 2 : (index / (series.length - 1)) * width,
    y: maxY - (value / max) * (maxY - minY),
  }));
  if (!points.length) return;

  const drawPath = () => {
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    if (points.length === 2) {
      const midpointX = (points[0].x + points[1].x) / 2;
      const midpointY = (points[0].y + points[1].y) / 2;
      const bend = Math.max(2, Math.min(7, height * 0.18));
      context.quadraticCurveTo(midpointX, Math.min(maxY, midpointY + bend), points[1].x, points[1].y);
      return;
    }
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const midpointX = (previous.x + current.x) / 2;
      const midpointY = (previous.y + current.y) / 2;
      context.quadraticCurveTo(previous.x, previous.y, midpointX, midpointY);
      if (index === points.length - 1) {
        context.quadraticCurveTo(midpointX, midpointY, current.x, current.y);
      }
    }
  };

  const fill = context.createLinearGradient(0, 0, 0, height);
  fill.addColorStop(0, sparklineFills[tone]);
  fill.addColorStop(1, "rgba(255,255,255,0)");
  drawPath();
  context.lineTo(points.at(-1)?.x ?? width, height);
  context.lineTo(points[0].x, height);
  context.closePath();
  context.fillStyle = fill;
  context.fill();

  drawPath();
  context.strokeStyle = sparklineColors[tone];
  context.lineWidth = 1.7;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.stroke();
}

export function AdminLineChart({
  comparison = false,
  accent = "blue",
  data,
  previous,
  labels,
  currencyAxis = false,
}: AdminChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const current = validSeries(data);
  const prior = validSeries(previous);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !current.length) return;
    const draw = () => {
      const setup = setupCanvas(canvas);
      if (!setup) return;
      const { context, width, height } = setup;
      const pad = { top: 12, right: 8, bottom: 30, left: currencyAxis ? 54 : 48 };
      const chartWidth = width - pad.left - pad.right;
      const chartHeight = height - pad.top - pad.bottom;
      const line = accent === "orange" ? "#f58b20" : "#2277ee";
      const all = [...current, ...prior];
      const max = Math.max(...all, 1);
      const point = (value: number, index: number, length: number) => ({
        x: pad.left + (length <= 1 ? chartWidth / 2 : (index / (length - 1)) * chartWidth),
        y: pad.top + (1 - value / max) * chartHeight,
      });
      context.font = "10px IBM Plex Sans, Arial, sans-serif";
      context.fillStyle = "#8195aa";
      context.textAlign = "left";
      [max, max * 0.75, max * 0.5, max * 0.25, 0].forEach((value, index) => {
        const y = pad.top + (index / 4) * chartHeight;
        context.fillText(currencyAxis ? formatSalesAxisValue(value) : String(Math.round(value)), 0, y + 3);
        context.strokeStyle = "#e6edf3";
        context.lineWidth = 1;
        context.setLineDash([3, 4]);
        context.beginPath();
        context.moveTo(pad.left, y);
        context.lineTo(width - pad.right, y);
        context.stroke();
      });
      if (labels?.length) {
        context.setLineDash([]);
        context.textAlign = "center";
        context.fillStyle = "#8195aa";
        const visibleCount = Math.min(labels.length, 5);
        const labelIndexes = Array.from({ length: visibleCount }, (_, index) =>
          visibleCount === 1 ? 0 : Math.round((index / (visibleCount - 1)) * (labels.length - 1)),
        );
        for (const index of labelIndexes) {
          const currentPoint = point(current[index] ?? 0, index, current.length);
          context.fillText(labels[index] ?? "", currentPoint.x, height - 7);
        }
        context.textAlign = "left";
      }
      context.setLineDash([]);
      const drawLine = (series: number[], color: string, dashed = false) => {
        if (!series.length) return;
        context.beginPath();
        context.strokeStyle = color;
        context.lineWidth = dashed ? 1.5 : 2.2;
        context.setLineDash(dashed ? [4, 4] : []);
        const points = series.map((value, index) => point(value, index, series.length));
        context.moveTo(points[0].x, points[0].y);
        for (let index = 1; index < points.length; index += 1) {
          const previousPoint = points[index - 1];
          const currentPoint = points[index];
          const midpointX = (previousPoint.x + currentPoint.x) / 2;
          const midpointY = (previousPoint.y + currentPoint.y) / 2;
          context.quadraticCurveTo(previousPoint.x, previousPoint.y, midpointX, midpointY);
          if (index === points.length - 1) {
            context.quadraticCurveTo(midpointX, midpointY, currentPoint.x, currentPoint.y);
          }
        }
        context.stroke();
        context.setLineDash([]);
      };
      drawLine(current, line);
      if (comparison) drawLine(prior, "#94c2ff", true);
    };
    draw();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(draw);
    observer?.observe(canvas);
    return () => observer?.disconnect();
  }, [accent, comparison, currencyAxis, current, labels, prior]);
  if (!current.length)
    return (
      <div className="flex h-[190px] items-center justify-center rounded-lg border border-dashed border-[#dce6ee] bg-[#fbfcfd] text-[11px] font-semibold text-[#8296a9]">
        Aún no hay datos suficientes para este reporte.
      </div>
    );
  return (
    <canvas
      ref={canvasRef}
      className="block h-[190px] w-full"
      role="img"
      aria-label="Gráfico de evolución del período"
    />
  );
}

export function AdminSparkline({ tone = "blue", data }: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const series = validSeries(data);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !series.length) return;
    const draw = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(bounds.width, 120);
      const height = Math.max(bounds.height, 30);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      drawSmoothSparkline(context, series, tone, width, height);
    };
    draw();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(draw);
    observer?.observe(canvas);
    return () => observer?.disconnect();
  }, [series, tone]);
  return series.length ? (
    <canvas
      ref={canvasRef}
      className="mt-3 block h-8 w-full"
      role="img"
      aria-label="Tendencia del indicador"
    />
  ) : (
    <div className="mt-3 h-8 border-b border-dashed border-[#dce6ee]" aria-hidden="true" />
  );
}
