/**
 * Sound: Howler plays any files present in /public/audio (ambient.mp3, paper.mp3, quill.mp3, bell.mp3,
 * drums.mp3, doors.mp3, coins.mp3). Missing files fall back to quiet synthesized stand-ins.
 * Nothing here can throw into the game: every failure is silent.
 */
import { Howl, Howler } from 'howler';
import { audioFiles } from 'virtual:diplomaps-assets';
import { synthesize, type SoundName } from './synth';

const VOLUME: Record<SoundName, number> = { ambient: 0.35, paper: 0.5, quill: 0.45, bell: 0.55, drums: 0.5, doors: 0.5, coins: 0.45 };

class SoundBoard {
  private howls = new Map<SoundName, Howl>();
  private buffers = new Map<SoundName, AudioBuffer>();
  private ctx: AudioContext | null = null;
  private ambientNode: AudioBufferSourceNode | null = null;
  private ambientGain: GainNode | null = null;
  private speechHowl: Howl | null = null;
  private drumsTimer: number | undefined;
  muted = false;

  private file(name: SoundName): string | null {
    return audioFiles.includes(`${name}.mp3`) ? `/audio/${name}.mp3` : null;
  }

  private howl(name: SoundName): Howl | null {
    const src = this.file(name);
    if (!src) return null;
    let h = this.howls.get(name);
    if (!h) {
      try {
        h = new Howl({ src: [src], volume: VOLUME[name], loop: name === 'ambient', html5: name === 'ambient', onloaderror: () => this.howls.delete(name) });
        this.howls.set(name, h);
      } catch {
        return null;
      }
    }
    return h;
  }

  /** Browsers only allow audio after the player has interacted with the page. */
  private activated(): boolean {
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    return ua ? ua.hasBeenActive : true;
  }

  private context(): AudioContext | null {
    if (!this.ctx && !this.activated()) return null;
    try {
      this.ctx ??= Howler.ctx ?? new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private buffer(name: SoundName): AudioBuffer | null {
    const ctx = this.context();
    if (!ctx) return null;
    let b = this.buffers.get(name);
    if (!b) {
      try {
        b = synthesize(ctx, name);
        this.buffers.set(name, b);
      } catch {
        return null;
      }
    }
    return b;
  }

  play(name: SoundName): void {
    if (this.muted || !this.activated()) return;
    try {
      const h = this.howl(name);
      if (h) {
        h.play();
        return;
      }
      const ctx = this.context();
      const b = this.buffer(name);
      if (!ctx || !b) return;
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = VOLUME[name];
      src.buffer = b;
      src.connect(gain).connect(ctx.destination);
      src.start();
    } catch {
      // silent by design
    }
  }

  startAmbient(): void {
    if (this.muted) return;
    if (!this.activated()) {
      window.addEventListener('pointerdown', () => this.startAmbient(), { once: true });
      return;
    }
    try {
      const h = this.howl('ambient');
      if (h) {
        if (!h.playing()) {
          h.volume(0);
          h.play();
          h.fade(0, VOLUME.ambient, 2500);
        }
        return;
      }
      if (this.ambientNode) return;
      const ctx = this.context();
      const b = this.buffer('ambient');
      if (!ctx || !b) return;
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(VOLUME.ambient, ctx.currentTime + 2.5);
      src.buffer = b;
      src.loop = true;
      src.connect(gain).connect(ctx.destination);
      src.start();
      this.ambientNode = src;
      this.ambientGain = gain;
    } catch {
      // silent by design
    }
  }

  stopAmbient(): void {
    try {
      this.howls.get('ambient')?.stop();
      this.ambientNode?.stop();
    } catch {
      // ignore
    }
    this.ambientNode = null;
    this.ambientGain = null;
  }

  playSpeech(base64: string): void {
    if (this.muted) return;
    try {
      if (Howler.ctx?.state === 'suspended') void Howler.ctx.resume();
      this.speechHowl?.stop();
      this.speechHowl = new Howl({
        src: [`data:audio/mpeg;base64,${base64}`],
        format: ['mp3'],
        volume: 0.85,
        onend: () => {
          this.speechHowl = null;
        },
        onplayerror: (_id, error) => {
          console.warn('[audio] speech playback failed', error);
          this.speechHowl?.once('unlock', () => this.speechHowl?.play());
        },
        onloaderror: () => {
          this.speechHowl = null;
        },
      });
      this.speechHowl.play();
    } catch {
      this.speechHowl = null;
    }
  }

  stopSpeech(): void {
    try {
      this.speechHowl?.stop();
    } catch {
      // ignore
    }
    this.speechHowl = null;
  }

  /** A slow heartbeat of drums while tension is dangerously high. */
  setDrums(on: boolean): void {
    if (on && this.drumsTimer === undefined) {
      this.play('drums');
      this.drumsTimer = window.setInterval(() => this.play('drums'), 2600);
    } else if (!on && this.drumsTimer !== undefined) {
      window.clearInterval(this.drumsTimer);
      this.drumsTimer = undefined;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      Howler.mute(muted);
      if (muted) this.stopSpeech();
      if (this.ambientGain && this.ctx) this.ambientGain.gain.value = muted ? 0 : VOLUME.ambient;
      if (muted) this.setDrums(false);
      else if (!this.ambientNode && !this.howls.get('ambient')?.playing()) this.startAmbient();
    } catch {
      // ignore
    }
  }
}

export const sound = new SoundBoard();
