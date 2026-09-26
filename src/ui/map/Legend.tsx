/** The legend: a small annotated note pinned in the corner of the map. */
import { GOLD, INK, RIVER, ROAD } from './palette';

const row = 'flex items-center gap-2 leading-tight';

export function Legend() {
  return (
    <div
      className="pointer-events-none absolute bottom-[3.2%] left-[2.4%] w-[15.5%] min-w-[128px] -rotate-2 select-none px-[0.7em] py-[0.55em] text-[0.66rem] text-ink"
      style={{
        background: 'linear-gradient(170deg, #f1e4c2, #e2cfa3)',
        boxShadow: '0 2px 5px rgb(0 0 0 / 0.35), inset 0 0 12px rgb(120 80 30 / 0.3)',
        fontFamily: "'IM Fell English', serif",
      }}
    >
      <div className="mb-1 text-center font-sc text-[0.7rem] tracking-[0.12em]">Legend</div>
      <div className={row}>
        <svg width="18" height="12" viewBox="-10 -13 20 16">
          <use href="#castle" />
        </svg>
        Capital
      </div>
      <div className={row}>
        <svg width="18" height="12" viewBox="-7 -8 14 12">
          <use href="#gate" />
        </svg>
        Pass into the Crossing
      </div>
      <div className={row}>
        <svg width="18" height="8" viewBox="0 0 18 8">
          <path d="M0 4 H18" stroke={ROAD} strokeWidth={1.4} strokeDasharray="4 2.5" />
        </svg>
        Road
      </div>
      <div className={row}>
        <svg width="18" height="8" viewBox="0 0 18 8">
          <path d="M0 5 C5 1 10 7 18 3" stroke={RIVER} strokeWidth={2.2} fill="none" />
        </svg>
        River
      </div>
      <div className={row}>
        <svg width="18" height="12" viewBox="-12 -13 24 16">
          <use href="#mtn-1" />
        </svg>
        Mountains
      </div>
      <div className={row}>
        <svg width="18" height="8" viewBox="0 0 18 8">
          <path d="M0 4 H18" stroke={GOLD} strokeWidth={2.4} />
          <path d="M0 4 H18" stroke={INK} strokeWidth={0.6} />
        </svg>
        The Crossing
      </div>
    </div>
  );
}
