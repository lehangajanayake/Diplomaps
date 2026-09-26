/** Optional art dropped into /public/assets. Only files that exist are ever requested. */
import { assetFiles } from 'virtual:diplomaps-assets';

export function optionalAsset(name: string): string | null {
  return assetFiles.includes(name) ? `/assets/${name}` : null;
}

/** Swap the CSS wood and parchment for real photographs when wood.jpg / parchment.jpg are present. */
export function applyOptionalTextures(): void {
  const root = document.documentElement.style;
  const wood = optionalAsset('wood.jpg');
  if (wood) {
    root.setProperty('--wood-image', `linear-gradient(rgb(10 5 2 / 0.35), rgb(10 5 2 / 0.35)), url("${wood}")`);
    root.setProperty('--wood-size', 'cover');
  }
  const parchment = optionalAsset('parchment.jpg');
  if (parchment) {
    root.setProperty('--parchment-image', `url("${parchment}")`);
    root.setProperty('--parchment-size', 'cover');
  }
}
