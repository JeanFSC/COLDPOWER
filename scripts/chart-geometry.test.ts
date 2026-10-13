import assert from "node:assert/strict";
import test from "node:test";
import { boundedSmoothPath, marginDomain } from "../src/lib/chart-geometry";

test("smoothed curves keep controls within each measured segment", () => {
  const points = [0, 100, 0, 0, 0, 80, 0].map((y, x) => ({ x, y }));
  const segments = boundedSmoothPath(points).split(" C ").slice(1);
  segments.forEach((segment, index) => {
    const values = segment.replaceAll(",", "").split(" ").map(Number);
    for (const y of [values[1], values[3]]) {
      assert.ok(y >= Math.min(points[index].y, points[index + 1].y));
      assert.ok(y <= Math.max(points[index].y, points[index + 1].y));
    }
  });
});

test("margin axis includes losses and rates above 100% without clipping", () => {
  const domain = marginDomain([-0.4, null, 1.5]);
  assert.ok(domain.min < -0.4);
  assert.ok(domain.max > 1.5);
  assert.equal(domain.ticks[0], domain.max);
  assert.equal(domain.ticks[4], domain.min);
});

test("empty and single-point curves keep their exact measured values", () => {
  assert.equal(boundedSmoothPath([]), "");
  assert.equal(boundedSmoothPath([{ x: 2, y: 7 }]), "M 2 7");
  assert.ok(marginDomain([null]).max > 0);
});
