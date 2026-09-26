/** The season ribbon across the top of the table. Click it to reread the season's crisis. */
import { CONFIG, seasonTitle } from '../../engine/config';
import { openCrisis } from '../../store/flow';
import { useStore } from '../../store/worldStore';

export function SeasonStrip({ season, audiencesLeft }: { season: number; audiencesLeft: number }) {
  const crisis = useStore((s) => s.world?.crisis ?? null);
  const danger = crisis && crisis.tone === 'danger' ? crisis.line : null;
  return (
    <div className="absolute left-1/2 top-[1.2vh] z-20 flex -translate-x-1/2 flex-col items-center">
      <button
        type="button"
        onClick={openCrisis}
        title="Reread this season's crisis"
        className="parchment flex items-center gap-[0.9em] whitespace-nowrap px-[2.6em] py-[0.42em] text-ink transition-transform hover:-translate-y-px"
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
      </button>
      {danger && (
        <p className="mt-[0.3vh] max-w-[46vw] truncate px-[1em] py-[0.1em] font-body text-[0.86rem] italic text-[#f0a080]" style={{ textShadow: '0 1px 3px rgb(0 0 0 / 0.9)' }}>
          ⚠ {danger}
        </p>
      )}
    </div>
  );
}

function Dot() {
  return <span className="text-[0.7rem] text-wax">◆</span>;
}
