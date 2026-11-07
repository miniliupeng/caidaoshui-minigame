/**
 * 首页主视觉。优先 wx.createImage 读包内相对路径，失败再换备用图。
 * 不要加前导斜杠，真机需等 onload 后再 drawImage。
 */

const SRC_LIST = ['images/home-hero.png', 'avatar_caise.png'];

export const HomeHero = {
  img: null as HTMLImageElement | null,
  ready: false,
  failed: false,
  srcTried: '',
  _idx: 0,

  load(): void {
    if (this.img || this.failed) return;
    this._tryNext();
  },

  _createImage(): HTMLImageElement | null {
    if (typeof wx !== 'undefined' && typeof wx.createImage === 'function') {
      return wx.createImage();
    }
    if (typeof Image !== 'undefined') return new Image();
    return null;
  },

  _tryNext(): void {
    if (this._idx >= SRC_LIST.length) {
      this.failed = true;
      console.warn('[HomeHero] 图片全部加载失败', SRC_LIST);
      return;
    }
    const src = SRC_LIST[this._idx];
    this._idx += 1;
    const img = this._createImage();
    if (!img) {
      this.failed = true;
      console.warn('[HomeHero] createImage 不可用');
      return;
    }
    this.img = img;
    this.srcTried = src;
    img.onload = () => {
      this.ready = true;
      console.log('[HomeHero] onload', src, img.width, img.height);
    };
    img.onerror = () => {
      console.warn('[HomeHero] onerror', src);
      this.img = null;
      this.ready = false;
      this._tryNext();
    };
    img.src = src;
  },

  draw(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): boolean {
    if (!this.ready || !this.img) return false;
    const x = cx - size / 2;
    const y = cy - size / 2;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.36, size * 0.34, size * 0.07, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(120, 90, 150, 0.16)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.49, 0, Math.PI * 2);
    ctx.clip();
    try {
      ctx.drawImage(this.img, x, y, size, size);
      ctx.restore();
      return true;
    } catch (err) {
      ctx.restore();
      console.warn('[HomeHero] drawImage 失败', err);
      return false;
    }
  }
};
