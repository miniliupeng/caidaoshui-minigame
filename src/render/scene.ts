import { isBgmMuted, toggleBgmMuted } from '../audio/bgm';
import { LEVELS } from '../data/levels';
import { COLORS, COLOR_LIGHT } from '../data/palette';
import { clamp01, easeInOutCubic, easeOutBack, easeOutCubic } from '../core/easing';
import { Screen } from '../platform/screen';
import { track } from '../services/analytics';
import { loadProgress } from '../services/progress';
import { acceptPrivacy, hasPrivacyConsent } from '../services/privacy';
import {
  addEmptyBottle,
  canPour,
  game,
  goHome,
  startLevel,
  STATE,
  toast,
  undoMove
} from '../app/session';
import { CAPACITY, DESIGN_H as H, DESIGN_W as W, UIButton } from '../types/game';
import { drawBottle, drawPourStream } from './bottle';
import { HomeHero } from './hero';
import { drawButton, drawSoftBg, roundRect, wrapText } from './primitives';

function drawDemoBottles(ctx: CanvasRenderingContext2D, baseY: number): void {
  const demos = [
    { x: 195, layers: [0, 1, 0, 1] },
    { x: 335, layers: [1, 0, 1] },
    { x: 475, layers: [] as number[] }
  ];
  demos.forEach((demo) => {
    const x = demo.x;
    const y = baseY;
    const w = 82;
    const h = 196;
    const neckW = Math.floor(w * 0.4);
    const neckH = Math.floor(h * 0.11);
    const by = y + neckH;
    const bodyH = h - neckH;
    const neckX = x + Math.floor((w - neckW) / 2);
    ctx.save();
    ctx.fillStyle = 'rgba(90,50,110,0.12)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, by + bodyH + 4, w * 0.4, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    roundRect(ctx, x, by, w, bodyH, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.save();
    roundRect(ctx, x + 3, by + 3, w - 6, bodyH - 6, 16);
    ctx.clip();
    const layerH = (bodyH - 10) / CAPACITY;
    demo.layers.forEach((ci, i) => {
      const ly = by + bodyH - 5 - (i + 1) * layerH;
      const gradient = ctx.createLinearGradient(x, ly, x + w, ly);
      gradient.addColorStop(0, COLOR_LIGHT[ci]);
      gradient.addColorStop(1, COLORS[ci]);
      ctx.fillStyle = gradient;
      ctx.fillRect(x + 4, ly, w - 8, layerH + 1);
    });
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(neckX, by + 4);
    ctx.lineTo(neckX, y);
    ctx.lineTo(neckX + neckW, y);
    ctx.lineTo(neckX + neckW, by + 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    roundRect(ctx, x + 10, by + 14, 10, bodyH * 0.45, 5);
    ctx.fill();
    ctx.restore();
  });
}

function getMuteButton(): UIButton {
  const size = Math.min(68, Math.max(56, Screen.menuHeight + 4));
  const muted = isBgmMuted();
  return {
    id: 'mute',
    x: Math.max(16, Screen.menuLeft - size - 10),
    y: Screen.menuTop,
    w: size,
    h: size,
    label: muted ? '静' : '音',
    bg: muted ? '#9E9E9E' : '#7E57C2',
    bg2: muted ? '#BDBDBD' : '#B39DDB',
    color: '#fff',
    radius: 22,
    fontSize: 28,
    onClick: () => {
      const nowMuted = toggleBgmMuted();
      track('bgm_toggle', { muted: nowMuted ? 1 : 0 });
      toast(nowMuted ? '已关闭背景音乐' : '已开启背景音乐', 1400);
    }
  };
}

function beginPlay(idx: number, reason: 'start' | 'continue' | 'next' | 'restart' | 'replay'): void {
  acceptPrivacy();
  startLevel(idx, reason);
}

function drawHome(ctx: CanvasRenderingContext2D): void {
  drawSoftBg(ctx, 'home');
  const safeTop = Screen.safeTop;
  if (!game.homeEnterT0 || game.homeEnterT0 > game.now) game.homeEnterT0 = game.now;
  const enter = clamp01((game.now - game.homeEnterT0) / 700);
  const showA = enter >= 0.999 ? 1 : Math.max(enter, 0.05);
  const ey = (1 - easeOutBack(Math.min(1, enter))) * 40;
  const progress = loadProgress();
  const hasContinue = progress > 0;
  const consented = hasPrivacyConsent();

  ctx.save();
  ctx.globalAlpha = showA;
  ctx.translate(0, ey);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(120, 60, 140, 0.15)';
  ctx.font = 'bold 78px "PingFang SC",sans-serif';
  const titleY = 280 + Math.min(safeTop, 48);
  ctx.fillText('彩虹倒水', W / 2 + 3, titleY + 4);
  const titleGrad = ctx.createLinearGradient(W / 2 - 160, 0, W / 2 + 160, 0);
  titleGrad.addColorStop(0, '#FF6B9D');
  titleGrad.addColorStop(0.5, '#BA68C8');
  titleGrad.addColorStop(1, '#4FC3F7');
  ctx.fillStyle = titleGrad;
  ctx.font = 'bold 76px "PingFang SC",sans-serif';
  ctx.fillText('彩虹倒水', W / 2, titleY);
  ctx.fillStyle = '#7A6A8A';
  ctx.font = '28px "PingFang SC",sans-serif';
  ctx.fillText('把同色水倒进同一个瓶子', W / 2, titleY + 76);
  ctx.fillStyle = '#9A8AAA';
  ctx.font = '24px "PingFang SC",sans-serif';
  ctx.fillText(
    hasContinue ? `已解锁到第 ${progress + 1} 关 · 共 ${LEVELS.length} 关` : '卡住了？看广告加空杯 / 撤销',
    W / 2,
    titleY + 116
  );
  const heroSize = hasContinue ? 280 : 320;
  const heroCy = titleY + 188 + heroSize / 2;
  const drewHero = HomeHero.draw(ctx, W / 2, heroCy, heroSize);
  if (!drewHero) drawDemoBottles(ctx, hasContinue ? 430 : 480);
  ctx.restore();

  const footerY = H - 48;
  const btnW = 470;
  const btnX = Math.floor((W - btnW) / 2);
  const list: UIButton[] = [getMuteButton()];

  if (hasContinue) {
    const howY = footerY - 100;
    const startY = howY - 96;
    const contY = startY - 112;
    list.push(
      {
        id: 'continue',
        x: btnX,
        y: contY,
        w: btnW,
        h: 96,
        label: consented ? `继续闯关 · 第 ${progress + 1} 关` : '同意并继续',
        bg: '#E91E8C',
        bg2: '#FF6B9D',
        radius: 28,
        fontSize: 34,
        onClick: () => beginPlay(progress, 'continue')
      },
      {
        id: 'start',
        x: btnX,
        y: startY,
        w: btnW,
        h: 78,
        label: '从第 1 关开始',
        bg: '#7E57C2',
        bg2: '#B39DDB',
        radius: 24,
        fontSize: 28,
        onClick: () => beginPlay(0, 'start')
      },
      howButton(btnX, howY, btnW, 72, 22, 26)
    );
  } else {
    const howY = footerY - 100;
    const startY = howY - 112;
    list.push(
      {
        id: 'start',
        x: btnX,
        y: startY,
        w: btnW,
        h: 96,
        label: consented ? '开始闯关' : '同意并开始',
        bg: '#E91E8C',
        bg2: '#FF6B9D',
        radius: 28,
        fontSize: 36,
        onClick: () => beginPlay(0, 'start')
      },
      howButton(btnX, howY, btnW, 78, 24, 28)
    );
  }

  game.buttons = list;
  game.buttons.forEach((button) => drawButton(ctx, button));

  if (game.now < game.messageUntil) {
    ctx.fillStyle = 'rgba(60, 30, 80, 0.72)';
    roundRect(ctx, 50, H - 220, W - 100, 120, 18);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '24px "PingFang SC",sans-serif';
    wrapText(ctx, game.message, W / 2, H - 180, W - 140, 32);
  }

  ctx.fillStyle = 'rgba(100,80,120,0.55)';
  ctx.font = '22px "PingFang SC",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`本机存档 · 微信激励广告 · ${LEVELS.length} 关`, W / 2, footerY);
}

function howButton(x: number, y: number, w: number, h: number, radius: number, fontSize: number): UIButton {
  return {
    id: 'how',
    x,
    y,
    w,
    h,
    label: '玩法说明',
    bg: '#9B7EBD',
    bg2: '#C3A6E0',
    radius,
    fontSize,
    onClick: () => {
      toast('先点有水的瓶，再点目标瓶倒入。只能倒到空瓶或同色顶层；每瓶装满同色或空即过关。', 3200);
    }
  };
}

function drawPlayChrome(ctx: CanvasRenderingContext2D): void {
  drawSoftBg(ctx, 'play');
  const safeTop = Screen.safeTop;
  const barH = 178 + safeTop;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(0, 0, W, barH);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(0, barH, W, 1);

  const cfg = LEVELS[Math.min(game.levelIndex, LEVELS.length - 1)];
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#5A3A6A';
  ctx.font = 'bold 34px "PingFang SC",sans-serif';
  ctx.fillText(`第 ${game.levelIndex + 1} 关 · ${cfg.name}`, 36, 56 + safeTop);

  const metaY = 100 + safeTop;
  ctx.font = '26px "PingFang SC",sans-serif';
  ctx.fillStyle = '#8A6A9A';
  const steps = `步数 ${game.moves}`;
  ctx.fillText(steps, 36, metaY);
  let metaX = 36 + ctx.measureText(steps).width + 28;
  ctx.fillStyle = '#E91E8C';
  ctx.font = 'bold 26px "PingFang SC",sans-serif';
  const undoLabel = `免费撤销 ${game.freeUndos}`;
  ctx.fillText(undoLabel, metaX, metaY);
  metaX += ctx.measureText(undoLabel).width + 28;
  ctx.fillStyle = '#2A9D8F';
  ctx.fillText(`空杯 ${game.extraEmptyUsed}/${game.maxExtraEmpty}`, metaX, metaY);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#9A7AAA';
  ctx.font = '22px "PingFang SC",sans-serif';
  let hint = '点选一个有水的瓶子';
  if (game.selected >= 0) {
    let valid = 0;
    for (let i = 0; i < game.bottles.length; i++) {
      if (canPour(game.selected, i)) valid += 1;
    }
    hint = valid > 0 ? `已选中 · 再点高亮瓶倒水（${valid} 个可倒）` : '已选中 · 暂无可倒目标，点同一瓶取消';
  }
  ctx.fillText(hint, W / 2, 148 + safeTop);
}

function drawPlay(ctx: CanvasRenderingContext2D): void {
  drawPlayChrome(ctx);
  for (let i = 0; i < game.bottles.length; i++) {
    drawBottle(ctx, i, game.layout[i], game.selected === i);
  }
  drawPourStream(ctx);

  if (game.tipShown && !game.tipDismissed && game.levelIndex === 0 && game.moves === 0) {
    const safeTop = Screen.safeTop;
    ctx.fillStyle = 'rgba(60, 30, 90, 0.78)';
    roundRect(ctx, 70, 200 + safeTop, W - 140, 100, 18);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '26px "PingFang SC",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('① 点有水的瓶子选中', W / 2, 238 + safeTop);
    ctx.fillText('② 再点目标瓶倒入同色水', W / 2, 276 + safeTop);
  }

  if (game.now < game.messageUntil) {
    const boxY = H - 280;
    ctx.fillStyle = 'rgba(60, 30, 80, 0.82)';
    roundRect(ctx, 70, boxY, W - 140, 64, 16);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '26px "PingFang SC",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    wrapText(ctx, game.message, W / 2, boxY + 32, W - 180, 28);
  }

  const bw = 226;
  const gap = 18;
  const total = bw * 3 + gap * 2;
  const sx = Math.floor((W - total) / 2);
  const by = H - 168;
  game.buttons = [
    getMuteButton(),
    {
      id: 'undo',
      x: sx,
      y: by,
      w: bw,
      h: 92,
      label: game.freeUndos > 0 ? `撤销 · ${game.freeUndos}` : '广告撤销',
      bg: game.freeUndos > 0 ? '#7E57C2' : '#E91E63',
      bg2: game.freeUndos > 0 ? '#B39DDB' : '#FF80AB',
      radius: 24,
      fontSize: 28,
      onClick: () => undoMove(game.freeUndos <= 0)
    },
    {
      id: 'empty',
      x: sx + bw + gap,
      y: by,
      w: bw,
      h: 92,
      label: '+ 空杯',
      bg: '#00897B',
      bg2: '#4DB6AC',
      radius: 24,
      fontSize: 28,
      onClick: () => addEmptyBottle()
    },
    {
      id: 'restart',
      x: sx + (bw + gap) * 2,
      y: by,
      w: bw,
      h: 92,
      label: '重开',
      bg: '#607D8B',
      bg2: '#90A4AE',
      radius: 24,
      fontSize: 28,
      onClick: () => startLevel(game.levelIndex, 'restart')
    }
  ];
  game.buttons.forEach((button) => drawButton(ctx, button));
}

function drawParticles(ctx: CanvasRenderingContext2D): void {
  for (const particle of game.particles) {
    const life = 1 - particle.age / particle.life;
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rot);
    ctx.globalAlpha = Math.max(0, life);
    ctx.fillStyle = particle.color;
    roundRect(ctx, -particle.r, -particle.r * 0.6, particle.r * 2, particle.r * 1.2, 3);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  buttons: UIButton[],
  celebrate: boolean
): void {
  drawPlayChrome(ctx);
  for (let i = 0; i < game.bottles.length; i++) {
    drawBottle(ctx, i, game.layout[i], false);
  }
  if (celebrate) drawParticles(ctx);

  ctx.fillStyle = 'rgba(40, 20, 60, 0.55)';
  ctx.fillRect(0, 0, W, H);

  const t0 = game.clearT0 || game.now;
  const pop = celebrate ? easeOutBack(clamp01((game.now - t0) / 420)) : 1;

  ctx.save();
  ctx.translate(W / 2, 420);
  ctx.scale(pop, pop);
  ctx.translate(-W / 2, -420);
  ctx.shadowColor = 'rgba(80,40,100,0.25)';
  ctx.shadowBlur = 30;
  roundRect(ctx, 70, 320, W - 140, 280, 28);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#5A3A6A';
  ctx.font = 'bold 56px "PingFang SC",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, 400);
  ctx.fillStyle = '#9A7AAA';
  ctx.font = '28px "PingFang SC",sans-serif';
  ctx.fillText(subtitle, W / 2, 460);
  ctx.fillStyle = '#E91E8C';
  ctx.font = 'bold 34px "PingFang SC",sans-serif';
  ctx.fillText(`共用 ${game.moves} 步`, W / 2, 530);
  ctx.restore();

  game.buttons = buttons;
  buttons.forEach((button) => drawButton(ctx, button));
}

function drawClear(ctx: CanvasRenderingContext2D): void {
  const hasNext = game.levelIndex + 1 < LEVELS.length;
  drawOverlay(
    ctx,
    '过关啦！',
    hasNext ? '颜色归位，闪闪发光' : '全部关卡完成！太棒了',
    [
      {
        id: 'next',
        x: 140,
        y: 660,
        w: 470,
        h: 92,
        label: hasNext ? '下一关' : '再玩一轮',
        bg: '#E91E8C',
        bg2: '#FF6B9D',
        radius: 26,
        fontSize: 34,
        onClick: () => {
          if (hasNext) startLevel(game.levelIndex + 1, 'next');
          else startLevel(0, 'replay');
        }
      },
      {
        id: 'home',
        x: 140,
        y: 780,
        w: 470,
        h: 72,
        label: '回首页',
        bg: '#8D6E9F',
        bg2: '#B39DDB',
        radius: 22,
        fontSize: 28,
        onClick: () => goHome(true)
      }
    ],
    true
  );
}

function drawStuck(ctx: CanvasRenderingContext2D): void {
  drawOverlay(
    ctx,
    '好像卡住了',
    '看广告加空杯，或撤销一步',
    [
      {
        id: 'ad_empty',
        x: 140,
        y: 640,
        w: 470,
        h: 88,
        label: '看广告 +1 空杯',
        bg: '#00897B',
        bg2: '#4DB6AC',
        radius: 24,
        fontSize: 30,
        onClick: () => addEmptyBottle()
      },
      {
        id: 'ad_undo',
        x: 140,
        y: 750,
        w: 470,
        h: 88,
        label: game.freeUndos > 0 ? `免费撤销 · ${game.freeUndos}` : '看广告撤销',
        bg: '#E91E63',
        bg2: '#FF80AB',
        radius: 24,
        fontSize: 30,
        onClick: () => undoMove(game.freeUndos <= 0)
      },
      {
        id: 'retry',
        x: 140,
        y: 860,
        w: 470,
        h: 68,
        label: '重开本关',
        bg: '#607D8B',
        bg2: '#90A4AE',
        radius: 20,
        fontSize: 26,
        onClick: () => startLevel(game.levelIndex, 'restart')
      },
      {
        id: 'home',
        x: 140,
        y: 950,
        w: 470,
        h: 60,
        label: '回首页',
        bg: '#7E6B8F',
        bg2: '#A890B8',
        radius: 18,
        fontSize: 24,
        onClick: () => goHome(false)
      }
    ],
    false
  );
}

function drawTransition(ctx: CanvasRenderingContext2D): void {
  const tr = game.transition;
  if (!tr) return;
  const p = clamp01((game.now - tr.t0) / tr.dur);
  if (p >= 1) {
    game.transition = null;
    return;
  }
  const alpha = p < 0.45 ? easeOutCubic(p / 0.45) : 1 - easeInOutCubic((p - 0.45) / 0.55);
  ctx.fillStyle = `rgba(255, 240, 250, ${alpha * 0.92})`;
  ctx.fillRect(0, 0, W, H);
  if (tr.kind === 'levelIn' && p > 0.35 && p < 0.85) {
    const cfg = LEVELS[Math.min(game.levelIndex, LEVELS.length - 1)];
    ctx.globalAlpha = 1 - Math.abs(p - 0.6) / 0.25;
    ctx.fillStyle = '#E91E8C';
    ctx.font = 'bold 48px "PingFang SC",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`第 ${game.levelIndex + 1} 关`, W / 2, H / 2 - 10);
    ctx.font = '28px "PingFang SC",sans-serif';
    ctx.fillStyle = '#9A6AAA';
    ctx.fillText(cfg.name, W / 2, H / 2 + 40);
    ctx.globalAlpha = 1;
  }
}

export function render(ctx: CanvasRenderingContext2D): void {
  Screen.applyDesignTransform(ctx);
  ctx.clearRect(0, 0, W, H);
  if (game.state === STATE.HOME) drawHome(ctx);
  else if (game.state === STATE.PLAY) drawPlay(ctx);
  else if (game.state === STATE.CLEAR) drawClear(ctx);
  else if (game.state === STATE.STUCK) drawStuck(ctx);
  drawTransition(ctx);
}
