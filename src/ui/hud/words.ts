/** Plain-language readings of the HUD numbers. */
export function tensionWord(t: number): string {
  if (t < 20) return 'Calm';
  if (t < 40) return 'Uneasy';
  if (t < 60) return 'Tense';
  if (t < 80) return 'Grave';
  return 'On the brink';
}

export function neutralityWord(n: number): string {
  if (n >= 80) return 'Impartial';
  if (n >= 60) return 'Leaning';
  if (n >= 35) return 'Partisan';
  return 'Compromised';
}

export function trustWord(t: number): string {
  if (t >= 60) return 'Devoted';
  if (t >= 30) return 'Friendly';
  if (t >= 10) return 'Cordial';
  if (t > -10) return 'Wary';
  if (t > -35) return 'Cold';
  if (t > -60) return 'Hostile';
  return 'Implacable';
}

export function suspicionWord(s: number): string {
  if (s < 15) return 'None';
  if (s < 40) return 'Low';
  if (s < 70) return 'Rising';
  if (s < 90) return 'High';
  return 'Certain';
}
