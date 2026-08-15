"use client";

import { useEffect, useRef } from "react";

type AdminChartProps = {
  comparison?: boolean;
  accent?: "blue" | "orange";
  data?: number[];
  previous?: number[];
};
type SparklineProps = { tone?: "blue" | "orange" | "green" | "red" | "purple"; data?: number[] };

const sparklineColors = {
  blue: "#2277ee",
  orange: "#f58b20",
  green: "#1aa873",
  red: "#ed5353",
  purple: "#8057e8",
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

export function AdminLineChart({
  comparison = false,
  accent = "blue",
  data,
  previous,
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
      const pad = { top: 12, right: 8, bottom: 22, left: 48 };
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
        context.fillText(String(Math.round(value)), 0, y + 3);
        context.strokeStyle = "#e6edf3";
        context.lineWidth = 1;
        context.setLineDash([3, 4]);
        context.beginPath();
        context.moveTo(pad.left, y);
        context.lineTo(width - pad.right, y);
        context.stroke();
      });
      context.setLineDash([]);
      const drawLine = (series: number[], color: string, dashed = false) => {
        if (!series.length) return;
        context.beginPath();
        context.strokeStyle = color;
        context.lineWidth = dashed ? 1.5 : 2.2;
        context.setLineDash(dashed ? [4, 4] : []);
        series.forEach((value, index) => {
          const currentPoint = point(value, index, series.length);
          if (index === 0) context.moveTo(currentPoint.x, currentPoint.y);
          else context.lineTo(currentPoint.x, currentPoint.y);
        });
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
  }, [accent, comparison, current, prior]);
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
      const max = Math.max(...series, 1);
      context.beginPath();
      context.strokeStyle = sparklineColors[tone];
      context.lineWidth = 1.7;
      series.forEach((value, index) => {
        const x = series.length <= 1 ? width / 2 : (index / (series.length - 1)) * width;
        const y = 4 + (1 - value / max) * (height - 8);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
    };
    draw();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(draw);
    observer?.observe(canvas);
    return () => observer?.disconnect();
  }, [series, tone]);
  return series.length ? (
    <canvas
      ref={canvasRef}
      className="mt-3 block h-7 w-full"
      role="img"
      aria-label="Tendencia del indicador"
    />
  ) : (
    <div className="mt-3 h-7 border-b border-dashed border-[#dce6ee]" aria-hidden="true" />
  );
}
