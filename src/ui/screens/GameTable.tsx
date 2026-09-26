/** The main screen: the map sheet in the middle of the table, surrounded by the objects you play with. */
import { AnimatePresence } from 'motion/react';
import { useCallback, useEffect } from 'react';
import { CONFIG } from '../../engine/config';
import type { RegionId } from '../../engine/types';
import { sound } from '../../audio/sound';
import { audiencesLeft, closeOverlay, endSeason, openCrossing, openDossier, openLedger, openLetter } from '../../store/flow';
import { useStore } from '../../store/worldStore';
import { AudienceScene } from '../audience/AudienceScene';
import { EndSeasonBell } from '../hud/EndSeasonBell';
import { NeutralityScale } from '../hud/NeutralityScale';
import { Purse } from '../hud/Purse';
import { SeasonStrip } from '../hud/SeasonStrip';
import { TensionCandle } from '../hud/TensionCandle';
import { MapSheet } from '../map/MapSheet';
import { MapView } from '../map/MapView';
import { Chronicle } from '../panels/Chronicle';
import { CrossingSheet } from '../panels/CrossingSheet';
import { Dossier } from '../panels/Dossier';
import { LedgerView } from '../panels/Ledger';
import { LedgerBook } from '../panels/LedgerBook';
import { LetterView } from '../panels/LetterView';
import { PassageLetters } from '../panels/PassageLetters';
import { InkPot } from '../table/Decor';
import { Notes } from '../table/Notes';
import { Table } from '../table/Table';
import { SeasonCard } from './SeasonCard';

export function GameTable() {
  const world = useStore((s) => s.world);
  const hoverRegion = useStore((s) => s.hoverRegion);
  const setHoverRegion = useStore((s) => s.setHoverRegion);
  const selectedNation = useStore((s) => s.selectedNation);
  const overlay = useStore((s) => s.overlay);
  const audience = useStore((s) => s.audience);
  const chronicleFresh = useStore((s) => s.chronicleFresh);
  const chroniclePending = useStore((s) => s.chroniclePending);
  const resolving = useStore((s) => s.resolving);
  const fx = useStore((s) => s.fx);
  const muted = useStore((s) => s.muted);
  const tension = useStore((s) => s.world?.tension ?? 0);

  useEffect(() => {
    sound.setDrums(!muted && tension > CONFIG.tension.drumsAbove);
    return () => sound.setDrums(false);
  }, [tension, muted]);

  const onSelect = useCallback((id: RegionId) => {
    const owner = useStore.getState().world?.regions[id]?.owner;
    if (!owner) return;
    if (owner === 'crossing') openCrossing();
    else openDossier(owner);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const s = useStore.getState();
      if (s.overlay) closeOverlay();
      else if (s.selectedNation) openDossier(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!world) return null;
  const ledger = world.player.ledger;
  const letter = overlay?.kind === 'letter' ? world.letters.find((l) => l.id === overlay.id) : undefined;
  const visibleLetters = world.letters.filter((l) => l.season <= world.season);
  const sealed = visibleLetters.filter((l) => l.status === 'sealed').length;

  return (
    <Table danger={world.tension > CONFIG.tension.drumsAbove}>
      <div className="game-layout relative h-full w-full">
        <InkPot className="pointer-events-none absolute left-[0.8vw] top-[0.6vh] h-[7.5vh] w-auto opacity-90" />
        <SeasonStrip season={world.season} audiencesLeft={audiencesLeft(world)} />

        <aside className="absolute bottom-[var(--bottom)] left-[1.1vw] top-[calc(var(--top)+1vh)] z-20 flex w-[var(--left-col)] flex-col gap-[2vh]">
          <div className="min-h-0 flex-[1_1_64%]">
            <Chronicle entries={world.chronicle} freshSeason={chronicleFresh} pending={chroniclePending} />
          </div>
          <div className="flex-[0_1_auto]">
            <PassageLetters letters={visibleLetters} onOpen={openLetter} />
          </div>
        </aside>

        <div className="map-stage">
          <MapSheet>
            <MapView world={world} fx={fx} hoverRegion={hoverRegion} onHover={setHoverRegion} onSelect={onSelect} interactive={!resolving} />
          </MapSheet>
        </div>

        <aside className="absolute bottom-[var(--bottom)] right-[0.9vw] top-[1.4vh] z-20 flex w-[var(--right-col)] flex-col items-center justify-between">
          <TensionCandle tension={world.tension} />
          <Purse gold={world.player.gold} onClick={openCrossing} />
          <NeutralityScale neutrality={world.player.neutrality} />
          <LedgerBook entries={ledger.length} caught={ledger.filter((e) => e.caught).length} onOpen={openLedger} />
          <EndSeasonBell
            onRing={() => void endSeason()}
            disabled={resolving || !!audience}
            note={sealed ? `${sealed} ${sealed === 1 ? 'letter' : 'letters'} unanswered` : undefined}
          />
        </aside>

        <AnimatePresence>
          {selectedNation && !audience && <Dossier key={selectedNation} world={world} nation={selectedNation} />}
          {overlay?.kind === 'crossing' && <CrossingSheet key="crossing" world={world} />}
        </AnimatePresence>
        <AnimatePresence>
          {overlay?.kind === 'ledger' && <LedgerView key="ledger" world={world} />}
          {letter && <LetterView key={letter.id} world={world} letter={letter} />}
        </AnimatePresence>
        <Notes />
      </div>
      <AnimatePresence>{audience && <AudienceScene key="audience" />}</AnimatePresence>
      <SeasonCard />
    </Table>
  );
}
