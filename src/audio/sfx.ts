/**
 * 音效（微信官方规范）
 *
 * 依据知识库：
 * - guide/base-ability/audio.md：复用 InnerAudio 实例；短音效可 InnerAudio / WebAudio
 * - api/media/audio/wx.createInnerAudioContext.md：创建上下文
 * - api/media/audio/InnerAudioContext.md：src / volume / play / stop；格式 mp3/wav 双端支持
 * - api/media/audio/wx.setInnerAudioOption.md：2.3.0+ 全局 obeyMuteSwitch（实例属性已失效）
 * - api/media/audio/InnerAudioContext.onError.md / onCanplay：错误与可播回调
 *
 * 注意：官方写明 setInnerAudioOption 与 useWebAudioImplement=true 不兼容，
 * 为让 iOS 静音开关下仍能出音效，此处 useWebAudioImplement=false。
 */

export type SfxName = 'tap' | 'select' | 'pour' | 'invalid' | 'win' | 'button';

/** 本地包相对路径；优先 mp3（双端稳定），wav 保留在 audio/ 作备份 */
const ASSET: Record<SfxName, string> = {
  tap: 'audio/tap.mp3',
  select: 'audio/select.mp3',
  pour: 'audio/pour.mp3',
  invalid: 'audio/invalid.mp3',
  win: 'audio/win.mp3',
  button: 'audio/button.mp3'
};

interface Slot {
  ctx: any;
  ready: boolean;
  pendingPlay: boolean;
}

let unlocked = false;
let optionApplied = false;
const pool: Partial<Record<SfxName, Slot>> = {};

function isWx(): boolean {
  return typeof wx !== 'undefined' && typeof wx.createInnerAudioContext === 'function';
}

/** 官方：2.3.0 起用全局选项；obeyMuteSwitch=false 时 iOS 静音键仍可出声 */
function applyInnerAudioOption(): void {
  if (optionApplied || !isWx()) return;
  optionApplied = true;
  try {
    if (typeof wx.setInnerAudioOption === 'function') {
      wx.setInnerAudioOption({
        obeyMuteSwitch: false,
        mixWithOther: true,
        success() {
          console.log('[SFX] setInnerAudioOption ok (obeyMuteSwitch=false)');
        },
        fail(err: any) {
          console.error('[SFX] setInnerAudioOption fail', err);
        }
      });
    }
  } catch (e) {
    console.error('[SFX] setInnerAudioOption exception', e);
  }
}

function ensureSlot(name: SfxName): Slot | null {
  if (pool[name]) return pool[name]!;
  if (!isWx()) return null;
  try {
    // useWebAudioImplement 保持 false，才能与 setInnerAudioOption 兼容（官方注意事项）
    const ctx = wx.createInnerAudioContext({ useWebAudioImplement: false });
    const slot: Slot = { ctx, ready: false, pendingPlay: false };
    ctx.autoplay = false;
    ctx.loop = false;
    ctx.volume = 1;
    ctx.onError((res: any) => {
      console.error('[SFX] onError', name, res && res.errMsg, res && res.errCode);
    });
    ctx.onCanplay(() => {
      slot.ready = true;
      if (slot.pendingPlay) {
        slot.pendingPlay = false;
        try {
          ctx.play();
        } catch (e) {
          console.error('[SFX] pending play fail', name, e);
        }
      }
    });
    // 先挂监听再设 src（官方示例：onCanplay 后再 play）
    ctx.src = ASSET[name];
    pool[name] = slot;
    console.log('[SFX] preload', name, ASSET[name]);
    return slot;
  } catch (e) {
    console.error('[SFX] createInnerAudioContext failed', name, e);
    return null;
  }
}

