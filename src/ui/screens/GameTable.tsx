/** The main screen: the map sheet in the middle of the table, surrounded by the objects you play with. */
import { useCallback } from 'react';
import { CONFIG } from '../../engine/config';
import type { RegionId } from '../../engine/types';
import { useStore } from '../../store/worldStore';
import { EndSeasonBell } from '../hud/EndSeasonBell';
import { NeutralityScale } from '../hud/NeutralityScale';
import { Purse } from '../hud/Purse';
import { SeasonStrip } from '../hud/SeasonStrip';
import { TensionCandle } from '../hud/TensionCandle';
import { MapSheet } from '../map/MapSheet';
import { MapView } from '../map/MapView';
import { Chronicle } from '../panels/Chronicle';
import { LedgerBook } from '../panels/LedgerBook';
import { PassageLetters } from '../panels/PassageLetters';
import { InkPot } from '../table/Decor';
import { Table } from '../table/Table';

export function GameTable() {
  const world = useStore((s) => s.world);
  const hoverRegion = useStore((s) => s.hoverRegion);
  const setHoverRegion = useStore((s) => s.setHoverRegion);
  const selectNation = useStore((s) => s.selectNation);

  const onSelect = useCallback(
    (id: RegionId) => {
      const owner = useStore.getState().world?.regions[id]?.owner;
      if (owner) selectNation(owner);
    },
    [selectNation],
  );

  if (!world) return null;
  const ledger = world.player.ledger;
  return (
    <Table danger={world.tension > CONFIG.tension.drumsAbove}>
      <div className="game-layout relative h-full w-full">
        <InkPot className="pointer-events-none absolute left-[0.8vw] top-[0.6vh] h-[7.5vh] w-auto opacity-90" />
        <SeasonStrip season={world.season} audiencesLeft={CONFIG.audiencesPerSeason - world.audiencesThisSeason.length} />

        <aside className="absolute bottom-[var(--bottom)] left-[1.1vw] top-[calc(var(--top)+1vh)] flex w-[var(--left-col)] flex-col gap-[2vh]">
          <div className="min-h-0 flex-[1_1_64%]">
            <Chronicle entries={world.chronicle} freshSeason={null} />
          </div>
          <div className="flex-[0_1_auto]">
            <PassageLetters letters={world.letters} onOpen={() => {}} />
          </div>
        </aside>

        <div className="map-stage">
          <MapSheet>
            <MapView world={world} hoverRegion={hoverRegion} onHover={setHoverRegion} onSelect={onSelect} />
          </MapSheet>
        </div>

        <aside className="absolute bottom-[var(--bottom)] right-[0.9vw] top-[1.4vh] flex w-[var(--right-col)] flex-col items-center justify-between">
          <TensionCandle tension={world.tension} />
          <Purse gold={world.player.gold} />
          <NeutralityScale neutrality={world.player.neutrality} />
          <LedgerBook entries={ledger.length} caught={ledger.filter((e) => e.caught).length} onOpen={() => {}} />
          <EndSeasonBell onRing={() => {}} />
        </aside>
      </div>
    </Table>
  );
}
