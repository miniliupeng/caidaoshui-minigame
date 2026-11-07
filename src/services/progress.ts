import { LEVELS } from '../data/levels';
import { readStorage, writeStorage } from '../platform/storage';

export const PROGRESS_KEY = 'caidaoshui_progress';

/** 已解锁的关卡下标。0 表示还在第 1 关，首页不显示「继续」。 */
export function loadProgress(): number {
  try {
    const raw = readStorage(PROGRESS_KEY);
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(LEVELS.length - 1, Math.floor(n));
  } catch (_err) {
    return 0;
  }
}

/** 通关后解锁下一关。只增不减，避免重玩旧关把进度打回去。 */
export function saveProgressUnlocked(clearedLevelIdx: number): void {
  const unlocked = Math.min(LEVELS.length - 1, Math.max(0, clearedLevelIdx + 1));
  const next = Math.max(loadProgress(), unlocked);
  try {
    writeStorage(PROGRESS_KEY, String(next));
  } catch (_err) {
    /* 存档失败不打断过关 */
  }
}
