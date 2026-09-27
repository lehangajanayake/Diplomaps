/** Where an element sits on screen, found by CSS selector and followed while it moves (for spotlights and glows). */
import { useEffect, useState } from 'react';

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** `pad` grows the box on every side; the box is re-measured every frame while the selector is set. */
export function useTargetBox(selector: string | null, pad = 8): Box | null {
  const [box, setBox] = useState<Box | null>(null);
  useEffect(() => {
    if (!selector) return;
    let frame = 0;
    const measure = () => {
      const r = document.querySelector(selector)?.getBoundingClientRect();
      const next = r && r.width > 0 ? { left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: Math.max(r.height, 12) + pad * 2 } : null;
      setBox((prev) =>
        prev === next || (prev && next && Math.abs(prev.left - next.left) + Math.abs(prev.top - next.top) + Math.abs(prev.width - next.width) + Math.abs(prev.height - next.height) < 1) ? prev : next,
      );
      frame = window.requestAnimationFrame(measure);
    };
    frame = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(frame);
  }, [selector, pad]);
  return selector ? box : null;
}
