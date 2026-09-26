/**
 * Exposes which optional art and audio files exist in /public as `virtual:diplomaps-assets`,
 * so the game only requests files that are really there (no 404s, no console noise).
 */
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const ID = 'virtual:diplomaps-assets';
const RESOLVED = `\0${ID}`;

function list(dir: string): string[] {
  try {
    return existsSync(dir) ? readdirSync(dir).filter((f) => !f.startsWith('.')) : [];
  } catch {
    return [];
  }
}

export function assetManifest(): Plugin {
  let root = process.cwd();
  return {
    name: 'diplomaps-asset-manifest',
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      return id === ID ? RESOLVED : null;
    },
    load(id) {
      if (id !== RESOLVED) return null;
      const audio = list(path.join(root, 'public', 'audio'));
      const assets = list(path.join(root, 'public', 'assets'));
      return `export const audioFiles = ${JSON.stringify(audio)};\nexport const assetFiles = ${JSON.stringify(assets)};\n`;
    },
    configureServer(server) {
      const watched = [path.join(root, 'public', 'audio'), path.join(root, 'public', 'assets')];
      const refresh = (file: string) => {
        if (!watched.some((d) => file.startsWith(d))) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.add(watched);
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
    },
  };
}
