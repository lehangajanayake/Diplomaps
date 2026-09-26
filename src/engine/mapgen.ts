/**
 * Seeded map generation. Same seed, same map.
 *
 * 300 points -> 2 rounds of Lloyd relaxation -> Voronoi cells (d3-delaunay) -> a noisy landmass ->
 * the Crossing (3 small regions at the exact centre) -> five nations as angular sectors around it ->
 * 3-4 regions per nation -> roads from each capital into the Crossing (passes) -> one river through
 * the Crossing to the sea -> mountain ranges on some nation borders -> names, labels and decorations.
 * Every map is validated; a seed that fails is retried with the next derived seed.
 */
import { Delaunay } from 'd3-delaunay';
import { CONFIG } from './config.js';
import {
  chaikin,
  dist,
  distToPolyline,
  distToSegment,
  pathFromPoints,
  pointInPolygon,
  polygonArea,
  polygonCentroid,
  polylineLength,
  segmentIntersection,
  smoothPath,
} from './geometry.js';
import { makeCrossingName, makeRegionName, makeSeaNames } from './names.js';
import { CROSSING_PROFILE, PROFILES } from './nations.js';
import { fbm } from './noise.js';
import { Rng, hash3, hashString } from './rng.js';
import {
  CROSSING,
  NATION_IDS,
  type EdgeKind,
  type Glyph,
  type MapData,
  type MapEdge,
  type MapRegion,
  type MapRoad,
  type NationId,
  type Owner,
  type Point,
} from './types.js';

interface Cell {
  i: number;
  poly: Point[];
  centroid: Point;
  area: number;
  /** Neighbour across polygon edge k (poly[k] -> poly[k+1]); -1 on the canvas edge. */
  edgeNbr: number[];
  nbrs: number[];
  boundary: boolean;
  land: boolean;
  owner: Owner | null;
  region: number;
}

interface RegionDraft {
  owner: Owner;
  cells: number[];
}

const TAU = Math.PI * 2;
const mod = (a: number, n: number) => ((a % n) + n) % n;
const vkey = (p: Point) => `${Math.round(p[0] * 64)},${Math.round(p[1] * 64)}`;

export class MapGenError extends Error {}

export function generateMap(seed: number): MapData {
  let lastError = '';
  for (let attempt = 0; attempt < CONFIG.map.maxAttempts; attempt++) {
    const derived = (seed + Math.imul(attempt, 0x9e3779b1)) >>> 0;
    try {
      const map = buildMap(derived);
      map.seed = seed >>> 0;
      map.attempts = attempt;
      return map;
    } catch (err) {
      if (!(err instanceof MapGenError)) throw err;
      lastError = err.message;
    }
  }
  throw new Error(`Map generation failed for seed ${seed}: ${lastError}`);
}

function fail(message: string): never {
  throw new MapGenError(message);
}

/* ------------------------------------------------------------------ */

