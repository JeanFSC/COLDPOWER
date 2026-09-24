"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type AdminChartPoint = {
  date: string;
  total: number;
  count: number;
  orders?: number;
  units?: number;
  previousTotal?: number;
  href?: string;
};

type AdminChartProps = {
  comparison?: boolean;
  accent?: "blue" | "orange";
  data?: number[];
  previous?: number[];
  margin?: Array<number | null | undefined>;
  compact?: boolean;
  filled?: boolean;
  /** Stretch to the parent's height instead of a fixed px height — for call sites that
   * put the chart in a flex/grid cell whose height is set by a sibling panel. */
  fillHeight?: boolean;
  /** Bigger axis tick labels for a chart rendered large/standalone rather than as a
   * small embedded widget. Opt-in so existing compact call sites keep their size. */
  largeLabels?: boolean;
  labels?: string[];
  currencyAxis?: boolean;
  currency?: string | null;
  pointDetails?: AdminChartPoint[];
  ariaLabel?: string;
};
type SparklineProps = {
  tone?: "blue" | "orange" | "green" | "red" | "purple";
  data?: number[];
  ariaLabel?: string;
  className?: string;
};

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
function formatMoney(value: number, currency: string | null | undefined, maximumFractionDigits = 0) {
  if (!currency || !Number.isFinite(value)) return "N/D";
  return new Intl.NumberFormat("es-PE", { style: "currency", currency, maximumFractionDigits }).format(value);
}

