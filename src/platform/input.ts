import { DESIGN_H, DESIGN_W } from '../types/game';
import { unlockAudio } from '../audio/sfx';
import { startBgm } from '../audio/bgm';
import { clientToDesign, Screen } from './screen';

export type PointerPhase = 'down' | 'up';
export type PointerHandler = (x: number, y: number, phase: PointerPhase) => void;

let inputBound = false;

/**
 * 真机走 Screen.touchToLogic（窗口 CSS → 设计坐标）。
 * 浏览器预览的画布通常被 CSS 缩小，先换成相对画布的局部坐标，再用同一套 clientToDesign 公式。
 */
export function bindInput(canvas: HTMLCanvasElement, handler: PointerHandler): void {
  if (inputBound) return;
  inputBound = true;

  if (typeof wx !== 'undefined' && wx.onTouchStart) {
    wx.onTouchStart((event) => {
      unlockAudio();
      startBgm();
      const point = (event.touches && event.touches[0]) || (event.changedTouches && event.changedTouches[0]);
      if (!point) return;
      const cx = typeof point.clientX === 'number' ? point.clientX : point.x || 0;
      const cy = typeof point.clientY === 'number' ? point.clientY : point.y || 0;
      const [x, y] = Screen.touchToLogic(cx, cy);
      handler(x, y, 'down');
    });
    if (wx.onTouchEnd) wx.onTouchEnd(() => handler(-1, -1, 'up'));
    return;
  }

  const toLogic = (clientX: number, clientY: number): [number, number] => {
    const rect = canvas.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    return clientToDesign(localX, localY, rect.width || DESIGN_W, rect.height || DESIGN_H);
  };

  canvas.addEventListener('pointerdown', (event: PointerEvent) => {
    unlockAudio();
    startBgm();
    const [x, y] = toLogic(event.clientX, event.clientY);
    handler(x, y, 'down');
  });
  canvas.addEventListener('pointerup', () => handler(-1, -1, 'up'));
  canvas.addEventListener('pointercancel', () => handler(-1, -1, 'up'));
}