function buildMap(seed: number): MapData {
  const W = CONFIG.map.width;
  const H = CONFIG.map.height;
  const cx = W / 2;
  const cy = H / 2;
  const centre: Point = [cx, cy];
  const RX = CONFIG.map.landRadiusX;
  const RY = CONFIG.map.landRadiusY;
  const rng = new Rng(seed);

  /* ---------- 1. Points, Lloyd relaxation, Voronoi ---------- */
  const n = CONFIG.map.points;
  const coords = new Float64Array(n * 2);
  for (let i = 0; i < n; i++) {
    coords[2 * i] = rng.range(4, W - 4);
    coords[2 * i + 1] = rng.range(4, H - 4);
  }
  let voronoi = new Delaunay(coords).voronoi([0, 0, W, H]);
  for (let round = 0; round < CONFIG.map.lloydRounds; round++) {
    for (let i = 0; i < n; i++) {
      const poly = voronoi.cellPolygon(i);
      if (!poly) continue;
      const c = polygonCentroid(poly.slice(0, -1) as Point[]);
      coords[2 * i] = c[0];
      coords[2 * i + 1] = c[1];
    }
    voronoi = new Delaunay(coords).voronoi([0, 0, W, H]);
  }

  const cells: Cell[] = [];
  const directed = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const raw = voronoi.cellPolygon(i);
    if (!raw) fail('degenerate cell');
    const poly: Point[] = raw.slice(0, -1).map((p) => [p[0], p[1]] as Point);
    if (polygonArea(poly) < 0) poly.reverse();
    const boundary = poly.some(([x, y]) => x < 0.5 || y < 0.5 || x > W - 0.5 || y > H - 0.5);
    cells.push({
      i,
      poly,
      centroid: polygonCentroid(poly),
      area: Math.abs(polygonArea(poly)),
      edgeNbr: [],
      nbrs: [],
      boundary,
      land: false,
      owner: null,
      region: -1,
    });
    for (let k = 0; k < poly.length; k++) {
      directed.set(`${vkey(poly[k]!)}|${vkey(poly[(k + 1) % poly.length]!)}`, i);
    }
  }
  for (const cell of cells) {
    const len = cell.poly.length;
    for (let k = 0; k < len; k++) {
      const a = cell.poly[k]!;
      const b = cell.poly[(k + 1) % len]!;
      const nb = directed.get(`${vkey(b)}|${vkey(a)}`) ?? -1;
      cell.edgeNbr.push(nb);
      if (nb >= 0 && !cell.nbrs.includes(nb)) cell.nbrs.push(nb);
    }
  }

  /* ---------- 2. Landmass ---------- */
  const shapeAmp = [rng.range(0.04, 0.12), rng.range(0.03, 0.08), rng.range(0.02, 0.05)];
  const shapePhase = [rng.range(0, TAU), rng.range(0, TAU), rng.range(0, TAU)];
  const coastSeed = rng.int(1, 1_000_000_000);
  for (const cell of cells) {
    const [x, y] = cell.centroid;
    const nx = (x - cx) / RX;
    const ny = (y - cy) / RY;
    const d = Math.hypot(nx, ny);
    const theta = Math.atan2(ny, nx);
    const shape =
      1 +
      shapeAmp[0]! * Math.sin(2 * theta + shapePhase[0]!) +
      shapeAmp[1]! * Math.sin(3 * theta + shapePhase[1]!) +
      shapeAmp[2]! * Math.sin(5 * theta + shapePhase[2]!);
    const noise = fbm(coastSeed, x * 0.0055, y * 0.0055, 4);
    const nearEdge = x < 58 || y < 46 || x > W - 58 || y > H - 46;
    const legendCorner = x < 250 && y > H - 175; // the legend note is pinned here
    cell.land = !cell.boundary && !nearEdge && !legendCorner && (d < 0.4 || d / shape + CONFIG.map.coastNoise * noise < 0.94);
  }

  const centreCell = nearestCell(cells, centre, (c) => c.land);
  if (centreCell < 0) fail('no land at centre');
  // Keep only the landmass connected to the centre.
  const mainland = flood(cells, [centreCell], (c) => c.land);
  for (const cell of cells) cell.land = mainland.has(cell.i);
  // Fill lakes: sea not connected to the open ocean becomes land.
  const ocean = flood(
    cells,
    cells.filter((c) => c.boundary).map((c) => c.i),
    (c) => !c.land,
  );
  for (const cell of cells) if (!cell.land && !ocean.has(cell.i)) cell.land = true;

  const landCells = cells.filter((c) => c.land);
  if (landCells.length < n * 0.42 || landCells.length > n * 0.68) fail(`land share ${landCells.length}`);

  /* ---------- 3. The Crossing: a compact blob at the exact centre ---------- */
  const crossingTarget = Math.max(12, Math.round(landCells.length * CONFIG.map.crossingShare));
  const crossingSet = new Set<number>([centreCell]);
  const blobNoise = rng.int(1, 1_000_000_000);
  while (crossingSet.size < crossingTarget) {
    let best = -1;
    let bestScore = Infinity;
    for (const i of crossingSet) {
      for (const nb of cells[i]!.nbrs) {
        const c = cells[nb]!;
        if (!c.land || crossingSet.has(nb)) continue;
        const score = dist(c.centroid, centre) * (1 + 0.18 * fbm(blobNoise, c.centroid[0] * 0.02, c.centroid[1] * 0.02, 2));
        if (score < bestScore) {
          bestScore = score;
          best = nb;
        }
      }
    }
    if (best < 0) fail('crossing cannot grow');
    crossingSet.add(best);
  }
  // Coastal Crossing would break "every nation surrounds it".
  for (const i of crossingSet) {
    if (cells[i]!.nbrs.some((nb) => !cells[nb]!.land) || cells[i]!.boundary) fail('crossing touches the sea');
  }
  const crossingCells = [...crossingSet];
  const blobRadius = crossingCells.reduce((s, i) => s + dist(cells[i]!.centroid, centre), 0) / crossingCells.length;
  const axis = rng.range(-0.45, 0.45);
  const axisDir: Point = [Math.cos(axis), Math.sin(axis)];
  const flankA = nearestOf(cells, crossingCells, [cx + axisDir[0] * blobRadius * 1.25, cy + axisDir[1] * blobRadius * 1.25]);
  const flankB = nearestOf(cells, crossingCells, [cx - axisDir[0] * blobRadius * 1.25, cy - axisDir[1] * blobRadius * 1.25]);
  if (flankA === centreCell || flankB === centreCell || flankA === flankB) fail('crossing flanks collapse');
  const crossingParts = partition(cells, crossingCells, [centreCell, flankA, flankB]);
  if (crossingParts.some((p) => p.length < 3)) fail('crossing region too small');
  for (const i of crossingCells) cells[i]!.owner = CROSSING;

  /* ---------- 4. Nations: noisy angular sectors in ring order ---------- */
  const alpha0 = rng.range(0, TAU);
  const weights = NATION_IDS.map(() => rng.range(0.86, 1.14));
  const wsum = weights.reduce((a, b) => a + b, 0);
  const bounds: number[] = [];
  let acc = 0;
  for (const w of weights) {
    acc += (w / wsum) * TAU;
    bounds.push(acc);
  }
  const angleSeed = rng.int(1, 1_000_000_000);
  for (const cell of landCells) {
    if (cell.owner === CROSSING) continue;
    const [x, y] = cell.centroid;
    const theta = Math.atan2((y - cy) / RY, (x - cx) / RX) + 0.42 * fbm(angleSeed, x * 0.006, y * 0.006, 3);
    const t = mod(theta - alpha0, TAU);
    const k = bounds.findIndex((b) => t < b);
    cell.owner = NATION_IDS[k < 0 ? NATION_IDS.length - 1 : k]!;
  }
  // Make every nation contiguous by handing stray fragments to their neighbours.
  for (let pass = 0; pass < 12; pass++) {
    let changed = false;
    for (const id of NATION_IDS) {
      const own = landCells.filter((c) => c.owner === id).map((c) => c.i);
      const comps = components(cells, own);
      comps.sort((a, b) => b.length - a.length);
      for (const comp of comps.slice(1)) {
        for (const i of comp) {
          const counts = new Map<Owner, number>();
          for (const nb of cells[i]!.nbrs) {
            const o = cells[nb]!.owner;
            if (!cells[nb]!.land || !o || o === id || o === CROSSING) continue;
            counts.set(o, (counts.get(o) ?? 0) + 1);
          }
          const target = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
          if (target) {
            cells[i]!.owner = target[0];
            changed = true;
          }
        }
      }
    }
    if (!changed) break;
  }
  const nationCells = {} as Record<NationId, number[]>;
  for (const id of NATION_IDS) {
    nationCells[id] = landCells.filter((c) => c.owner === id).map((c) => c.i);
    if (components(cells, nationCells[id]).length !== 1) fail(`${id} not contiguous`);
    if (!nationCells[id].some((i) => cells[i]!.nbrs.some((nb) => cells[nb]!.owner === CROSSING))) {
      fail(`${id} does not border the Crossing`);
    }
  }
  const avgNation = NATION_IDS.reduce((s, id) => s + nationCells[id].length, 0) / NATION_IDS.length;
  for (const id of NATION_IDS) if (nationCells[id].length < avgNation * 0.62) fail(`${id} too small`);

  /* ---------- 5. Regions within each nation ---------- */
  const bySize = [...NATION_IDS].sort((a, b) => nationCells[b].length - nationCells[a].length);
  const regionCount = {} as Record<NationId, number>;
  bySize.forEach((id, k) => (regionCount[id] = CONFIG.map.nationRegions[k] ?? 3));

  const drafts: RegionDraft[] = [];
  // Crossing regions first: the central one holds Wayhold.
  for (const part of crossingParts) drafts.push({ owner: CROSSING, cells: part });
  for (const id of NATION_IDS) {
    const parts = splitNation(cells, nationCells[id], regionCount[id], rng);
    parts.sort((a, b) => dist(meanCentroid(cells, a), centre) - dist(meanCentroid(cells, b), centre));
    for (const part of parts) drafts.push({ owner: id, cells: part });
  }
  drafts.forEach((d, idx) => d.cells.forEach((i) => (cells[i]!.region = idx)));
  const regionIds = drafts.map((_, idx) => `r${idx}`);

  /* ---------- 6. Shared border chains, inked once and reused by both sides ---------- */
  const faceOf = (i: number) => (i >= 0 && cells[i]!.land ? cells[i]!.region : -1);
  const facesAt = new Map<string, Set<number>>();
  const pointAt = new Map<string, Point>();
  for (const cell of cells) {
    for (const p of cell.poly) {
      const k = vkey(p);
      pointAt.set(k, p);
      const set = facesAt.get(k) ?? new Set<number>();
      set.add(faceOf(cell.i));
      facesAt.set(k, set);
    }
  }
  // Canvas-edge vertices border "outside", which we treat as sea.
  for (const cell of cells) {
    cell.poly.forEach((p, k) => {
      if (cell.edgeNbr[k]! < 0) facesAt.get(vkey(p))!.add(-1);
      if (cell.edgeNbr[(k + cell.poly.length - 1) % cell.poly.length]! < 0) facesAt.get(vkey(p))!.add(-1);
    });
  }
  const isJunction = (k: string) => (facesAt.get(k)?.size ?? 0) >= 3;

  interface Half {
    from: string;
    to: string;
    left: number;
    right: number;
    cell: number;
    nb: number;
  }
  // Canonical half-edges: from the land side for coasts, from the lower region id for inner borders.
  const halves: Half[] = [];
  const outgoing = new Map<string, Half[]>();
  for (const cell of landCells) {
    const len = cell.poly.length;
    for (let k = 0; k < len; k++) {
      const nb = cell.edgeNbr[k]!;
      const left = cell.region;
      const right = faceOf(nb);
      if (left === right) continue;
      if (right >= 0 && right < left) continue;
      const a = cell.poly[k]!;
      const b = cell.poly[(k + 1) % len]!;
      if (dist(a, b) < 1e-6) continue;
      const h: Half = { from: vkey(a), to: vkey(b), left, right, cell: cell.i, nb };
      halves.push(h);
      const list = outgoing.get(h.from) ?? [];
      list.push(h);
      outgoing.set(h.from, list);
    }
  }

  interface Chain {
    left: number;
    right: number;
    points: Point[];
    start: string;
    end: string;
  }
  const chains: Chain[] = [];
  const walked = new Set<Half>();
  const inkChain = (run: Half[], closed: boolean): Chain => {
    const coast = run[0]!.right < 0;
    const pts: Point[] = [pointAt.get(run[0]!.from)!];
    for (const h of run) {
      const a = pointAt.get(h.from)!;
      const b = pointAt.get(h.to)!;
      const len = dist(a, b);
      const hk = hashString(h.from < h.to ? `${h.from}|${h.to}` : `${h.to}|${h.from}`) ^ seed;
      pts.push(...displace(a, b, coast ? 3 : 2, len * (coast ? 0.26 : 0.12), hk, 1), b);
    }
    const smooth = closed ? chaikin(pts.slice(0, -1), 1, true) : chaikin(pts, 1, false);
    if (closed) smooth.push(smooth[0]!);
    return { left: run[0]!.left, right: run[0]!.right, points: smooth, start: run[0]!.from, end: run[run.length - 1]!.to };
  };
  const walk = (first: Half): Half[] => {
    const run = [first];
    walked.add(first);
    let cur = first;
    while (!isJunction(cur.to) && cur.to !== first.from) {
      const next = (outgoing.get(cur.to) ?? []).find((h) => !walked.has(h) && h.left === first.left && h.right === first.right);
      if (!next) break;
      run.push(next);
      walked.add(next);
      cur = next;
    }
    return run;
  };
  for (const h of halves) {
    if (walked.has(h) || !isJunction(h.from)) continue;
    chains.push(inkChain(walk(h), false));
  }
  for (const h of halves) {
    if (walked.has(h)) continue;
    const run = walk(h);
    chains.push(inkChain(run, run[run.length - 1]!.to === run[0]!.from));
  }

  const linkLoops = (pieces: { points: Point[]; start: string; end: string }[]): Point[][] => {
    const byStart = new Map<string, { points: Point[]; start: string; end: string }[]>();
    for (const p of pieces) {
      const list = byStart.get(p.start) ?? [];
      list.push(p);
      byStart.set(p.start, list);
    }
    const loops: Point[][] = [];
    const done = new Set<object>();
    for (const piece of pieces) {
      if (done.has(piece)) continue;
      const loop: Point[] = [];
      let cur: { points: Point[]; start: string; end: string } | undefined = piece;
      let guard = 0;
      while (cur && !done.has(cur) && guard++ < 5000) {
        done.add(cur);
        loop.push(...cur.points.slice(0, -1));
        if (cur.end === piece.start) break;
        cur = (byStart.get(cur.end) ?? []).find((p) => !done.has(p));
      }
      if (loop.length > 2) loops.push(loop);
    }
    return loops;
  };
  const piecesFor = (face: number) =>
    chains.flatMap((c) => {
      if (c.left === face) return [{ points: c.points, start: c.start, end: c.end }];
      if (c.right === face) return [{ points: [...c.points].reverse(), start: c.end, end: c.start }];
      return [];
    });

  const landLoops = linkLoops(chains.filter((c) => c.right < 0).map((c) => ({ points: c.points, start: c.start, end: c.end })));
  const coast = landLoops.map((l) => pathFromPoints(l, true)).join('');
  const regionLoops = drafts.map((_, idx) => linkLoops(piecesFor(idx)));
  const edgeMid = (a: number, b: number): Point => {
    const cell = cells[a]!;
    const k = cell.edgeNbr.indexOf(b);
    if (k < 0) return [(cell.centroid[0] + cells[b]!.centroid[0]) / 2, (cell.centroid[1] + cells[b]!.centroid[1]) / 2];
    const p = cell.poly[k]!;
    const q = cell.poly[(k + 1) % cell.poly.length]!;
    return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  };

  const delaunay = voronoi.delaunay;
  let lastFound = centreCell;
  const cellAt = (p: Point): number => {
    lastFound = delaunay.find(p[0], p[1], lastFound);
    return lastFound;
  };
  const coastGrid = new PointGrid(20);
  for (const loop of landLoops) for (const p of loop) coastGrid.add(p);
  /** Distance from p to the nearest border of its own region (or the coast), using the raw cell edges. */
  const borderClearance = (p: Point, region: number): number => {
    const ci = cellAt(p);
    const cell = cells[ci]!;
    if (!cell.land || cell.region !== region) return -1;
    let best = Infinity;
    for (const c of [ci, ...cell.nbrs]) {
      const cc = cells[c]!;
      const len = cc.poly.length;
      for (let k = 0; k < len; k++) {
        if (faceOf(cc.edgeNbr[k]!) === faceOf(c)) continue;
        best = Math.min(best, distToSegment(p, cc.poly[k]!, cc.poly[(k + 1) % len]!));
      }
    }
    return best;
  };

  const ripples = [6, 12, 19].map((off) => rippleLine(landLoops, off, coastGrid, (p) => cells[cellAt(p)]!.land));

  /* ---------- 7. Region adjacency and label points ---------- */
  const neighbourSets = drafts.map(() => new Set<number>());
  for (const cell of landCells) {
    for (const nb of cell.nbrs) {
      if (!cells[nb]!.land) continue;
      const ra = cell.region;
      const rb = cells[nb]!.region;
      if (ra === rb) continue;
      neighbourSets[ra]!.add(rb);
      neighbourSets[rb]!.add(ra);
    }
  }
  const pairChains = new Map<string, Point[][]>();
  for (const c of chains) {
    if (c.right < 0) continue;
    const key = `${c.left}|${c.right}`;
    const list = pairChains.get(key) ?? [];
    list.push(c.points);
    pairChains.set(key, list);
  }
  // Every region reachable from every other.
  const reach = new Set<number>([0]);
  const queue = [0];
  while (queue.length) {
    const r = queue.shift()!;
    for (const nb of neighbourSets[r]!) {
      if (reach.has(nb)) continue;
      reach.add(nb);
      queue.push(nb);
    }
  }
  if (reach.size !== drafts.length) fail('regions not connected');

  const poles = drafts.map((d, idx) => regionPole(cells, d.cells, regionLoops[idx]!));

  /* ---------- 8. Capitals ---------- */
  const capitalRegion = {} as Record<Owner, number>;
  capitalRegion[CROSSING] = 0;
  for (const id of NATION_IDS) {
    const own = drafts.map((d, idx) => ({ d, idx })).filter((x) => x.d.owner === id);
    const inland = own.filter((x) => ![...neighbourSets[x.idx]!].some((nb) => drafts[nb]!.owner === CROSSING));
    const pool = inland.length > 0 ? inland : own;
    pool.sort((a, b) => poles[b.idx]!.depth - poles[a.idx]!.depth);
    capitalRegion[id] = pool[0]!.idx;
  }

  /* ---------- 9. Roads: every capital to Wayhold, only through its own land and the Crossing ---------- */
  const wayholdPoint = poles[0]!.point;
  const roads: MapRoad[] = [];
  const passRegions = new Set<number>();
  for (const id of NATION_IDS) {
    const capIdx = capitalRegion[id];
    const start = nearestOf(cells, drafts[capIdx]!.cells, poles[capIdx]!.point);
    const path = shortestPath(cells, start, centreCell, (c) => c.owner === id || c.owner === CROSSING, (a, b) =>
      dist(a.centroid, b.centroid) * (1 + 0.35 * hash3(a.i, b.i, seed)),
    );
    if (!path) fail(`no road for ${id}`);
    const k = path.findIndex((i) => cells[i]!.owner === CROSSING);
    if (k <= 0) fail(`road for ${id} never enters the Crossing`);
    const passPoint = edgeMid(path[k - 1]!, path[k]!);
    const raw: Point[] = [poles[capIdx]!.point, ...path.slice(1, -1).map((i) => cells[i]!.centroid), wayholdPoint];
    const bent = raw.map((p, idx) =>
      idx === 0 || idx === raw.length - 1
        ? p
        : ([p[0] + (hash3(idx, 3, seed) - 0.5) * 10, p[1] + (hash3(idx, 7, seed) - 0.5) * 10] as Point),
    );
    // Pin the road to the pass so the gate icon sits on it.
    const passIdx = k;
    bent.splice(passIdx, 0, passPoint);
    const points = chaikin(bent, 3);
    roads.push({ nation: id, d: smoothPath(points.filter((_, i) => i % 2 === 0 || i === points.length - 1)), points, pass: passPoint, passRegion: regionIds[cells[path[k]!]!.region]! });
    passRegions.add(cells[path[k]!]!.region);
  }

  /* ---------- 10. The river: from one nation, through the Crossing, to the sea ---------- */
  const riverAngle = axis + Math.PI / 2 + rng.range(-0.3, 0.3) + (rng.chance(0.5) ? Math.PI : 0);
  const sourceTarget: Point = [cx + Math.cos(riverAngle) * RX * 0.62, cy + Math.sin(riverAngle) * RY * 0.62];
  const source = nearestCell(cells, sourceTarget, (c) => c.land && c.owner !== CROSSING && !c.nbrs.some((nb) => !cells[nb]!.land));
  const mouthTarget: Point = [cx - Math.cos(riverAngle) * RX * 1.3, cy - Math.sin(riverAngle) * RY * 1.3];
  const mouth = nearestCell(cells, mouthTarget, (c) => c.land && c.owner !== CROSSING && c.nbrs.some((nb) => !cells[nb]!.land));
  const waypoint = nearestOf(
    cells,
    crossingCells.filter((i) => i !== centreCell && cells[i]!.nbrs.includes(centreCell)),
    [cx + Math.cos(riverAngle + Math.PI / 2) * 30, cy + Math.sin(riverAngle + Math.PI / 2) * 30],
  );
  if (source < 0 || mouth < 0 || waypoint < 0) fail('river endpoints');
  const riverCost = (a: Cell, b: Cell) => dist(a.centroid, b.centroid) * (1 + 0.8 * hash3(a.i, b.i, seed ^ 0x51));
  const riverOk = (c: Cell) => c.land && c.i !== centreCell;
  const upper = shortestPath(cells, source, waypoint, riverOk, riverCost);
  const lower = shortestPath(cells, waypoint, mouth, riverOk, riverCost);
  if (!upper || !lower) fail('no river path');
  const riverCells = [...upper, ...lower.slice(1)];
  if (new Set(riverCells).size !== riverCells.length) fail('river loops back');
  const mouthCell = cells[mouth]!;
  const seaNb = mouthCell.nbrs
    .filter((nb) => !cells[nb]!.land)
    .sort((a, b) => dist(cells[a]!.centroid, mouthTarget) - dist(cells[b]!.centroid, mouthTarget))[0];
  if (seaNb === undefined) fail('river has no sea');
  const estuary = edgeMid(mouth, seaNb);
  const outward: Point = [estuary[0] + (estuary[0] - mouthCell.centroid[0]) * 0.35, estuary[1] + (estuary[1] - mouthCell.centroid[1]) * 0.35];
  const riverRaw: Point[] = riverCells.map((i, idx) => {
    const c = cells[i]!.centroid;
    if (idx === 0) return c;
    return [c[0] + (hash3(i, 11, seed) - 0.5) * 16, c[1] + (hash3(i, 13, seed) - 0.5) * 16];
  });
  riverRaw.push(estuary, outward);
  const riverLine = chaikin(riverRaw, 4);
  const riverD = taperedRibbon(riverLine, 0.9, 5.2);
  const riverRegions = new Set(riverCells.map((i) => cells[i]!.region));
  if (!riverCells.some((i) => cells[i]!.owner === CROSSING)) fail('river misses the Crossing');
  const riverPairs = new Set<string>();
  for (let i = 0; i < riverCells.length - 1; i++) {
    const a = cells[riverCells[i]!]!.region;
    const b = cells[riverCells[i + 1]!]!.region;
    if (a !== b) riverPairs.add(a < b ? `${a}|${b}` : `${b}|${a}`);
  }

  /* ---------- 11. Mountains on some nation-to-nation borders ---------- */
  const ringPairs: [NationId, NationId][] = NATION_IDS.map((id, k) => [id, NATION_IDS[(k + 1) % NATION_IDS.length]!]);
  const mountainPairs = new Set<string>();
  const shuffledPairs = rng.shuffle([...ringPairs]);
  shuffledPairs.forEach(([a, b], k) => {
    if (k < 2 || rng.chance(CONFIG.map.mountainBorderChance)) mountainPairs.add(pairKey(a, b));
  });

  const edges: MapEdge[] = [];
  for (const [key, segments] of pairChains) {
    const [ra, rb] = key.split('|').map(Number) as [number, number];
    const oa = drafts[ra]!.owner;
    const ob = drafts[rb]!.owner;
    let kind: EdgeKind = 'open';
    if (oa !== CROSSING && ob !== CROSSING && oa !== ob && mountainPairs.has(pairKey(oa, ob))) kind = 'mountain';
    else if (riverPairs.has(ra < rb ? key : `${rb}|${ra}`)) kind = 'river';
    edges.push({
      a: regionIds[ra]!,
      b: regionIds[rb]!,
      kind,
      d: segments.map((c) => pathFromPoints(c, false)).join(''),
      length: segments.reduce((s, c) => s + polylineLength(c), 0),
    });
  }

  /* ---------- 12. Names ---------- */
  const used = new Set<string>([CROSSING_PROFILE.capitalName, ...NATION_IDS.map((id) => PROFILES[id].capitalName)]);
  const names = drafts.map((d, idx) => {
    if (d.owner === CROSSING && idx === 0) return CROSSING_PROFILE.capitalName;
    if (d.owner === CROSSING) return makeCrossingName(rng, used);
    const owner = d.owner;
    if (capitalRegion[owner] === idx) return PROFILES[owner].capitalName;
    const words = PROFILES[owner].regionWords;
    const highland = [...neighbourSets[idx]!].some((nb) => {
      const o = drafts[nb]!.owner;
      return o !== owner && o !== CROSSING && mountainPairs.has(pairKey(owner, o));
    });
    return makeRegionName(
      rng,
      {
        words,
        coastal: d.cells.some((i) => cells[i]!.nbrs.some((nb) => !cells[nb]!.land)),
        river: riverRegions.has(idx) && rng.chance(0.7),
        highland: highland || (owner === 'ostrin' && rng.chance(0.5)),
        marsh: owner === 'tarn' && rng.chance(0.6),
      },
      used,
    );
  });

  /* ---------- 13. Assemble regions ---------- */
  const regions: Record<string, MapRegion> = {};
  drafts.forEach((d, idx) => {
    const pole = poles[idx]!;
    const loops = regionLoops[idx]!;
    const inside = (p: Point) => loops.some((l) => pointInPolygon(p, l));
    const isCapital = capitalRegion[d.owner] === idx;
    const token: Point = firstInside(
      [
        [pole.point[0], pole.point[1] - (isCapital ? 24 : 12)],
        [pole.point[0] - 22, pole.point[1] - 6],
        [pole.point[0] + 22, pole.point[1] - 6],
        pole.point,
      ],
      inside,
    );
    const label: Point = firstInside(
      [
        [pole.point[0], pole.point[1] + (isCapital ? 20 : 17)],
        [pole.point[0], pole.point[1] + 12],
        pole.point,
      ],
      inside,
    );
    regions[regionIds[idx]!] = {
      id: regionIds[idx]!,
      name: names[idx]!,
      homeland: d.owner,
      cells: d.cells,
      d: loops.map((l) => pathFromPoints(l, true)).join(''),
      centroid: meanCentroid(cells, d.cells),
      label,
      token,
      area: d.cells.reduce((s, i) => s + cells[i]!.area, 0),
      coastal: d.cells.some((i) => cells[i]!.nbrs.some((nb) => !cells[nb]!.land)),
      capital: isCapital,
      pass: d.owner === CROSSING && passRegions.has(idx),
      river: riverRegions.has(idx),
      neighbours: [...neighbourSets[idx]!].sort((a, b) => a - b).map((nb) => regionIds[nb]!),
    };
  });

  const capitals = {} as MapData['capitals'];
  for (const owner of [CROSSING, ...NATION_IDS] as Owner[]) {
    const idx = capitalRegion[owner];
    capitals[owner] = {
      region: regionIds[idx]!,
      x: poles[idx]!.point[0],
      y: poles[idx]!.point[1],
      name: owner === CROSSING ? CROSSING_PROFILE.capitalName : PROFILES[owner].capitalName,
    };
  }

  /* ---------- 14. Crossing checks ---------- */
  const crossingArea = drafts.filter((d) => d.owner === CROSSING).reduce((s, d) => s + d.cells.reduce((a, i) => a + cells[i]!.area, 0), 0);
  const landArea = landCells.reduce((s, c) => s + c.area, 0);
  if (crossingArea / landArea > 0.15) fail('crossing too large');
  const crossingCentroid = meanCentroid(cells, crossingCells);
  if (dist(crossingCentroid, centre) > 45) fail('crossing off centre');

  /* ---------- 15. Bridges where roads cross the river ---------- */
  const bridges: Point[] = [];
  for (const road of roads) {
    for (let i = 0; i < road.points.length - 1; i++) {
      for (let j = 0; j < riverLine.length - 1; j++) {
        const hit = segmentIntersection(road.points[i]!, road.points[i + 1]!, riverLine[j]!, riverLine[j + 1]!);
        if (hit && !bridges.some((b) => dist(b, hit) < 14) && dist(hit, wayholdPoint) > 10) bridges.push(hit);
      }
    }
  }

  /* ---------- 16. Decorations: mountains, hills, forests, marsh ---------- */
  const avoidPoints: Point[] = [];
  for (const r of Object.values(regions)) avoidPoints.push(r.label, r.token);
  for (const cap of Object.values(capitals)) avoidPoints.push([cap.x, cap.y]);
  const avoidGrid = new PointGrid(30);
  for (const p of avoidPoints) avoidGrid.add(p);
  const roadGrid = new PointGrid(20);
  for (const r of roads) for (const p of densify(r.points, 4)) roadGrid.add(p);
  const riverGrid = new PointGrid(20);
  for (const p of densify(riverLine, 4)) riverGrid.add(p);
  const glyphGrid = new PointGrid(20);
  const clearOf = (p: Point, minGlyph: number) =>
    avoidGrid.minDist(p, 27) >= 27 &&
    roadGrid.minDist(p, 10) >= 10 &&
    riverGrid.minDist(p, 9) >= 9 &&
    coastGrid.minDist(p, 11) >= 11 &&
    glyphGrid.minDist(p, minGlyph) >= minGlyph;
  const mountains: Glyph[] = [];
  const hills: Glyph[] = [];
  const forests: Glyph[] = [];
  const marsh: Glyph[] = [];
  const crossingCentroids = crossingCells.map((i) => cells[i]!.centroid);
  for (const cell of landCells) {
    const len = cell.poly.length;
    for (let k = 0; k < len; k++) {
      const nb = cell.edgeNbr[k]!;
      if (nb < 0 || nb < cell.i || !cells[nb]!.land) continue;
      const oa = cell.owner;
      const ob = cells[nb]!.owner;
      if (!oa || !ob || oa === ob || oa === CROSSING || ob === CROSSING) continue;
      if (!mountainPairs.has(pairKey(oa, ob))) continue;
      const a = cell.poly[k]!;
      const b = cell.poly[(k + 1) % len]!;
      const steps = Math.max(1, Math.round(dist(a, b) / 15));
      for (let st = 0; st < steps; st++) {
        const t = (st + 0.5) / steps;
        const base: Point = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        if (crossingCentroids.some((c) => dist(c, base) < 34)) continue;
        const side = hash3(cell.i, nb * 7 + st, seed) < 0.5 ? cell.centroid : cells[nb]!.centroid;
        const off = 3 + hash3(cell.i, st, seed ^ 9) * 7;
        const dx = side[0] - base[0];
        const dy = side[1] - base[1];
        const dl = Math.hypot(dx, dy) || 1;
        const p: Point = [base[0] + (dx / dl) * off, base[1] + (dy / dl) * off];
        if (!clearOf(p, 12)) continue;
        const g = { x: p[0], y: p[1], s: 12 + hash3(st, cell.i, seed ^ 3) * 8, v: Math.floor(hash3(nb, st, seed) * 3) };
        glyphGrid.add(p);
        mountains.push(g);
      }
    }
  }
  const flavour: Record<Owner, { kind: 'mountain' | 'hill' | 'forest' | 'marsh'; weight: number }[]> = {
    varrow: [{ kind: 'hill', weight: 3 }, { kind: 'forest', weight: 1 }],
    kelm: [{ kind: 'forest', weight: 3 }, { kind: 'hill', weight: 1 }],
    sael: [{ kind: 'forest', weight: 2 }, { kind: 'hill', weight: 1 }],
    tarn: [{ kind: 'marsh', weight: 4 }, { kind: 'forest', weight: 1 }],
    ostrin: [{ kind: 'mountain', weight: 3 }, { kind: 'hill', weight: 1 }],
    crossing: [{ kind: 'forest', weight: 1 }, { kind: 'hill', weight: 1 }],
  };
  drafts.forEach((d, idx) => {
    const want = d.owner === CROSSING ? 2 : 3 + Math.floor(rng.next() * 3);
    let placed = 0;
    for (let tries = 0; tries < 60 && placed < want; tries++) {
      const cell = cells[rng.pick(d.cells)]!;
      const p: Point = [cell.centroid[0] + rng.range(-14, 14), cell.centroid[1] + rng.range(-14, 14)];
      if (borderClearance(p, idx) < 9) continue;
      if (!clearOf(p, 17)) continue;
      const opts = flavour[d.owner];
      const kind = rng.weighted(
        opts.map((o) => o.kind),
        opts.map((o) => o.weight),
      );
      const g = { x: p[0], y: p[1], s: 9 + rng.next() * 5, v: rng.int(0, 2) };
      glyphGrid.add(p);
      if (kind === 'mountain') mountains.push({ ...g, s: g.s + 4 });
      else if (kind === 'hill') hills.push(g);
      else if (kind === 'forest') forests.push(g);
      else marsh.push(g);
      placed++;
    }
  });

  /* ---------- 17. Nation labels: spaced capitals that fit inside the territory ---------- */
  const labelBoxes: { c: Point; w: number; h: number }[] = [];
  for (const r of Object.values(regions)) {
    labelBoxes.push({ c: r.label, w: r.name.length * 6.6 + 8, h: 15 });
    labelBoxes.push({ c: r.token, w: 26, h: 30 });
  }
  for (const cap of Object.values(capitals)) labelBoxes.push({ c: [cap.x, cap.y], w: 22, h: 22 });
  for (const road of roads) for (const p of densify(road.points, 14)) labelBoxes.push({ c: p, w: 4, h: 4 });
  for (const p of densify(riverLine, 14)) labelBoxes.push({ c: p, w: 6, h: 6 });
  for (const g of mountains) labelBoxes.push({ c: [g.x, g.y - g.s * 0.3], w: g.s, h: g.s * 0.7 });
  const nationLabels = {} as MapData['nationLabels'];
  for (const id of NATION_IDS) {
    const own = nationCells[id];
    const pts = own.map((i) => cells[i]!.centroid);
    const mean = meanCentroid(cells, own);
    let sxx = 0;
    let sxy = 0;
    let syy = 0;
    for (const p of pts) {
      const dx = p[0] - mean[0];
      const dy = p[1] - mean[1];
      sxx += dx * dx;
      sxy += dx * dy;
      syy += dy * dy;
    }
    let axisAngle = (0.5 * Math.atan2(2 * sxy, sxx - syy) * 180) / Math.PI;
    if (axisAngle > 90) axisAngle -= 180;
    if (axisAngle < -90) axisAngle += 180;
    const insideNation = (p: Point) => {
      const c = cells[cellAt(p)]!;
      return c.land && c.owner === id && coastGrid.minDist(p, 6) >= 6;
    };
    const text = PROFILES[id].name.toUpperCase();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p[0]);
      minY = Math.min(minY, p[1]);
      maxX = Math.max(maxX, p[0]);
      maxY = Math.max(maxY, p[1]);
    }
    let chosen: { x: number; y: number; angle: number; size: number } | null = null;
    let bestScore = -Infinity;
    for (const size of [24, 21, 18, 16]) {
      const w = text.length * size * 0.78 + (text.length - 1) * size * 0.42;
      const h = size * 0.95;
      for (const angle of [Math.max(-16, Math.min(16, axisAngle)), 0, Math.max(-16, Math.min(16, axisAngle)) / 2]) {
        const rad = (angle * Math.PI) / 180;
        const ux: Point = [Math.cos(rad), Math.sin(rad)];
        const uy: Point = [-Math.sin(rad), Math.cos(rad)];
        for (let x = minX; x <= maxX; x += 10) {
          for (let y = minY; y <= maxY; y += 10) {
            const probe = (fx: number, fy: number): Point => [x + ux[0] * fx * w * 0.5 + uy[0] * fy * h * 0.5, y + ux[1] * fx * w * 0.5 + uy[1] * fy * h * 0.5];
            const corners = [probe(-1, -1), probe(1, -1), probe(1, 1), probe(-1, 1), probe(0, -1), probe(0, 1), probe(-0.5, 0), probe(0.5, 0)];
            if (!corners.every(insideNation)) continue;
            let clearance = 40;
            for (const box of labelBoxes) {
              const dx = box.c[0] - x;
              const dy = box.c[1] - y;
              const lx = Math.abs(dx * ux[0] + dy * ux[1]) - w / 2 - box.w / 2;
              const ly = Math.abs(dx * uy[0] + dy * uy[1]) - h / 2 - box.h / 2;
              clearance = Math.min(clearance, Math.max(lx, ly));
            }
            const score = clearance * 3 + size * 1.5 - Math.abs(angle) * 0.1 - dist([x, y], mean) * 0.05 + Math.min(dist([x, y], centre), 300) * 0.14;
            if (score > bestScore) {
              bestScore = score;
              chosen = { x, y, angle, size };
            }
          }
        }
      }
      if (chosen && bestScore > 40 + size * 1.5) break;
    }
    nationLabels[id] = chosen ?? { x: mean[0], y: mean[1], angle: 0, size: 16 };
  }

  /* ---------- 18. Sea labels and compass ---------- */
  const seaSpots: { p: Point; clear: number }[] = [];
  for (let x = 60; x <= W - 60; x += 20) {
    for (let y = 50; y <= H - 50; y += 20) {
      const p: Point = [x, y];
      if (cells[cellAt(p)]!.land) continue;
      seaSpots.push({ p, clear: coastGrid.minDist(p, 200) });
    }
  }
  seaSpots.sort((a, b) => b.clear - a.clear);
  const topSpots = seaSpots.filter((s) => s.p[1] < H * 0.5 && s.clear > 42);
  const compassSpot = topSpots[0] ?? seaSpots[0] ?? { p: [W - 80, 80] as Point, clear: 40 };
  const compass = { x: compassSpot.p[0], y: compassSpot.p[1], r: Math.min(46, Math.max(26, compassSpot.clear * 0.7)) };
  const seaNames = makeSeaNames(rng, 2);
  const seaLabels: MapData['seaLabels'] = [];
  const inLand = (p: Point) => cells[cellAt(p)]!.land;
  for (const name of seaNames) {
    const w = name.length * 7.4;
    let best: { p: Point; score: number } | null = null;
    for (const spot of seaSpots) {
      const [x, y] = spot.p;
      if (x - w / 2 < 16 || x + w / 2 > W - 16 || y < 24 || y > H - 20) continue;
      if (x < 250 && y > H - 150) continue; // the legend note sits in this corner
      if (dist(spot.p, [compass.x, compass.y]) < compass.r + w / 2 + 20) continue;
      if (seaLabels.some((l) => dist(spot.p, [l.x, l.y]) < 300)) continue;
      const probes: Point[] = [[x - w / 2, y], [x + w / 2, y], [x, y - 10], [x, y + 6], [x - w / 4, y], [x + w / 4, y]];
      if (probes.some(inLand)) continue;
      const clear = Math.min(...probes.map((pr) => coastGrid.minDist(pr, 60)));
      if (clear < 14) continue;
      const score = Math.min(clear, 50) - Math.abs(y - H / 2) * 0.02;
      if (!best || score > best.score) best = { p: spot.p, score };
    }
    if (best) seaLabels.push({ text: name, x: best.p[0], y: best.p[1], angle: 0, size: 15 });
  }

  return {
    seed,
    width: W,
    height: H,
    regionIds,
    regions,
    edges,
    coast,
    ripples,
    roads,
    river: { d: riverD, line: riverLine },
    bridges,
    mountains,
    forests,
    hills,
    marsh,
    capitals,
    nationLabels,
    seaLabels,
    compass,
    attempts: 0,
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function pairKey(a: NationId, b: NationId): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function nearestCell(cells: Cell[], p: Point, ok: (c: Cell) => boolean): number {
  let best = -1;
  let bestD = Infinity;
  for (const c of cells) {
    if (!ok(c)) continue;
    const d = dist(c.centroid, p);
    if (d < bestD) {
      bestD = d;
      best = c.i;
    }
  }
  return best;
}

function nearestOf(cells: Cell[], pool: readonly number[], p: Point): number {
  let best = -1;
  let bestD = Infinity;
  for (const i of pool) {
    const d = dist(cells[i]!.centroid, p);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function flood(cells: Cell[], starts: number[], ok: (c: Cell) => boolean): Set<number> {
  const seen = new Set<number>();
  const stack = starts.filter((i) => ok(cells[i]!));
  for (const s of stack) seen.add(s);
  while (stack.length) {
    const i = stack.pop()!;
    for (const nb of cells[i]!.nbrs) {
      if (seen.has(nb) || !ok(cells[nb]!)) continue;
      seen.add(nb);
      stack.push(nb);
    }
  }
  return seen;
}

function components(cells: Cell[], members: readonly number[]): number[][] {
  const set = new Set(members);
  const seen = new Set<number>();
  const out: number[][] = [];
  for (const m of members) {
    if (seen.has(m)) continue;
    const comp: number[] = [];
    const stack = [m];
    seen.add(m);
    while (stack.length) {
      const i = stack.pop()!;
      comp.push(i);
      for (const nb of cells[i]!.nbrs) {
        if (!set.has(nb) || seen.has(nb)) continue;
        seen.add(nb);
        stack.push(nb);
      }
    }
    out.push(comp);
  }
  return out;
}

function meanCentroid(cells: Cell[], members: readonly number[]): Point {
  let x = 0;
  let y = 0;
  let a = 0;
  for (const i of members) {
    const c = cells[i]!;
    x += c.centroid[0] * c.area;
    y += c.centroid[1] * c.area;
    a += c.area;
  }
  return [x / a, y / a];
}

/** Multi-source Dijkstra: each member goes to the seed it is closest to (contiguous by construction). */
function partition(cells: Cell[], members: readonly number[], seeds: readonly number[]): number[][] {
  const set = new Set(members);
  const best = new Map<number, { d: number; s: number }>();
  const open: { i: number; d: number; s: number }[] = seeds.map((i, s) => ({ i, d: 0, s }));
  seeds.forEach((i, s) => best.set(i, { d: 0, s }));
  while (open.length) {
    let k = 0;
    for (let j = 1; j < open.length; j++) if (open[j]!.d < open[k]!.d) k = j;
    const cur = open.splice(k, 1)[0]!;
    if ((best.get(cur.i)?.d ?? Infinity) < cur.d) continue;
    for (const nb of cells[cur.i]!.nbrs) {
      if (!set.has(nb)) continue;
      const d = cur.d + dist(cells[cur.i]!.centroid, cells[nb]!.centroid);
      if (d < (best.get(nb)?.d ?? Infinity)) {
        best.set(nb, { d, s: cur.s });
        open.push({ i: nb, d, s: cur.s });
      }
    }
  }
  const parts: number[][] = seeds.map(() => []);
  for (const m of members) {
    const b = best.get(m);
    if (b) parts[b.s]!.push(m);
  }
  return parts;
}

function splitNation(cells: Cell[], members: number[], count: number, rng: Rng): number[][] {
  let bestParts: number[][] | null = null;
  let bestRatio = Infinity;
  for (let restart = 0; restart < 8; restart++) {
    // Farthest-point seeds, then a few Lloyd-style refinements.
    let seeds = [rng.pick(members)];
    while (seeds.length < count) {
      let far = -1;
      let farD = -1;
      for (const m of members) {
        const d = Math.min(...seeds.map((s) => dist(cells[s]!.centroid, cells[m]!.centroid)));
        if (d > farD) {
          farD = d;
          far = m;
        }
      }
      seeds.push(far);
    }
    let parts = partition(cells, members, seeds);
    for (let it = 0; it < 5; it++) {
      seeds = parts.map((p, k) => (p.length ? nearestOf(cells, p, meanCentroid(cells, p)) : seeds[k]!));
      parts = partition(cells, members, seeds);
    }
    if (parts.some((p) => p.length < 3)) continue;
    const sizes = parts.map((p) => p.length);
    const ratio = Math.max(...sizes) / Math.min(...sizes);
    if (ratio < bestRatio) {
      bestRatio = ratio;
      bestParts = parts;
    }
  }
  if (!bestParts || bestRatio > 3.2) fail('unbalanced regions');
  return bestParts;
}

function shortestPath(
  cells: Cell[],
  from: number,
  to: number,
  ok: (c: Cell) => boolean,
  cost: (a: Cell, b: Cell) => number,
): number[] | null {
  const best = new Map<number, number>([[from, 0]]);
  const prev = new Map<number, number>();
  const open: { i: number; d: number }[] = [{ i: from, d: 0 }];
  while (open.length) {
    let k = 0;
    for (let j = 1; j < open.length; j++) if (open[j]!.d < open[k]!.d) k = j;
    const cur = open.splice(k, 1)[0]!;
    if (cur.i === to) break;
    if ((best.get(cur.i) ?? Infinity) < cur.d) continue;
    for (const nb of cells[cur.i]!.nbrs) {
      const c = cells[nb]!;
      if (nb !== to && !ok(c)) continue;
      const d = cur.d + cost(cells[cur.i]!, c);
      if (d < (best.get(nb) ?? Infinity)) {
        best.set(nb, d);
        prev.set(nb, cur.i);
        open.push({ i: nb, d });
      }
    }
  }
  if (!best.has(to)) return null;
  const path = [to];
  while (path[0] !== from) {
    const p = prev.get(path[0]!);
    if (p === undefined) return null;
    path.unshift(p);
  }
  return path;
}

/** Recursive midpoint displacement: a hand-inked wobble that is identical for both sides of an edge. */
function displace(p: Point, q: Point, depth: number, amp: number, h: number, id: number): Point[] {
  if (depth <= 0) return [];
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const len = Math.hypot(dx, dy) || 1;
  const r = hash3(h, id, depth) * 2 - 1;
  const m: Point = [p[0] + dx / 2 + (-dy / len) * amp * r, p[1] + dy / 2 + (dx / len) * amp * r];
  return [...displace(p, m, depth - 1, amp * 0.5, h, id * 2), m, ...displace(m, q, depth - 1, amp * 0.5, h, id * 2 + 1)];
}

/** The point deepest inside a region (farthest from its outline), from the cell centroids. */
function regionPole(cells: Cell[], members: readonly number[], loops: Point[][]): { point: Point; depth: number } {
  let best: Point = cells[members[0]!]!.centroid;
  let bestDepth = -1;
  const candidates: Point[] = [];
  for (const i of members) {
    const c = cells[i]!.centroid;
    candidates.push(c);
    for (const nb of cells[i]!.nbrs) {
      if (members.includes(nb)) {
        const o = cells[nb]!.centroid;
        candidates.push([(c[0] + o[0]) / 2, (c[1] + o[1]) / 2]);
      }
    }
  }
  for (const p of candidates) {
    if (!loops.some((l) => pointInPolygon(p, l))) continue;
    const depth = Math.min(...loops.map((l) => distToPolyline(p, l)));
    if (depth > bestDepth) {
      bestDepth = depth;
      best = p;
    }
  }
  return { point: best, depth: bestDepth };
}

function firstInside(candidates: Point[], inside: (p: Point) => boolean): Point {
  return candidates.find(inside) ?? candidates[candidates.length - 1]!;
}

/** A filled ribbon that widens from source to mouth, so the river reads as hand-drawn. */
function taperedRibbon(line: Point[], w0: number, w1: number): string {
  const total = polylineLength(line);
  const left: Point[] = [];
  const right: Point[] = [];
  let run = 0;
  for (let i = 0; i < line.length; i++) {
    const p = line[i]!;
    if (i > 0) run += dist(line[i - 1]!, p);
    const a = line[Math.max(0, i - 1)]!;
    const b = line[Math.min(line.length - 1, i + 1)]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const t = run / total;
    const w = (w0 + (w1 - w0) * Math.pow(t, 1.3)) / 2;
    left.push([p[0] - (dy / len) * w, p[1] + (dx / len) * w]);
    right.push([p[0] + (dy / len) * w, p[1] - (dx / len) * w]);
  }
  return pathFromPoints([...left, ...right.reverse()], true);
}

/** Bucketed points for fast "is anything within r?" queries. */
class PointGrid {
  private buckets = new Map<string, Point[]>();
  constructor(private size: number) {}

  add(p: Point): void {
    const key = `${Math.floor(p[0] / this.size)},${Math.floor(p[1] / this.size)}`;
    const list = this.buckets.get(key);
    if (list) list.push(p);
    else this.buckets.set(key, [p]);
  }

  /** Distance to the nearest stored point, or `max` if none is closer. */
  minDist(p: Point, max: number): number {
    const reach = Math.ceil(max / this.size);
    const bx = Math.floor(p[0] / this.size);
    const by = Math.floor(p[1] / this.size);
    let best = max;
    for (let x = bx - reach; x <= bx + reach; x++) {
      for (let y = by - reach; y <= by + reach; y++) {
        const list = this.buckets.get(`${x},${y}`);
        if (!list) continue;
        for (const q of list) best = Math.min(best, Math.hypot(p[0] - q[0], p[1] - q[1]));
      }
    }
    return best;
  }
}

function densify(line: readonly Point[], step: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    const n = Math.max(1, Math.ceil(dist(a, b) / step));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  if (line.length) out.push(line[line.length - 1]!);
  return out;
}

/** Offset the coastline outward into the sea, dropping points that would crowd back onto land. */
function rippleLine(loops: Point[][], off: number, coastGrid: PointGrid, inLand: (p: Point) => boolean): string {
  let d = '';
  for (const loop of loops) {
    const n = loop.length;
    if (n < 8) continue;
    const normalAt = (i: number): Point => {
      const a = loop[(i - 2 + n) % n]!;
      const b = loop[(i + 2) % n]!;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      return [dy / len, -dx / len];
    };
    // Decide which side is the sea by probing a handful of vertices.
    let votes = 0;
    for (let k = 0; k < 12; k++) {
      const i = Math.floor((k * n) / 12);
      const nrm = normalAt(i);
      const p = loop[i]!;
      if (inLand([p[0] + nrm[0] * 4, p[1] + nrm[1] * 4])) votes--;
      else votes++;
    }
    const sign = votes >= 0 ? 1 : -1;
    const runs: Point[][] = [];
    let run: Point[] = [];
    for (let i = 0; i < n; i += 3) {
      const nrm = normalAt(i);
      const p = loop[i]!;
      const q: Point = [p[0] + nrm[0] * off * sign, p[1] + nrm[1] * off * sign];
      const ok = !inLand(q) && coastGrid.minDist(q, off) >= off * 0.72;
      if (ok) run.push(q);
      else if (run.length) {
        runs.push(run);
        run = [];
      }
    }
    if (run.length) runs.push(run);
    // Join the last run to the first when the loop closed without a break.
    if (runs.length > 1 && dist(runs[0]![0]!, runs[runs.length - 1]![runs[runs.length - 1]!.length - 1]!) < off + 4) {
      runs[0] = [...runs.pop()!, ...runs[0]!];
    }
    for (const r of runs) {
      if (r.length < 5) continue;
      d += pathFromPoints(chaikin(r, 1), false);
    }
  }
  return d;
}
