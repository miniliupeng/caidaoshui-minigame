/**
 * 常驻循环 BGM（微信官方规范）
 *
 * 依据知识库：
 * - guide/base-ability/audio.md：长音频/背景乐用 InnerAudio，useWebAudioImplement=false；
 *   示例 loop=true；onCanplay 后再 play；wx.onShow / onAudioInterruptionEnd 恢复
 * - api/media/audio/wx.createInnerAudioContext.md：长音频关闭 WebAudio 驱动
 * - api/media/audio/InnerAudioContext.md：loop / volume；mp3 双端支持
 * - api/media/audio/wx.setInnerAudioOption.md：全局 obeyMuteSwitch（在 sfx 已设）
 * - api/storage/wx.setStorageSync.md：静音偏好持久化
 */

const BGM_SRC = 'audio/bgm.mp3';
const BGM_VOLUME = 0.45;
const STORAGE_KEY = 'caidaoshui_bgm_muted';

let bgmCtx: any = null;
let webAudio: HTMLAudioElement | null = null;
let ready = false;
let pendingStart = false;
let started = false;
let muted = false;
let lifecycleBound = false;
let wantPlaying = true; // user wants BGM on (unless muted)

function isWx(): boolean {
  return typeof wx !== 'undefined' && typeof wx.createInnerAudioContext === 'function';
}

function loadMuted(): boolean {
  try {
    if (isWx() && typeof wx.getStorageSync === 'function') {
      const v = wx.getStorageSync(STORAGE_KEY);
      return v === true || v === 1 || v === '1' || v === 'true';
    }
  } catch (_e) {
    /* ignore */
  }
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) === '1';
    }
  } catch (_e) {
    /* ignore */
  }
  return false;
}

function saveMuted(v: boolean): void {
  try {
    if (isWx() && typeof wx.setStorageSync === 'function') {
      wx.setStorageSync(STORAGE_KEY, v ? '1' : '0');
    }
  } catch (_e) {
    /* ignore */
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
    }
  } catch (_e) {
    /* ignore */
  }
}

function ensureWxBgm(): any {
  if (bgmCtx) return bgmCtx;
  if (!isWx()) return null;
  try {
    // 长音频：官方建议 useWebAudioImplement=false（guide/base-ability/audio.md）
    const ctx = wx.createInnerAudioContext({ useWebAudioImplement: false });
    ctx.autoplay = false;
    ctx.loop = true;
    ctx.volume = BGM_VOLUME;
    ctx.onError((res: any) => {
      console.error('[BGM] onError', res && res.errMsg, res && res.errCode);
    });
    ctx.onCanplay(() => {
      ready = true;
      console.log('[BGM] onCanplay');
      if (pendingStart && !muted && wantPlaying) {
        pendingStart = false;
        try {
          ctx.play();
          started = true;
        } catch (e) {
          console.error('[BGM] pending play fail', e);
        }
      }
    });
    ctx.onPlay(() => {
      started = true;
      console.log('[BGM] onPlay');
    });
    // 先挂监听再设 src
    ctx.src = BGM_SRC;
    bgmCtx = ctx;
    console.log('[BGM] created', BGM_SRC, 'vol', BGM_VOLUME);
    return ctx;
  } catch (e) {
    console.error('[BGM] createInnerAudioContext failed', e);
    return null;
  }
}

function ensureWebBgm(): HTMLAudioElement | null {
  if (webAudio) return webAudio;
  try {
    const a = new Audio(BGM_SRC);
    a.loop = true;
    a.volume = BGM_VOLUME;
    a.preload = 'auto';
    a.addEventListener('canplaythrough', () => {
      ready = true;
    });
    a.addEventListener('error', () => {
      console.error('[BGM] web audio error');
    });
    webAudio = a;
    return a;
  } catch (e) {
    console.error('[BGM] HTMLAudio create fail', e);
    return null;
  }
}

function bindLifecycle(): void {
  if (lifecycleBound || !isWx()) return;
  lifecycleBound = true;
  try {
    if (typeof wx.onHide === 'function') {
      wx.onHide(() => {
        pauseBgm();
      });
    }
    if (typeof wx.onShow === 'function') {
      wx.onShow(() => {
        // 官方示例：退后台回来恢复；尊重用户静音
        if (!muted && wantPlaying && started) {
          resumeBgm();
        }
      });
    }
    if (typeof wx.onAudioInterruptionEnd === 'function') {
      wx.onAudioInterruptionEnd(() => {
        if (!muted && wantPlaying && started) {
          resumeBgm();
        }
      });
    }
  } catch (e) {
    console.error('[BGM] lifecycle bind fail', e);
  }
}

function doPlay(): void {
  if (muted || !wantPlaying) return;
  if (isWx()) {
    const ctx = ensureWxBgm();
    if (!ctx) return;
    if (!ready) {
      pendingStart = true;
      return;
    }
    try {
      ctx.volume = BGM_VOLUME;
      ctx.play();
      started = true;
    } catch (e) {
      console.error('[BGM] play fail', e);
    }
    return;
  }
  const a = ensureWebBgm();
  if (!a) return;
  try {
    a.volume = BGM_VOLUME;
    const p = a.play();
    if (p && typeof (p as Promise<void>).catch === 'function') {
      (p as Promise<void>).catch((err) => console.warn('[BGM] web play blocked', err));
    }
    started = true;
  } catch (e) {
    console.error('[BGM] web play fail', e);
  }
}

export function initBgm(): void {
  muted = loadMuted();
  wantPlaying = !muted;
  bindLifecycle();
  if (isWx()) ensureWxBgm();
  else ensureWebBgm();
}

/** 首次用户手势后调用（与 unlockAudio 同步） */
export function startBgm(): void {
  wantPlaying = !muted;
  bindLifecycle();
  if (muted) return;
  doPlay();
}

export function pauseBgm(): void {
  try {
    if (bgmCtx) bgmCtx.pause();
  } catch (_e) {
    /* ignore */
  }
  try {
    if (webAudio) webAudio.pause();
  } catch (_e) {
    /* ignore */
  }
}

export function resumeBgm(): void {
  if (muted || !wantPlaying) return;
  doPlay();
}

export function isBgmMuted(): boolean {
  return muted;
}

export function setBgmMuted(v: boolean): void {
  muted = !!v;
  saveMuted(muted);
  wantPlaying = !muted;
  if (muted) {
    pauseBgm();
  } else {
    doPlay();
  }
}

export function toggleBgmMuted(): boolean {
  setBgmMuted(!muted);
  return muted;
}

export default {
  initBgm,
  startBgm,
  pauseBgm,
  resumeBgm,
  isBgmMuted,
  setBgmMuted,
  toggleBgmMuted
};
