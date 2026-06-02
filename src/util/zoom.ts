/** Continuous zoom bounds, shared by buttons/keyboard (discrete) and wheel/pinch (continuous). */
export const MIN_SCALE = 0.25;
export const MAX_SCALE = 3;

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(scale.toFixed(3))));
}

/**
 * Next scale for a zoom wheel/pinch gesture. On macOS, trackpad pinch and Ctrl+wheel both arrive
 * as a wheel event with ctrlKey true; deltaY < 0 means zoom in. Exponential so each notch is a
 * constant ratio. Caller only invokes this when isZoomWheel(e) is true.
 */
export function nextScaleFromWheel(deltaY: number, scale: number): number {
  return clampScale(scale * Math.exp(-deltaY * 0.004));
}

export function isZoomWheel(e: { ctrlKey: boolean; metaKey: boolean }): boolean {
  return e.ctrlKey || e.metaKey;
}
