/** Temporary title: replaced by the full candlelit title screen in a later step. */
import { beginGame } from '../../store/flow';

export function TitleScreen() {
  return (
    <div className="wood flex h-full items-center justify-center">
      <button type="button" className="parchment px-12 py-8 font-title text-4xl text-ink" onClick={() => beginGame()}>
        Diplomaps: Begin
      </button>
    </div>
  );
}