function formatSalesAxisValue(value: number, currency: string | null | undefined) {
  const symbol = currency === "USD" ? "US$" : currency === "PEN" ? "S/" : currency ?? "";
  if (!Number.isFinite(value) || value === 0) return `${symbol} 0`;
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${symbol} ${(value / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${symbol} ${(value / 1_000).toFixed(absolute >= 10_000 ? 0 : 1)}k`;
  return `${symbol} ${Math.round(value)}`;
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
  margin,
  compact = false,
  filled = false,
  fillHeight = false,
  largeLabels = false,
  labels,
  currencyAxis = false,
  currency,
  pointDetails,
  ariaLabel = "Gráfico de tendencia",
}: AdminChartProps) {
  const current = useMemo(() => validSeries(data), [data]);
  const prior = useMemo(() => validSeries(previous), [previous]);
  const marginValues = useMemo(() => margin?.map((value) => (typeof value === "number" && Number.isFinite(value) ? value : null)) ?? [], [margin]);
  const hasMargin = marginValues.some((value) => value !== null);
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const gradientId = useId();
  if (!current.length)
    return (
      <div role="group" aria-label={ariaLabel} className="flex h-[190px] items-center justify-center rounded-lg border border-dashed border-[#dce6ee] bg-[#fbfcfd] text-[11px] font-semibold text-[#8296a9]">
        Aún no hay datos suficientes para este reporte.
      </div>
    );
  const viewBox = { width: 1000, height: compact ? 126 : 190 };
  const pad = {
    top: compact ? 10 : largeLabels ? 16 : 12,
    right: hasMargin ? (compact ? 38 : largeLabels ? 44 : 40) : (compact ? 8 : largeLabels ? 14 : 8),
    bottom: compact ? 23 : largeLabels ? 36 : 30,
    left: currencyAxis ? (compact ? 43 : largeLabels ? 62 : 54) : largeLabels ? 58 : 48,
  };
  const chartWidth = viewBox.width - pad.left - pad.right;
  const chartHeight = viewBox.height - pad.top - pad.bottom;
  const max = Math.max(...current, ...prior, 1);
  const line = accent === "orange" ? "#f58b20" : "#2277ee";
  const point = (value: number, index: number, length: number) => ({
    x: pad.left + (length <= 1 ? chartWidth / 2 : (index / (length - 1)) * chartWidth),
    y: pad.top + (1 - value / max) * chartHeight,
  });
  const currentPoints = current.map((value, index) => point(value, index, current.length));
  const priorPoints = prior.map((value, index) => point(value, index, prior.length));
  const dayWidth = current.length > 1 ? chartWidth / (current.length - 1) : chartWidth;
  // Scale the margin (%) line to its own real peak instead of a fixed 50% ceiling — a fixed
  // cap silently clipped any day above 50% margin into a flat plateau, which reads as a
  // rendering bug rather than real data.
  const marginPeak = marginValues.reduce<number>((peak, value) => (value !== null && value > peak ? value : peak), 0);
  const marginMax = hasMargin ? Math.min(1, Math.max(0.2, Math.ceil((marginPeak * 1.15) / 0.05) * 0.05)) : 0.5;
  const marginPoints = marginValues.map((value, index) => value === null ? null : {
    x: pad.left + (marginValues.length <= 1 ? chartWidth / 2 : (index / (marginValues.length - 1)) * chartWidth),
    y: pad.top + (1 - Math.min(Math.max(value, 0), marginMax) / marginMax) * chartHeight,
  });
  const smoothPath = (points: Array<{ x: number; y: number }>) => {
    if (!points.length) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let index = 0; index < points.length - 1; index += 1) {
      const previous = points[index - 1] ?? points[index];
      const start = points[index];
      const end = points[index + 1];
      const next = points[index + 2] ?? end;
      const controlOne = { x: start.x + (end.x - previous.x) / 6, y: start.y + (end.y - previous.y) / 6 };
      const controlTwo = { x: end.x - (next.x - start.x) / 6, y: end.y - (next.y - start.y) / 6 };
      path += ` C ${controlOne.x} ${controlOne.y}, ${controlTwo.x} ${controlTwo.y}, ${end.x} ${end.y}`;
    }
    return path;
  };
  const groupSegments = (points: Array<{ x: number; y: number } | null>) => {
    const segments: Array<Array<{ x: number; y: number }>> = [];
    let segment: Array<{ x: number; y: number }> = [];
    for (const point of points) {
      if (point) segment.push(point);
      else if (segment.length) {
        segments.push(segment);
        segment = [];
      }
    }
    if (segment.length) segments.push(segment);
    return segments;
  };
  const yTicks = [max, max * 0.75, max * 0.5, max * 0.25, 0];
  const visibleCount = labels?.length ? Math.min(labels.length, compact ? 6 : 5) : 0;
  const labelIndexes = Array.from({ length: visibleCount }, (_, index) => visibleCount === 1 ? 0 : Math.round((index / (visibleCount - 1)) * (labels!.length - 1)));
  const gradientElementId = `admin-chart-area-${gradientId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const floorY = pad.top + chartHeight;
  const areaPath = filled && currentPoints.length ? `${smoothPath(currentPoints)} L ${currentPoints.at(-1)!.x} ${floorY} L ${currentPoints[0].x} ${floorY} Z` : "";
  // Margin has no value on days with zero confirmed sales (division by zero), so its line only
  // covers the days that actually have one — rendered as disconnected segments rather than
  // interpolating through days where the metric is genuinely undefined. Small end-cap dots mark
  // where a segment starts/stops so a gap reads as "no data here", not as a broken line.
  const marginSegmentGroups = groupSegments(marginPoints);
  const marginPath = marginSegmentGroups.map(smoothPath).join(" ");
  const marginEndpoints = marginSegmentGroups.flatMap((segment) => segment.length > 1 ? [segment[0], segment[segment.length - 1]] : segment);
  return (
    <div role="group" aria-label={ariaLabel} className={`relative w-full ${fillHeight ? "h-full min-h-[190px]" : compact ? "h-[126px]" : "h-[210px] sm:h-[190px]"}`} onMouseLeave={() => setActivePoint(null)}>
      <p className="sr-only">{ariaLabel}. Valores actuales: {current.map((value, index) => `${labels?.[index] ?? `Punto ${index + 1}`}: ${currencyAxis ? formatMoney(value, currency) : Math.round(value)}`).join("; ")}.</p>
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead><tr><th scope="col">Período</th><th scope="col">Actual</th>{comparison ? <th scope="col">Anterior</th> : null}</tr></thead>
        <tbody>{current.map((value, index) => <tr key={`accessible-${index}`}><th scope="row">{labels?.[index] ?? `Punto ${index + 1}`}</th><td>{currencyAxis ? formatMoney(value, currency) : Math.round(value)}</td>{comparison ? <td>{prior[index] === undefined ? "N/D" : currencyAxis ? formatMoney(prior[index], currency) : Math.round(prior[index])}</td> : null}</tr>)}</tbody>
      </table>
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${viewBox.width} ${viewBox.height}`} preserveAspectRatio="none" aria-hidden="true">
        {filled ? (
          <defs>
            <linearGradient id={gradientElementId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={line} stopOpacity="0.28" />
              <stop offset="100%" stopColor={line} stopOpacity="0" />
            </linearGradient>
          </defs>
        ) : null}
        {yTicks.map((value, index) => {
          const y = pad.top + (index / 4) * chartHeight;
          return <line key={`grid-${index}`} x1={pad.left} x2={viewBox.width - pad.right} y1={y} y2={y} stroke="#e6edf3" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />;
        })}
        {largeLabels ? (
          <>
            <line x1={pad.left} x2={pad.left} y1={pad.top} y2={pad.top + chartHeight} stroke="#d3dce3" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            {yTicks.map((value, index) => {
              const y = pad.top + (index / 4) * chartHeight;
              return <line key={`y-tick-${index}`} x1={pad.left - 5} x2={pad.left} y1={y} y2={y} stroke="#9aabba" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />;
            })}
            {hasMargin ? (
              <>
                <line x1={viewBox.width - pad.right} x2={viewBox.width - pad.right} y1={pad.top} y2={pad.top + chartHeight} stroke="#bfe2cf" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                {[marginMax, marginMax * 0.75, marginMax * 0.5, marginMax * 0.25, 0].map((value, index) => {
                  const y = pad.top + (index / 4) * chartHeight;
                  return <line key={`margin-tick-${index}`} x1={viewBox.width - pad.right} x2={viewBox.width - pad.right + 6} y1={y} y2={y} stroke="#4fa87c" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />;
                })}
              </>
            ) : null}
          </>
        ) : null}
        {filled && areaPath ? <path d={areaPath} fill={`url(#${gradientElementId})`} stroke="none" /> : null}
        {comparison && priorPoints.length ? <path d={smoothPath(priorPoints)} fill="none" stroke="#94c2ff" strokeDasharray="4 4" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /> : null}
        <path d={smoothPath(currentPoints)} fill="none" stroke={line} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
        {hasMargin ? <path d={marginPath} fill="none" stroke="#159263" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" vectorEffect="non-scaling-stroke" /> : null}
        {hasMargin ? marginEndpoints.map((endpoint, index) => (
          <circle key={`margin-endpoint-${index}`} cx={endpoint.x} cy={endpoint.y} r="3" fill="#fff" stroke="#159263" strokeWidth="1.7" vectorEffect="non-scaling-stroke" />
        )) : null}
      </svg>
      <div className={`pointer-events-none absolute inset-0 font-semibold text-[#8195aa] ${largeLabels ? "text-[12px] font-bold" : "text-[10px]"}`}>
        {yTicks.map((value, index) => <span key={`y-label-${index}`} className={`absolute left-0 -translate-y-1/2 whitespace-nowrap ${largeLabels ? "text-right" : ""}`} style={{ top: `${((pad.top + (index / 4) * chartHeight) / viewBox.height) * 100}%`, width: largeLabels ? `${((pad.left - 14) / viewBox.width) * 100}%` : undefined }}>{currencyAxis ? formatSalesAxisValue(value, currency) : Math.round(value)}</span>)}
        {hasMargin ? [marginMax, marginMax * 0.75, marginMax * 0.5, marginMax * 0.25, 0].map((value, index) => <span key={`margin-label-${index}`} className={`absolute right-0 -translate-y-1/2 whitespace-nowrap font-bold text-[#159263]`} style={{ top: `${((pad.top + (index / 4) * chartHeight) / viewBox.height) * 100}%` }}>{Math.round(value * 100)}%</span>) : null}
        {labelIndexes.map((index) => {
          const currentPoint = currentPoints[index] ?? currentPoints[0];
          if (!currentPoint) return null;
          return <span key={`x-label-${index}`} className={`absolute bottom-0 whitespace-nowrap ${index === 0 ? "-translate-x-0" : index === labelIndexes.at(-1) ? "-translate-x-full" : "-translate-x-1/2"}`} style={{ left: `${(currentPoint.x / viewBox.width) * 100}%` }}>{labels?.[index] ?? ""}</span>;
        })}
      </div>
      {comparison ? priorPoints.map((position, index) => (
        <span key={`prior-point-${index}`} className="pointer-events-none absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-[#94c2ff] bg-white" style={{ left: `${(position.x / viewBox.width) * 100}%`, top: `${(position.y / viewBox.height) * 100}%` }} aria-hidden="true" />
      )) : null}
      {pointDetails?.length
        ? pointDetails.slice(0, currentPoints.length).map((detail, index) => (
            <span key={`point-${index}`} className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#2277ee] bg-white" style={{ left: `${(currentPoints[index]!.x / viewBox.width) * 100}%`, top: `${(currentPoints[index]!.y / viewBox.height) * 100}%` }} aria-hidden="true" />
          ))
        : currentPoints.map((position, index) => <span key={`point-${index}`} className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#2277ee] bg-white" style={{ left: `${(position.x / viewBox.width) * 100}%`, top: `${(position.y / viewBox.height) * 100}%` }} aria-hidden="true" />)}
      {pointDetails?.length ? pointDetails.slice(0, currentPoints.length).map((detail, index) => {
        const position = currentPoints[index];
        if (!position) return null;
        const marginValue = marginValues[index];
        // Hover/focus target spans the day's whole column (full chart height), not just an
        // 8px dot — so pointing anywhere near that day, including at the margin (green) line
        // which sits at a different height, still surfaces this tooltip.
        const columnWidth = Math.max(16, Math.min(dayWidth, 60));
        const tooltip = activePoint === index ? (
          <span className={`pointer-events-none absolute z-10 w-56 rounded-lg border border-[#dce6ee] bg-[#102a43] px-3.5 py-2.5 text-left text-[11px] font-semibold text-white shadow-[0_8px_20px_rgba(16,42,67,0.18)] ${position.y < 70 ? "top-[calc(100%+10px)]" : "bottom-[calc(100%+10px)]"} ${index < 2 ? "left-0" : index >= currentPoints.length - 2 ? "right-0" : "left-1/2 -translate-x-1/2"}`}>
            <strong className="block text-[11px] text-white">{detail.date.replace("T", " · ")}</strong>
            <span className="mt-1.5 flex items-center justify-between gap-3"><span className="text-[#c8d8e7]">Ventas</span><b>{formatMoney(detail.total, currency, 2)}</b></span>
            <span className="mt-1 flex items-center justify-between gap-3"><span className="text-[#c8d8e7]">Ventas confirmadas</span><b>{detail.count}</b></span>
            {detail.units !== undefined ? <span className="mt-1 flex items-center justify-between gap-3"><span className="text-[#c8d8e7]">Unidades</span><b>{detail.units}</b></span> : null}
            {marginValue !== null && marginValue !== undefined ? <span className="mt-1 flex items-center justify-between gap-3"><span className="flex items-center gap-1.5 text-[#c8d8e7]"><i className="h-1.5 w-1.5 rounded-full bg-[#3fbf87]" />Margen bruto</span><b>{(marginValue * 100).toFixed(1)}%</b></span> : null}
            {detail.previousTotal !== undefined ? <span className="mt-1 flex items-center justify-between gap-3 border-t border-white/15 pt-1"><span className="text-[#c8d8e7]">Período anterior</span><b>{formatMoney(detail.previousTotal, currency, 2)}</b></span> : null}
          </span>
        ) : null;
        const columnStyle = { left: `${(position.x / viewBox.width) * 100}%`, top: 0, height: "100%", width: `${(columnWidth / viewBox.width) * 100}%` };
        const highlight = (
          <span className={`pointer-events-none absolute inset-y-1 left-1/2 w-px -translate-x-1/2 rounded-full bg-[#2277ee] transition-opacity ${activePoint === index ? "opacity-15" : "opacity-0"}`} aria-hidden="true" />
        );
        const anchoredTooltip = tooltip ? <span className="absolute left-1/2" style={{ top: `${(position.y / viewBox.height) * 100}%` }}>{tooltip}</span> : null;
        return detail.href ? (
          <Link key={detail.date} href={detail.href} className="absolute z-[2] -translate-x-1/2 focus:outline-none" style={columnStyle} onMouseEnter={() => setActivePoint(index)} onFocus={() => setActivePoint(index)} onBlur={() => setActivePoint(null)} aria-label={`Ver ventas del ${detail.date}`}>
            {highlight}
            {anchoredTooltip}
          </Link>
        ) : (
          <button key={detail.date} type="button" className="absolute z-[2] -translate-x-1/2 focus:outline-none" style={columnStyle} onMouseEnter={() => setActivePoint(index)} onFocus={() => setActivePoint(index)} onBlur={() => setActivePoint(null)} aria-label={`Datos de ventas del ${detail.date}`}>
            {highlight}
            {anchoredTooltip}
          </button>
        );
      }) : null}
    </div>
  );
}

export function AdminSparkline({ tone = "blue", data, ariaLabel = "Tendencia del indicador", className = "mt-3 block h-8 w-full" }: SparklineProps) {
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
      className={className}
      role="img"
      aria-label={ariaLabel}
      title={ariaLabel}
    />
  ) : (
    <div className={`${className} border-b border-dashed border-[#dce6ee]`} role="img" aria-label={ariaLabel} title={ariaLabel} />
  );
}
