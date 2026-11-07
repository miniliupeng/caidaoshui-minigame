/**
 * 液面晃动只看统一时钟 now 与 surfacePhase 的差。
 * dt 不在 [0, dur) 时相位清零，避免时钟回绕后永久闪烁。
 */
export function sampleWobble(
  now: number,
  phase: number,
  dur: number
): { value: number; phase: number } {
  if (!phase) return { value: 0, phase: 0 };
  const dt = now - phase;
  if (dt >= 0 && dt < dur) {
    const value = Math.sin(dt * 0.035) * 1.6 * (1 - dt / dur);
    return { value, phase };
  }
  return { value: 0, phase: 0 };
}
