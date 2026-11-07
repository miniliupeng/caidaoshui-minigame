/** 仅启动帧对齐用。对局里的动画时间一律读 session.game.now。 */
export function perfNow(): number {
  const perf = globalThis.performance;
  if (perf && typeof perf.now === 'function') return perf.now();
  return Date.now();
}
