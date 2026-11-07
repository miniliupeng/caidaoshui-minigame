import { COLORS, COLOR_DARK, COLOR_LIGHT } from '../data/palette';
import {
  bottleVisualLayers,
  canPour,
  game,
  isBottleDone,
  pourTilt,
  shakeOffset,
  waterWobble
} from '../app/session';
import { CAPACITY, LayoutBox } from '../types/game';
import { roundRect } from './primitives';

export function drawBottle(
  ctx: CanvasRenderingContext2D,
  bottleIdx: number,
  box: LayoutBox,
  selected: boolean
): void {
  const layers = bottleVisualLayers(bottleIdx);
  const bottle = { layers };
  const { x, y, w, h } = box;
  const neckW = Math.floor(w * 0.4);
  const neckH = Math.floor(h * 0.11);
  const bodyH = h - neckH;
  const neckX = x + Math.floor((w - neckW) / 2);

  const isValidTarget = !selected && game.selected >= 0 && canPour(game.selected, bottleIdx);
  const lift = selected ? 18 : isValidTarget ? 6 : 0;
  const tilt = pourTilt(bottleIdx);
  const shx = shakeOffset(bottleIdx);
  const cx = x + w / 2 + shx;
  const cy = y + h * 0.72 - lift;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.translate(-cx, -cy);

  const by = y + neckH - lift;
  const ny = y - lift;
  const bodyX = x + shx;
  const isEmptyBottle = layers.length === 0;

  ctx.save();
  ctx.fillStyle = 'rgba(90, 50, 110, 0.16)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2 + shx, by + bodyH + 6, w * 0.42, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  roundRect(ctx, bodyX, by, w, bodyH, Math.min(22, w * 0.26));
  if (isEmptyBottle) {
    const eg = ctx.createLinearGradient(bodyX, by, bodyX, by + bodyH);
    eg.addColorStop(0, 'rgba(220, 245, 255, 0.55)');
    eg.addColorStop(1, 'rgba(200, 230, 245, 0.28)');
    ctx.fillStyle = eg;
    ctx.fill();
    ctx.save();
    roundRect(ctx, bodyX + 8, by + 10, w - 16, bodyH - 20, Math.min(16, w * 0.2));
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = isValidTarget ? 'rgba(46, 200, 160, 0.75)' : 'rgba(120, 160, 190, 0.55)';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  } else {
    const glass = ctx.createLinearGradient(bodyX, by, bodyX + w, by);
    glass.addColorStop(0, 'rgba(255,255,255,0.42)');
    glass.addColorStop(0.35, 'rgba(255,255,255,0.12)');
    glass.addColorStop(0.7, 'rgba(200,220,255,0.10)');
    glass.addColorStop(1, 'rgba(255,255,255,0.28)');
    ctx.fillStyle = glass;
    ctx.fill();
  }

  const strokeCol = selected
    ? 'rgba(255, 170, 220, 0.95)'
    : isEmptyBottle
      ? 'rgba(140, 180, 210, 0.85)'
      : 'rgba(255,255,255,0.65)';
  roundRect(ctx, bodyX, by, w, bodyH, Math.min(22, w * 0.26));
  ctx.strokeStyle = strokeCol;
  ctx.lineWidth = selected ? 4.5 : 2.4;
  ctx.stroke();
  if (selected) {
    roundRect(ctx, bodyX - 2, by - 2, w + 4, bodyH + 4, Math.min(24, w * 0.28));
    ctx.strokeStyle = 'rgba(186, 104, 200, 0.55)';
    ctx.lineWidth = 7;
    ctx.stroke();
  } else if (isValidTarget) {
    roundRect(ctx, bodyX - 3, by - 3, w + 6, bodyH + 6, Math.min(26, w * 0.3));
    ctx.strokeStyle = 'rgba(46, 200, 160, 0.7)';
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  ctx.save();
  roundRect(ctx, bodyX + 3, by + 4, w - 6, bodyH - 7, Math.min(18, w * 0.22));
  ctx.clip();

  const layerH = (bodyH - 12) / CAPACITY;
  const wobble = waterWobble();

  for (let i = 0; i < layers.length; i++) {
    const ci = layers[i] % COLORS.length;
    const ly = by + bodyH - 6 - (i + 1) * layerH;
    const isTop = i === layers.length - 1;
    const yg = ctx.createLinearGradient(bodyX, ly, bodyX + w, ly + layerH);
    yg.addColorStop(0, COLOR_LIGHT[ci]);
    yg.addColorStop(0.45, COLORS[ci]);
    yg.addColorStop(1, COLOR_DARK[ci]);
    ctx.fillStyle = yg;
    if (isTop) {
      ctx.beginPath();
      ctx.moveTo(bodyX + 4, ly + layerH + 1);
      ctx.lineTo(bodyX + 4, ly + 4);
      ctx.quadraticCurveTo(bodyX + w / 2, ly - 3 + wobble, bodyX + w - 4, ly + 4);
      ctx.lineTo(bodyX + w - 4, ly + layerH + 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(bodyX + w * 0.5, ly + 5 + wobble * 0.3, w * 0.28, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(bodyX + 4, ly, w - 8, layerH + 1);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(bodyX + 4, ly, w - 8, 2);
    }
  }
  ctx.restore();

  ctx.beginPath();
  const neckBottom = by + 6;
  ctx.moveTo(neckX + shx, neckBottom);
  ctx.lineTo(neckX + shx, ny);
  ctx.lineTo(neckX + neckW + shx, ny);
  ctx.lineTo(neckX + neckW + shx, neckBottom);
  ctx.strokeStyle = strokeCol;
  ctx.lineWidth = selected ? 4 : 2.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(neckX - 5 + shx, ny);
  ctx.lineTo(neckX + neckW + 5 + shx, ny);
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  roundRect(ctx, bodyX + 9, by + 16, Math.max(7, w * 0.11), bodyH * 0.5, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, bodyX + w - 16, by + 28, Math.max(5, w * 0.07), bodyH * 0.35, 4);
  ctx.fill();

  if (isBottleDone(bottle) && layers.length === CAPACITY) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.shadowColor = 'rgba(255, 180, 220, 0.6)';
    ctx.shadowBlur = 12;
    ctx.font = `bold ${Math.floor(w * 0.32)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓', x + w / 2 + shx, by + bodyH * 0.48);
    ctx.shadowBlur = 0;
  }

  if (isEmptyBottle) {
    ctx.fillStyle = isValidTarget ? 'rgba(20, 140, 120, 0.85)' : 'rgba(90, 120, 150, 0.72)';
    ctx.font = `bold ${Math.max(22, Math.floor(w * 0.28))}px "PingFang SC",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('空', x + w / 2 + shx, by + bodyH * 0.48);
  }

  ctx.restore();
}

export function drawPourStream(ctx: CanvasRenderingContext2D): void {
  const anim = game.pourAnim;
  if (!anim) return;
  const p = Math.max(0, Math.min(1, (game.now - anim.t0) / anim.dur));
  if (p < 0.22 || p > 0.88) return;
  const local = (p - 0.22) / 0.66;
  const fromBox = game.layout[anim.from];
  const toBox = game.layout[anim.to];
  const tilt = pourTilt(anim.from);
  const fromCx = fromBox.x + fromBox.w / 2;
  const fromTop = fromBox.y - 10;
  const mouthX = fromCx + Math.sin(tilt) * fromBox.h * 0.55;
  const mouthY = fromTop + 20 - Math.abs(Math.sin(tilt)) * 30;
  const toCx = toBox.x + toBox.w / 2;
  const toMouthY = toBox.y + 8;
  const ci = anim.color % COLORS.length;
  ctx.save();
  ctx.strokeStyle = COLORS[ci];
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.55 + 0.35 * Math.sin(local * Math.PI);
  ctx.beginPath();
  ctx.moveTo(mouthX, mouthY);
  const midX = (mouthX + toCx) / 2;
  const midY = Math.min(mouthY, toMouthY) - 40 - (1 - Math.abs(local - 0.5) * 2) * 30;
  ctx.quadraticCurveTo(midX, midY, toCx, toMouthY + 10);
  ctx.stroke();
  ctx.strokeStyle = COLOR_LIGHT[ci];
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.7;
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = COLORS[ci];
  for (let k = 0; k < 4; k++) {
    const ang = -Math.PI / 2 + (k - 1.5) * 0.35;
    ctx.beginPath();
    ctx.arc(toCx + Math.cos(ang) * 8, toMouthY + 14 + Math.sin(ang) * 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
