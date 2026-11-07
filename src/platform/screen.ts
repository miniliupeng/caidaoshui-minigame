import { DESIGN_H, DESIGN_W, WindowSize } from '../types/game';

/**
 * 唯一适配源。
 * 设计分辨率 750×1334。
 * 画布缓冲 = 窗口 CSS 像素 × dpr。
 * 绘制 setTransform(dpr * ww/W, dpr * wh/H)。
 * 真机触摸：clientX * (W / ww)，clientY * (H / wh)。
 */
export function clientToDesign(clientX: number, clientY: number, ww: number, wh: number): [number, number] {
  const safeW = ww > 0 ? ww : DESIGN_W;
  const safeH = wh > 0 ? wh : DESIGN_H;
  return [clientX * (DESIGN_W / safeW), clientY * (DESIGN_H / safeH)];
}

export const Screen = {
  canvas: null as HTMLCanvasElement | null,
  ww: DESIGN_W,
  wh: DESIGN_H,
  dpr: 1,
  safeTop: 0,
  /** 设计坐标：胶囊左侧可用右边界，静音按钮应在其左侧 */
  menuLeft: DESIGN_W - 110,
  menuTop: 24,
  menuHeight: 64,

  refresh(): void {
    const size = this.getWindowSize();
    this.ww = size.ww;
    this.wh = size.wh;
    this.dpr = size.dpr;
    this.refreshSafeTop();
    this.refreshMenuButton();
  },

  getWindowSize(): WindowSize {
    if (typeof wx === 'undefined') return { ww: DESIGN_W, wh: DESIGN_H, dpr: 1 };
    try {
      const info =
        (typeof wx.getWindowInfo === 'function' && wx.getWindowInfo()) ||
        (typeof wx.getSystemInfoSync === 'function' && wx.getSystemInfoSync()) ||
        null;
      if (info && info.windowWidth && info.windowHeight) {
        const dpr = Math.max(1, Number(info.pixelRatio) || 1);
        return { ww: info.windowWidth, wh: info.windowHeight, dpr };
      }
    } catch (_err) {
      /* 使用设计分辨率 */
    }
    return { ww: DESIGN_W, wh: DESIGN_H, dpr: 1 };
  },

  refreshSafeTop(): void {
    if (typeof wx === 'undefined') {
      this.safeTop = 0;
      return;
    }
    try {
      const info =
        (typeof wx.getWindowInfo === 'function' && wx.getWindowInfo()) ||
        (typeof wx.getSystemInfoSync === 'function' && wx.getSystemInfoSync()) ||
        null;
      if (!info || !info.windowWidth) return;
      let insetPx = 0;
      if (info.safeArea && typeof info.safeArea.top === 'number') insetPx = info.safeArea.top;
      else if (typeof info.safeAreaInsetTop === 'number') insetPx = info.safeAreaInsetTop;
      else if (typeof info.statusBarHeight === 'number') insetPx = info.statusBarHeight;
      const scale = DESIGN_W / info.windowWidth;
      this.safeTop = Math.max(0, Math.min(140, Math.round(insetPx * scale)));
    } catch (_err) {
      this.safeTop = 0;
    }
  },

  refreshMenuButton(): void {
    this.menuLeft = DESIGN_W - 110;
    this.menuTop = 20 + this.safeTop;
    this.menuHeight = 64;
    if (typeof wx === 'undefined' || typeof wx.getMenuButtonBoundingClientRect !== 'function') return;
    try {
      const rect = wx.getMenuButtonBoundingClientRect();
      if (!rect || !this.ww) return;
      const sx = DESIGN_W / this.ww;
      const sy = DESIGN_H / this.wh;
      if (typeof rect.left === 'number' && rect.left > 0) {
        this.menuLeft = Math.max(80, Math.round(rect.left * sx) - 12);
      }
      if (typeof rect.top === 'number') {
        this.menuTop = Math.max(8, Math.round(rect.top * sy));
      }
      if (typeof rect.height === 'number' && rect.height > 0) {
        this.menuHeight = Math.max(48, Math.round(rect.height * sy));
      }
    } catch (_err) {
      /* 胶囊信息缺失时使用默认避让 */
    }
  },

  createCanvas(): HTMLCanvasElement {
    if (typeof wx !== 'undefined' && wx.createCanvas) {
      const canvas = wx.createCanvas();
      this.refresh();
      canvas.width = Math.max(1, Math.floor(this.ww * this.dpr));
      canvas.height = Math.max(1, Math.floor(this.wh * this.dpr));
      this.canvas = canvas;
      console.log('[彩虹倒水] canvas', canvas.width, canvas.height, 'css', this.ww, this.wh, 'dpr', this.dpr);
      return canvas;
    }
    const el = document.getElementById('game');
    if (!(el instanceof HTMLCanvasElement)) {
      throw new Error('[彩虹倒水] 找不到 #game canvas');
    }
    el.width = DESIGN_W;
    el.height = DESIGN_H;
    this.ww = DESIGN_W;
    this.wh = DESIGN_H;
    this.dpr = 1;
    this.canvas = el;
    return el;
  },

  /** 每帧：物理像素 ← 设计坐标。sx = dpr * (ww / W) */
  applyDesignTransform(ctx: CanvasRenderingContext2D): void {
    if (!this.canvas) return;
    this.refresh();
    const wantW = Math.max(1, Math.floor(this.ww * this.dpr));
    const wantH = Math.max(1, Math.floor(this.wh * this.dpr));
    if (this.canvas.width !== wantW || this.canvas.height !== wantH) {
      this.canvas.width = wantW;
      this.canvas.height = wantH;
    }
    const sx = (this.dpr * this.ww) / DESIGN_W;
    const sy = (this.dpr * this.wh) / DESIGN_H;
    if (typeof ctx.setTransform === 'function') ctx.setTransform(sx, 0, 0, sy, 0, 0);
    else ctx.scale(sx, sy);
  },

  touchToLogic(clientX: number, clientY: number): [number, number] {
    this.refresh();
    return clientToDesign(clientX, clientY, this.ww, this.wh);
  }
};
