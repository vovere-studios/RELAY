/** A damped spring sampled once. No animation loop or layout reads on every frame. */
export function springEasing(duration = 460, damping = 24, stiffness = 210) {
  const frequency = Math.sqrt(stiffness - damping * damping / 4);
  const displacement = (time: number) => 1 - Math.exp(-damping * time / 2) *
    (Math.cos(frequency * time) + damping / (2 * frequency) * Math.sin(frequency * time));
  const end = displacement(duration / 1000);
  const stops = Array.from({ length: 41 }, (_, index) =>
    `${(displacement(duration * index / 40000) / end).toFixed(5)} ${(index * 2.5).toFixed(1)}%`);
  const easing = `linear(${stops.join(',')})`;
  return typeof CSS !== 'undefined' && CSS.supports('animation-timing-function', easing)
    ? easing : 'cubic-bezier(.2,.85,.25,1)';
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
