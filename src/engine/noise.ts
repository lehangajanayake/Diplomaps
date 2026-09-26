/** Seeded 2D value noise with fractal octaves, used to rag the coastline and bend borders. */
import { hash3 } from './rng.js';

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lattice(seed: number, x: number, y: number): number {
  return hash3(x, y, seed) * 2 - 1;
}

export function valueNoise(seed: number, x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = fade(x - x0);
  const ty = fade(y - y0);
  const a = lattice(seed, x0, y0);
  const b = lattice(seed, x0 + 1, y0);
  const c = lattice(seed, x0, y0 + 1);
  const d = lattice(seed, x0 + 1, y0 + 1);
  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * ty;
}

/** Fractal noise in roughly [-1, 1]. */
export function fbm(seed: number, x: number, y: number, octaves = 4): number {
  let amplitude = 1;
  let frequency = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * valueNoise(seed + i * 1013, x * frequency, y * frequency);
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return sum / norm;
}
