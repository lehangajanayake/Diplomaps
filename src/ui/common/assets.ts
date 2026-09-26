/** Optional art dropped into /public/assets. Only files that exist are ever requested. */
import { assetFiles } from 'virtual:diplomaps-assets';

export function optionalAsset(name: string): string | null {
  return assetFiles.includes(name) ? `/assets/${name}` : null;
}
