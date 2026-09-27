/**
 * A soft candle-glow ring around the object on the table an agenda item points at. Drawn into the body,
 * so the map sheet's clipping never hides it.
 */
import { createPortal } from 'react-dom';
import { useTargetBox } from '../common/useTargetBox';

export function AgendaGlow({ selector, strong }: { selector: string | null; strong: boolean }) {
  const box = useTargetBox(selector, 5);
  if (!box) return null;
  return createPortal(
    <div
      className="agenda-glow pointer-events-none fixed z-[25] rounded-[8px]"
      style={{
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        boxShadow: strong
          ? '0 0 30px 9px rgb(255 196 100 / 0.7), inset 0 0 0 2px rgb(255 220 150 / 0.95)'
          : '0 0 22px 5px rgb(255 196 100 / 0.5), inset 0 0 0 1.5px rgb(255 220 150 / 0.8)',
      }}
      aria-hidden
    />,
    document.body,
  );
}
