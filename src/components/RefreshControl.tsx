import { useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { reducedMotion } from '../lib/motion';

/** Turns while the request is active, then completes its revolution instead of snapping home. */
export function RefreshControl({ busy, onRefresh, compact = false }: {
  busy: boolean; onRefresh: () => void; compact?: boolean;
}) {
  const icon = useRef<SVGSVGElement>(null);
  const spin = useRef<Animation | null>(null);
  const landing = useRef<Animation | null>(null);
  useEffect(() => {
    const glyph = icon.current;
    if (!glyph) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const stop = () => { spin.current?.cancel(); landing.current?.cancel(); };
    const update = () => {
      if (reducedMotion()) { stop(); return; }
      if (busy) {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(glyph).transform);
        const angle = (Math.atan2(matrix.b, matrix.a) * 180 / Math.PI + 360) % 360;
        stop();
        spin.current = glyph.animate([{ transform: `rotate(${angle}deg)` }, { transform: `rotate(${angle + 360}deg)` }],
          { duration: 900, iterations: Infinity, easing: 'linear' });
      } else if (spin.current?.playState === 'running') {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(glyph).transform);
        const angle = (Math.atan2(matrix.b, matrix.a) * 180 / Math.PI + 360) % 360;
        spin.current.cancel();
        landing.current = glyph.animate([{ transform: `rotate(${angle}deg)` }, { transform: 'rotate(360deg)' }],
          { duration: 200 + (360 - angle) * .7, easing: 'cubic-bezier(.2,.65,.25,1)' });
      }
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [busy]);
  useEffect(() => () => { spin.current?.cancel(); landing.current?.cancel(); }, []);
  return <button type="button" className={compact ? 'icon-button workspace-refresh' : 'navigation-refresh'}
    aria-label={busy ? 'Updating workspace' : 'Refresh workspace'} aria-busy={busy} disabled={busy} onClick={onRefresh}>
    <RefreshCw ref={icon} size={compact ? 18 : 17} strokeWidth={1.65} className="refresh-glyph" aria-hidden="true"/>
    {!compact && <span>{busy ? 'Updating…' : 'Refresh'}</span>}
  </button>;
}
