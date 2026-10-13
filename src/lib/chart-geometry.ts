export type ChartPoint = { x: number; y: number };

/** Cubic controls stay inside each segment's bounds, so the curve cannot invent peaks or dips. */
export function boundedSmoothPath(points: ChartPoint[]) {
  if (!points.length) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index++) {
    const start = points[index], end = points[index + 1];
    const previous = points[index - 1] ?? start, next = points[index + 2] ?? end;
    const clamp = (value: number, a: number, b: number) => Math.min(Math.max(a, b), Math.max(Math.min(a, b), value));
    const c1 = { x: clamp(start.x + (end.x - previous.x) / 6, start.x, end.x), y: clamp(start.y + (end.y - previous.y) / 6, start.y, end.y) };
    const c2 = { x: clamp(end.x - (next.x - start.x) / 6, start.x, end.x), y: clamp(end.y - (next.y - start.y) / 6, start.y, end.y) };
    path += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`;
  }
  return path;
}

export function marginDomain(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  const low = Math.min(0, ...valid), high = Math.max(0.2, ...valid);
  const min = low < 0 ? Math.floor(low * 1.15 / 0.05) * 0.05 : 0;
  const max = Math.ceil(high * 1.15 / 0.05) * 0.05;
  return { min, max, ticks: Array.from({ length: 5 }, (_, index) => max - (index / 4) * (max - min)) };
}
