/** Small geometry helpers for map generation. Plain numbers only. */
import type { Point } from './types.js';

export function dist(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function polygonArea(poly: readonly Point[]): number {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i] as Point;
    const b = poly[(i + 1) % poly.length] as Point;
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area / 2;
}

export function polygonCentroid(poly: readonly Point[]): Point {
  let cx = 0;
  let cy = 0;
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i] as Point;
    const b = poly[(i + 1) % poly.length] as Point;
    const cross = a[0] * b[1] - b[0] * a[1];
    area += cross;
    cx += (a[0] + b[0]) * cross;
    cy += (a[1] + b[1]) * cross;
  }
  if (Math.abs(area) < 1e-9) {
    const sx = poly.reduce((s, p) => s + p[0], 0);
    const sy = poly.reduce((s, p) => s + p[1], 0);
    return [sx / poly.length, sy / poly.length];
  }
  return [cx / (3 * area), cy / (3 * area)];
}

export function pointInPolygon(p: Point, poly: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i] as Point;
    const b = poly[j] as Point;
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) {
      inside = !inside;
    }
  }
  return inside;
}

export function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(p, a);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

export function distToPolyline(p: Point, line: readonly Point[]): number {
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    best = Math.min(best, distToSegment(p, line[i] as Point, line[i + 1] as Point));
  }
  return best;
}

/** Chaikin corner cutting; keeps the end points of open lines. */
export function chaikin(points: readonly Point[], iterations: number, closed = false): Point[] {
  let pts: Point[] = points.map((p) => [p[0], p[1]]);
  for (let it = 0; it < iterations; it++) {
    const next: Point[] = [];
    const n = pts.length;
    if (n < 3) return pts;
    if (!closed) next.push(pts[0] as Point);
    const limit = closed ? n : n - 1;
    for (let i = 0; i < limit; i++) {
      const a = pts[i] as Point;
      const b = pts[(i + 1) % n] as Point;
      next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      next.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) next.push(pts[n - 1] as Point);
    pts = next;
  }
  return pts;
}

export function polylineLength(points: readonly Point[]): number {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) len += dist(points[i] as Point, points[i + 1] as Point);
  return len;
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

export function pathFromPoints(points: readonly Point[], closed: boolean): string {
  if (points.length === 0) return '';
  let d = `M${fmt(points[0]![0])} ${fmt(points[0]![1])}`;
  for (let i = 1; i < points.length; i++) d += `L${fmt(points[i]![0])} ${fmt(points[i]![1])}`;
  return closed ? `${d}Z` : d;
}

/** Smooth open curve through points using Catmull-Rom converted to cubic Beziers. */
export function smoothPath(points: readonly Point[]): string {
  if (points.length < 3) return pathFromPoints(points, false);
  let d = `M${fmt(points[0]![0])} ${fmt(points[0]![1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)] as Point;
    const p1 = points[i] as Point;
    const p2 = points[i + 1] as Point;
    const p3 = points[Math.min(points.length - 1, i + 2)] as Point;
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${fmt(c1[0])} ${fmt(c1[1])} ${fmt(c2[0])} ${fmt(c2[1])} ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return d;
}

export function segmentIntersection(a: Point, b: Point, c: Point, d: Point): Point | null {
  const r: Point = [b[0] - a[0], b[1] - a[1]];
  const s: Point = [d[0] - c[0], d[1] - c[1]];
  const denom = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / denom;
  const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [a[0] + t * r[0], a[1] + t * r[1]];
}
