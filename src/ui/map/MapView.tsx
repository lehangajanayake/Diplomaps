/**
 * The hero: a hand-inked parchment map with gentle pan and zoom.
 * Layers (bottom to top): sea wash, sea shimmer, static map SVG, paper grain, dynamic SVG (hover,
 * tokens, effects), then screen-space cloud shadows. Only the dynamic layer re-renders often.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { nameOf } from '../../engine/nations';
import type { Holder, RegionId, RegionState, WorldState } from '../../engine/types';
import { useStore, type MapFx } from '../../store/worldStore';
import { SeasonFx } from './SeasonFx';
import { Legend } from './Legend';
import { RegionHitAreas, RegionHover } from './Region';
import { StaticMap } from './StaticMap';
import { Tokens } from './Tokens';
import { GainFx } from './GainFx';
import { WarMarks } from './WarMarks';

interface Props {
  world: WorldState;
  fx?: MapFx | null;
  onSelect: (id: RegionId) => void;
  children?: ReactNode;
  interactive?: boolean;
}

interface View {
  x: number;
  y: number;
  k: number;
}

const MIN_K = 1;
const MAX_K = 2.6;

export function MapView({ world, fx = null, onSelect, children, interactive = true }: Props) {
  const { map } = world;
  // Hover lives here, not in the table, so moving the mouse re-renders only the map's light layer.
  const hoverRegion = useStore((s) => s.hoverRegion);
  const gains = useStore((s) => s.gains);
  const onHover = useStore((s) => s.setHoverRegion);
  // While the season's effects play, the map shows the world as it was; then it settles into the new one.
  const shown: Record<RegionId, RegionState> = fx && !fx.settled ? fx.before : world.regions;
  const viewportRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [moving, setMoving] = useState(false);
  const [grabbing, setGrabbing] = useState(false);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean; id: number } | null>(null);
  const settleTimer = useRef<number | undefined>(undefined);

  const ownersKey = map.regionIds.map((id) => shown[id]!.owner).join(',');
  const owners = useMemo(() => {
    const out: Record<RegionId, Holder> = {};
    ownersKey.split(',').forEach((o, i) => (out[map.regionIds[i]!] = o as Holder));
    return out;
  }, [ownersKey, map.regionIds]);

  const clampView = useCallback((v: View): View => {
    const el = viewportRef.current;
    if (!el) return v;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const k = Math.min(MAX_K, Math.max(MIN_K, v.k));
    return {
      k,
      x: Math.min(0, Math.max(w * (1 - k), v.x)),
      y: Math.min(0, Math.max(h * (1 - k), v.y)),
    };
  }, []);

  const settle = useCallback(() => {
    setMoving(true);
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => setMoving(false), 220);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !interactive) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setView((v) => {
        const k = Math.min(MAX_K, Math.max(MIN_K, v.k * Math.exp(-e.deltaY * 0.0016)));
        return clampView({ k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k });
      });
      settle();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [clampView, settle, interactive]);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive || e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false, id: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const tip = tooltipRef.current;
    const el = viewportRef.current;
    if (tip && el) {
      const rect = el.getBoundingClientRect();
      tip.style.transform = `translate(${e.clientX - rect.left + 16}px, ${e.clientY - rect.top + 14}px)`;
    }
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    if (!d.moved) {
      d.moved = true;
      setGrabbing(true);
      (e.currentTarget as HTMLElement).setPointerCapture(d.id);
    }
    setView((v) => clampView({ k: v.k, x: d.vx + dx, y: d.vy + dy }));
    settle();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (d?.moved) {
      (e.currentTarget as HTMLElement).releasePointerCapture(d.id);
      setGrabbing(false);
    }
    window.setTimeout(() => (drag.current = null), 0);
  };

  const handleEnter = useCallback((id: RegionId) => onHover(id), [onHover]);
  const handleLeave = useCallback(() => onHover(null), [onHover]);
  const handleClick = useCallback(
    (id: RegionId) => {
      if (drag.current?.moved) return;
      onSelect(id);
    },
    [onSelect],
  );

  const hover = hoverRegion ? map.regions[hoverRegion] : null;
  const hoverState = hoverRegion ? shown[hoverRegion] : null;

  return (
    <div
      ref={viewportRef}
      className="relative h-full w-full overflow-hidden"
      style={{ cursor: grabbing ? 'grabbing' : 'default', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => onHover(null)}
      onDoubleClick={() => setView({ x: 0, y: 0, k: 1 })}
    >
      <div
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.k})`,
          willChange: moving ? 'transform' : 'auto',
        }}
      >
        <div className="map-sea absolute inset-0" />
        <div className="map-shimmer pointer-events-none absolute inset-0 overflow-hidden">
          <div className="map-shimmer-inner absolute -inset-[20%]" />
        </div>
        <StaticMap map={map} owners={owners} />
        <div className="map-grain pointer-events-none absolute inset-0" />
        <svg viewBox={`0 0 ${map.width} ${map.height}`} className="absolute inset-0 h-full w-full">
          {interactive && <RegionHitAreas map={map} onEnter={handleEnter} onLeave={handleLeave} onClick={handleClick} />}
          {hover && hoverState && <RegionHover map={map} id={hover.id} owner={hoverState.owner} />}
          <WarMarks world={world} />
          {gains && <GainFx map={map} gains={gains} />}
          <Tokens map={map} regions={shown} />
          {fx && !fx.settled && <SeasonFx map={map} fx={fx} />}
          {children}
        </svg>
      </div>

      <div className="map-clouds pointer-events-none absolute inset-0" />
      <Legend />

      <div
        ref={tooltipRef}
        className="pointer-events-none absolute left-0 top-0 z-10 whitespace-nowrap px-2.5 py-1 text-ink transition-opacity duration-150"
        style={{
          opacity: hover ? 1 : 0,
          background: 'linear-gradient(175deg, #f4e8c9, #e3d0a4)',
          boxShadow: '0 3px 8px rgb(0 0 0 / 0.45)',
          fontFamily: "'IM Fell English', serif",
          fontSize: '0.85rem',
        }}
      >
        {hover && hoverState && (
          <>
            <span className="font-sc text-[0.95rem]">{hover.name}</span>
            <span className="text-ink-faded">
              {' '}
              · {hoverState.owner === 'unclaimed' ? 'unclaimed ruins' : nameOf(hoverState.owner, 'start')}
              {hoverState.troops > 0 ? ` · ${hoverState.troops} ${hoverState.owner === 'crossing' ? 'militia' : 'troops'}` : ''}
              {hover.pass ? ' · a pass' : ''}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
