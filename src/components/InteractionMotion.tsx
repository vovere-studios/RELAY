import { useEffect } from 'react';
import { springEasing } from '../lib/motion';

const controls = '.button,.icon-button,.select-trigger,.appearance-choice,.workspace-location,.navigation-refresh,.public-start,.public-cta,.public-demo,.public-menu,.connected-company-row,.connected-global-search,.connected-attention,.navigation-destination,.segmented-control>button,.inbox-task';

/** One delegated press interaction. It never delays clicks, captures pointers or blocks scrolling. */
export function InteractionMotion() {
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new Map<HTMLElement, Animation>();
    let pressed: HTMLElement | null = null;
    let pointer: number | null = null;
    const releaseEase = springEasing(480, 25, 280);
    const root = document.documentElement;
    const previousEase = root.style.getPropertyValue('--control-spring');
    root.style.setProperty('--control-spring', springEasing(440, 25, 280));
    const find = (target: EventTarget | null) => {
      const element = target instanceof Element ? target.closest<HTMLElement>(controls) : null;
      return element && !element.matches(':disabled,[aria-disabled="true"]') && !element.closest('[inert]') ? element : null;
    };
    const animate = (element: HTMLElement, destination: number, release = false) => {
      if (preference.matches || !element.isConnected) return;
      // Individual scale composes with dialog/page transforms rather than replacing them.
      const scale = getComputedStyle(element).scale;
      const from = scale === 'none' ? '1' : scale;
      animations.get(element)?.cancel();
      const animation = element.animate([{ scale: from }, { scale: String(destination) }], {
        duration: release ? 480 : 100,
        easing: release ? releaseEase : 'cubic-bezier(.2,.7,.3,1)',
        fill: release ? 'none' : 'forwards',
      });
      animations.set(element, animation);
      if (release) animation.finished.then(() => {
        if (animations.get(element) === animation) { animation.cancel(); animations.delete(element); }
      }).catch(() => {});
    };
    const release = () => {
      if (!pressed) return;
      const element = pressed;
      pressed = null; pointer = null;
      delete element.dataset.pressing;
      if (preference.matches || !element.isConnected) { animations.get(element)?.cancel(); animations.delete(element); return; }
      animate(element, 1, true);
    };
    const begin = (element: HTMLElement, touch: boolean) => {
      if (pressed !== element) release();
      pressed = element;
      element.dataset.pressing = 'true';
      const row = element.matches('.connected-company-row,.connected-attention,.inbox-task');
      animate(element, row ? (touch ? .993 : .997) : element.matches('.icon-button,.appearance-choice') ? (touch ? .94 : .96) : (touch ? .96 : .975));
    };
    const down = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      const element = find(event.target);
      if (element) { begin(element, event.pointerType === 'touch'); pointer = event.pointerId; }
    };
    const up = (event: PointerEvent) => { if (pointer === event.pointerId) release(); };
    const leave = (event: PointerEvent) => {
      if (pressed && pointer === event.pointerId && event.target instanceof Node && pressed.contains(event.target)
        && !(event.relatedTarget instanceof Node && pressed.contains(event.relatedTarget))) release();
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.repeat || !['Enter', ' '].includes(event.key)) return;
      const element = find(event.target);
      if (element) begin(element, false);
    };
    const keyUp = (event: KeyboardEvent) => { if (['Enter', ' '].includes(event.key)) release(); };
    const focusOut = (event: FocusEvent) => { if (event.target === pressed && pointer === null) release(); };
    const clear = () => { release(); animations.forEach(animation => animation.cancel()); animations.clear(); };
    document.addEventListener('pointerdown', down, { capture: true, passive: true });
    document.addEventListener('pointerup', up, { capture: true, passive: true });
    document.addEventListener('pointercancel', up, { capture: true, passive: true });
    document.addEventListener('pointerout', leave, { capture: true, passive: true });
    document.addEventListener('keydown', keyDown, true);
    document.addEventListener('keyup', keyUp, true);
    document.addEventListener('focusout', focusOut, true);
    window.addEventListener('blur', clear);
    preference.addEventListener('change', clear);
    return () => {
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('pointerup', up, true);
      document.removeEventListener('pointercancel', up, true);
      document.removeEventListener('pointerout', leave, true);
      document.removeEventListener('keydown', keyDown, true);
      document.removeEventListener('keyup', keyUp, true);
      document.removeEventListener('focusout', focusOut, true);
      window.removeEventListener('blur', clear);
      preference.removeEventListener('change', clear);
      if (previousEase) root.style.setProperty('--control-spring', previousEase);
      else root.style.removeProperty('--control-spring');
      clear();
    };
  }, []);
  return null;
}