function playWx(name: SfxName): void {
  applyInnerAudioOption();
  const slot = ensureSlot(name);
  if (!slot) return;
  const { ctx } = slot;
  try {
    if (!slot.ready) {
      // 尚未 canplay：标记待播，避免空声 play
      slot.pendingPlay = true;
      return;
    }
    // 复用实例：stop 后再 play 会从头播（官方 stop 语义）
    try {
      ctx.stop();
    } catch (_e) {
      /* ignore */
    }
    ctx.play();
  } catch (e) {
    console.error('[SFX] play fail', name, e);
  }
}

// ---------- 浏览器预览：WebAudio oscillator（无 wx） ----------
let _ac: AudioContext | null = null;

function getAC(): AudioContext | null {
  if (_ac) return _ac;
  try {
    const w = typeof window !== 'undefined' ? (window as any) : null;
    const g = typeof globalThis !== 'undefined' ? (globalThis as any) : null;
    const Ctx = (w && (w.AudioContext || w.webkitAudioContext)) || (g && (g.AudioContext || g.webkitAudioContext));
    if (!Ctx) return null;
    _ac = new Ctx();
    return _ac;
  } catch (_e) {
    return null;
  }
}

function beep(
  freq: number,
  dur: number,
  type?: OscillatorType,
  vol?: number,
  when?: number
): void {
  const ac = getAC();
  if (!ac) return;
  try {
    if (ac.state === 'suspended') void ac.resume();
    const t0 = ac.currentTime + (when || 0);
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.08, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  } catch (_e) {
    /* ignore */
  }
}

const WEB_BEEP: Record<SfxName, () => void> = {
  tap() {
    beep(520, 0.06, 'sine', 0.05);
  },
  select() {
    beep(660, 0.08, 'triangle', 0.055);
  },
  pour() {
    beep(380, 0.12, 'sine', 0.04);
    beep(290, 0.18, 'sine', 0.03, 0.05);
  },
  invalid() {
    beep(180, 0.12, 'square', 0.04);
  },
  win() {
    beep(523, 0.12, 'sine', 0.07);
    beep(659, 0.12, 'sine', 0.07, 0.1);
    beep(784, 0.18, 'sine', 0.08, 0.2);
    beep(1046, 0.28, 'triangle', 0.06, 0.32);
  },
  button() {
    beep(440, 0.05, 'triangle', 0.045);
  }
};

function playOne(name: SfxName): void {
  if (isWx()) {
    playWx(name);
    return;
  }
  WEB_BEEP[name]();
}

/** 启动时预创建全部 InnerAudio */
export function initSfx(): void {
  applyInnerAudioOption();
  if (isWx()) {
    (Object.keys(ASSET) as SfxName[]).forEach((name) => {
      ensureSlot(name);
    });
  }
}

/** 首次用户手势：应用静音选项 + 预创建池 / resume 浏览器 AudioContext */
export function unlockAudio(): void {
  applyInnerAudioOption();
  if (isWx()) {
    (Object.keys(ASSET) as SfxName[]).forEach((name) => {
      ensureSlot(name);
    });
    if (!unlocked) {
      unlocked = true;
      const tap = pool.tap;
      if (tap && tap.ready) {
        try {
          const prev = tap.ctx.volume;
          tap.ctx.volume = 0.01;
          tap.ctx.play();
          setTimeout(() => {
            try {
              tap.ctx.stop();
              tap.ctx.volume = typeof prev === 'number' ? prev : 1;
            } catch (_e) {
              /* ignore */
            }
          }, 40);
        } catch (_e) {
          /* ignore */
        }
      }
    }
    return;
  }
  unlocked = true;
  const ac = getAC();
  if (ac && ac.state === 'suspended') {
    try {
      void ac.resume();
    } catch (_e) {
      /* ignore */
    }
  }
}

export const SFX = {
  tap() {
    playOne('tap');
  },
  select() {
    playOne('select');
  },
  pour() {
    playOne('pour');
  },
  invalid() {
    playOne('invalid');
  },
  win() {
    playOne('win');
  },
  button() {
    playOne('button');
  }
};

export default SFX;
