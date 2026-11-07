const memory = new Map<string, string>();

function hasWxStorage(): boolean {
  return typeof wx !== 'undefined' && typeof wx.getStorageSync === 'function' && typeof wx.setStorageSync === 'function';
}

/** 微信存储优先，其次 localStorage，最后进程内内存（方便单测与无存储环境）。 */
export function readStorage(key: string): unknown {
  try {
    if (hasWxStorage()) return wx.getStorageSync(key);
  } catch (_err) {
    /* 存储不可用时继续降级 */
  }
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
  } catch (_err) {
    /* ignore */
  }
  return memory.has(key) ? memory.get(key) : null;
}

export function writeStorage(key: string, value: string): void {
  try {
    if (hasWxStorage()) wx.setStorageSync(key, value);
  } catch (_err) {
    /* ignore */
  }
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch (_err) {
    /* ignore */
  }
  memory.set(key, value);
}

export function clearMemoryStorage(): void {
  memory.clear();
}
