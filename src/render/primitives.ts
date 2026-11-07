import { DESIGN_H, DESIGN_W, UIButton } from '../types/game';
import { game } from '../app/session';

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function drawSoftBg(ctx: CanvasRenderingContext2D, variant: string): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, DESIGN_H);
  if (variant === 'home') {
    gradient.addColorStop(0, '#FFE4F0');
    gradient.addColorStop(0.45, '#E8D5FF');
    gradient.addColorStop(1, '#C9E7FF');
  } else {
    gradient.addColorStop(0, '#FFF0F6');
    gradient.addColorStop(0.4, '#E6DEFF');
    gradient.addColorStop(1, '#D4EEFF');
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);

  const t = game.now * 0.00025;
  const blobs: Array<[number, number, number, string, number]> = [
    [180, 220, 160, '#FFB7D5', 0.28],
    [560, 180, 140, '#B8A6FF', 0.22],
    [120, 980, 180, '#9AD8FF', 0.22],
    [620, 1050, 150, '#FFD4A8', 0.2],
    [380, 700, 200, '#E0C4FF', 0.16]
  ];
  blobs.forEach(([bx, by, radius, col, alpha], i) => {
    const ox = Math.sin(t + i * 1.3) * 28;
    const oy = Math.cos(t * 0.8 + i) * 22;
    const radial = ctx.createRadialGradient(bx + ox, by + oy, 0, bx + ox, by + oy, radius);
    radial.addColorStop(0, col);
    radial.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = radial;
    ctx.beginPath();
    ctx.arc(bx + ox, by + oy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

export function drawButton(ctx: CanvasRenderingContext2D, button: UIButton): void {
  const pressed = game.pressId === button.id && game.now < game.pressUntil;
  const scale = pressed ? 0.94 : 1;
  const cx = button.x + button.w / 2;
  const cy = button.y + button.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  ctx.shadowColor = 'rgba(80, 40, 90, 0.22)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = pressed ? 2 : 8;
  roundRect(ctx, button.x, button.y, button.w, button.h, button.radius || 22);
  const bg = button.bg || '#7E57C2';
  const bg2 = button.bg2 || bg;
  const gradient = ctx.createLinearGradient(button.x, button.y, button.x, button.y + button.h);
  gradient.addColorStop(0, bg2);
  gradient.addColorStop(1, bg);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  roundRect(ctx, button.x + 4, button.y + 3, button.w - 8, Math.max(10, button.h * 0.28), 14);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fill();
  if (button.border) {
    roundRect(ctx, button.x, button.y, button.w, button.h, button.radius || 22);
    ctx.strokeStyle = button.border;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.fillStyle = button.color || '#fff';
  ctx.font = `bold ${button.fontSize || 30}px "PingFang SC","Helvetica Neue",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(button.label, button.x + button.w / 2, button.y + button.h / 2 + 1);
  if (button.sub) {
    ctx.font = '22px "PingFang SC",sans-serif';
    ctx.fillStyle = button.subColor || 'rgba(255,255,255,0.85)';
    ctx.fillText(button.sub, button.x + button.w / 2, button.y + button.h / 2 + 22);
  }
  ctx.restore();
}

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): void {
  const chars = text.split('');
  let line = '';
  let yy = y;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = chars[i];
      yy += lineHeight;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}
