/** The season ribbon across the top of the table. */
import { CONFIG, seasonTitle } from '../../engine/config';

export function SeasonStrip({ season, audiencesLeft }: { season: number; audiencesLeft: number }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[1.2vh] z-20 -translate-x-1/2">
      <div
        className="parchment flex items-center gap-[0.9em] whitespace-nowrap px-[2.6em] py-[0.42em] text-ink"
        style={{
          clipPath: 'polygon(0 0, 100% 0, 97.4% 50%, 100% 100%, 0 100%, 2.6% 50%)',
          boxShadow: 'inset 0 0 18px rgb(122 82 30 / 0.5)',
        }}
      >
        <span className="font-display text-[1.02rem] font-semibold tracking-[0.06em]">{seasonTitle(season)}</span>
        <Dot />
        <span className="font-sc text-[0.95rem]">
          Season {season} of {CONFIG.seasons}
        </span>
        <Dot />
        <span className="font-sc text-[0.95rem]">Audiences left: {audiencesLeft}</span>
      </div>
    </div>
  );
}

function Dot() {
  return <span className="text-[0.7rem] text-wax">◆</span>;
}
