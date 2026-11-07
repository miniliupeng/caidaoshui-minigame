import { SFX } from '../audio/sfx';
import { COLORS } from '../data/palette';
import { LEVELS } from '../data/levels';
import { hitBottleAt, hitButtonAt } from '../core/hit';
import { computeLayout, getButtonBarTop as barTopOf } from '../core/layout';
import { clamp01 } from '../core/easing';
import {
  applyPourLayers,
  bottleSignature,
  canPour as canPourBottles,
  cloneBottles,
  expandLevel,
  hasAnyMove as hasAnyMoveBottles,
  isBottleDone,
  isWon as isWonBottles,
  pourAmount as pourAmountBottles,
  pourInPlace,
  spaceLeft,
  topColor,
  topRunLength
} from '../core/rules';
import { sampleWobble } from '../core/wobble';
import { Screen } from '../platform/screen';
import { preload, showRewarded } from '../services/ads';
import { track } from '../services/analytics';
import { saveProgressUnlocked } from '../services/progress';
import {
  Bottle,
  FREE_UNDOS,
  GamePhase,
  HISTORY_LIMIT,
  HitBottleOpts,
  LevelStartReason,
  MAX_EXTRA_EMPTY,
  Particle,
  PourAnim,
  SessionState,
  UIButton,
  WOBBLE_DUR
} from '../types/game';

export const STATE = {
  HOME: 'home' as GamePhase,
  PLAY: 'play' as GamePhase,
  CLEAR: 'clear' as GamePhase,
  STUCK: 'stuck' as GamePhase
};

export const game: SessionState = {
  state: STATE.HOME,
  levelIndex: 0,
  bottles: [],
  selected: -1,
  history: [],
  freeUndos: FREE_UNDOS,
  moves: 0,
  message: '',
  messageUntil: 0,
  buttons: [],
  layout: [],
  pouring: false,
  maxExtraEmpty: MAX_EXTRA_EMPTY,
  extraEmptyUsed: 0,
  now: 0,
  pourAnim: null,
  shake: null,
  pressId: null,
  pressUntil: 0,
  particles: [],
  clearT0: 0,
  tipShown: false,
  tipDismissed: false,
  transition: null,
  surfacePhase: 0,
  homeEnterT0: 0
};

export function canPour(fromIdx: number, toIdx: number): boolean {
  return canPourBottles(game.bottles, fromIdx, toIdx);
}

export function pourAmount(fromIdx: number, toIdx: number): number {
  return pourAmountBottles(game.bottles, fromIdx, toIdx);
}

export function hasAnyMove(): boolean {
  return hasAnyMoveBottles(game.bottles);
}

export function isWon(bottles: Bottle[] = game.bottles): boolean {
  return isWonBottles(bottles);
}

export function getButtonBarTop(): number {
  return barTopOf();
}

export function snapshotBottlesMeta(): { n: number; sig: string } {
  return { n: game.bottles.length, sig: bottleSignature(game.bottles) };
}

export function toast(msg: string, ms?: number): void {
  game.message = msg;
  game.messageUntil = game.now + (ms || 1400);
}

export function waterWobble(): number {
  const sample = sampleWobble(game.now, game.surfacePhase, WOBBLE_DUR);
  game.surfacePhase = sample.phase;
  return sample.value;
}

export function computeLevelLayout(count: number): void {
  game.layout = computeLayout(count, Screen.safeTop);
}

function pushHistory(): void {
  game.history.push(cloneBottles(game.bottles));
  if (game.history.length > HISTORY_LIMIT) game.history.shift();
}

export function buildLevel(idx: number): void {
  const safeIndex = Math.max(0, Math.min(idx, LEVELS.length - 1));
  const cfg = LEVELS[safeIndex];
  game.levelIndex = safeIndex;
  game.bottles = expandLevel(cfg);
  game.selected = -1;
  game.history = [];
  game.freeUndos = FREE_UNDOS;
  game.moves = 0;
  game.extraEmptyUsed = 0;
  game.message = '';
  game.pouring = false;
  game.pourAnim = null;
  game.shake = null;
  game.particles = [];
  game.surfacePhase = 0;
  computeLevelLayout(game.bottles.length);
  if (safeIndex === 0 && !game.tipDismissed) game.tipShown = true;
}

function spawnWinParticles(): void {
  const colors = COLORS.slice(0, 7);
  const list: Particle[] = [];
  for (let i = 0; i < 48; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 120 + Math.random() * 280;
    list.push({
      x: 375 + (Math.random() - 0.5) * 80,
      y: 420 + (Math.random() - 0.5) * 40,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 180,
      g: 520,
      life: 0.9 + Math.random() * 0.7,
      age: 0,
      r: 4 + Math.random() * 6,
      color: colors[i % colors.length],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 6
    });
  }
  game.particles = list;
}

function updateParticles(dt: number): void {
  const alive: Particle[] = [];
  for (const particle of game.particles) {
    particle.age += dt;
    if (particle.age >= particle.life) continue;
    particle.vy += particle.g * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.rot += particle.vr * dt;
    alive.push(particle);
  }
  game.particles = alive;
}

function afterPourCheck(): void {
  if (isWon()) {
    game.state = STATE.CLEAR;
    game.selected = -1;
    game.clearT0 = game.now;
    spawnWinParticles();
    SFX.win();
    saveProgressUnlocked(game.levelIndex);
    track('level_clear', { level_index: game.levelIndex + 1, moves: game.moves });
    return;
  }
  if (!hasAnyMove()) {
    game.state = STATE.STUCK;
    game.selected = -1;
    preload('empty_bottle');
    preload('undo');
    track('level_stuck', { level_index: game.levelIndex + 1, moves: game.moves });
  }
}

export function finishPour(): void {
  const anim = game.pourAnim;
  if (!anim) return;
  game.bottles[anim.from].layers = anim.fromStart.slice(0, anim.fromStart.length - anim.amt);
  game.bottles[anim.to].layers = anim.toStart.concat(Array(anim.amt).fill(anim.color));
  game.moves += 1;
  game.pourAnim = null;
  game.pouring = false;
  game.surfacePhase = game.now;
  track('pour_commit', {
    level_index: game.levelIndex + 1,
    from: anim.from,
    to: anim.to,
    color: anim.color,
    amount: anim.amt,
    moves: game.moves
  });
  afterPourCheck();
}

export function startPour(fromIdx: number, toIdx: number): boolean {
  const amount = pourAmount(fromIdx, toIdx);
  if (amount <= 0) return false;
  pushHistory();
  const color = topColor(game.bottles[fromIdx]);
  game.pouring = true;
  game.selected = -1;
  const anim: PourAnim = {
    from: fromIdx,
    to: toIdx,
    color,
    amt: amount,
    t0: game.now,
    dur: 420 + amount * 90,
    fromStart: game.bottles[fromIdx].layers.slice(),
    toStart: game.bottles[toIdx].layers.slice()
  };
  game.pourAnim = anim;
  SFX.pour();
  return true;
}

/** 测试与回放用：立刻落子，不播倒水动画，也不触发胜负检查。 */
export function doPourSync(fromIdx: number, toIdx: number): boolean {
  const amount = pourAmount(fromIdx, toIdx);
  if (amount <= 0) return false;
  pushHistory();
  pourInPlace(game.bottles, fromIdx, toIdx);
  game.moves += 1;
  game.selected = -1;
  return true;
}

export function triggerShake(idx: number): void {
  game.shake = { idx, t0: game.now, dur: 380 };
  SFX.invalid();
}

export function startTransition(kind: string, payload?: unknown): void {
  game.transition = {
    kind,
    t0: game.now,
    dur: kind === 'levelIn' ? 480 : 360,
    payload: payload ?? null
  };
}

export function hitBottle(x: number, y: number, opts: HitBottleOpts = {}): number {
  return hitBottleAt(x, y, game.layout, game.bottles, game.selected, getButtonBarTop(), opts);
}

export function hitButton(x: number, y: number): UIButton | null {
  return hitButtonAt(x, y, game.buttons);
}

export function bottleVisualLayers(index: number): number[] {
  const anim = game.pourAnim;
  if (!anim) return game.bottles[index].layers;
  const p = clamp01((game.now - anim.t0) / anim.dur);
  let flowP = 0;
  if (p < 0.22) flowP = 0;
  else if (p > 0.88) flowP = 1;
  else flowP = (p - 0.22) / 0.66;
  if (index === anim.from || index === anim.to) {
    const flowed = applyPourLayers(anim.fromStart, anim.toStart, anim.color, anim.amt, easeFlow(flowP));
    return index === anim.from ? flowed.from : flowed.to;
  }
  return game.bottles[index].layers;
}

function easeFlow(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function pourTilt(index: number): number {
  const anim = game.pourAnim;
  if (!anim || (index !== anim.from && index !== anim.to)) return 0;
  const p = clamp01((game.now - anim.t0) / anim.dur);
  const fromBox = game.layout[anim.from];
  const toBox = game.layout[anim.to];
  const dir = toBox.x + toBox.w / 2 >= fromBox.x + fromBox.w / 2 ? 1 : -1;
  if (index === anim.from) {
    let tip = 0;
    if (p < 0.2) tip = 1 - Math.pow(1 - p / 0.2, 3);
    else if (p < 0.82) tip = 1;
    else {
      const local = (p - 0.82) / 0.18;
      tip = 1 - (local < 0.5 ? 4 * local * local * local : 1 - Math.pow(-2 * local + 2, 3) / 2);
    }
    return dir * tip * 0.48;
  }
  if (p > 0.35 && p < 0.95) {
    const w = Math.sin((p - 0.35) * 18) * 0.04 * (1 - (p - 0.35) / 0.6);
    return -dir * w;
  }
  return 0;
}

export function shakeOffset(index: number): number {
  if (!game.shake || game.shake.idx !== index) return 0;
  const p = (game.now - game.shake.t0) / game.shake.dur;
  if (p < 0 || p >= 1) return 0;
  return Math.sin(p * Math.PI * 10) * (1 - p) * 10;
}

/** 瓶子优先。空瓶不能被选中；点空处不取消已选中。 */
export function handleBottleTap(x: number, y: number): boolean {
  const before = snapshotBottlesMeta();
  let idx: number;
  if (game.selected >= 0) {
    idx = hitBottle(x, y, { excludeSelected: true, preferValid: true });
    if (idx < 0) {
      const self = hitBottle(x, y, { strict: true });
      if (self === game.selected) {
        game.selected = -1;
        SFX.tap();
        toast('已取消选中');
        return true;
      }
      if (game.tipShown) {
        game.tipDismissed = true;
        game.tipShown = false;
      }
      toast('请点绿色高亮的空瓶或同色瓶');
      return true;
    }
  } else {
    idx = hitBottle(x, y);
    if (idx < 0) {
      if (game.tipShown) {
        game.tipDismissed = true;
        game.tipShown = false;
      }
      return false;
    }
  }

  if (game.selected < 0) {
    if (game.tipShown) {
      game.tipDismissed = true;
      game.tipShown = false;
    }
    if (!game.bottles[idx] || game.bottles[idx].layers.length === 0) {
      toast('空瓶，请先选有水的瓶子');
      triggerShake(idx);
      const after = snapshotBottlesMeta();
      if (after.n !== before.n || after.sig !== before.sig) {
        console.error('[彩虹倒水] 点空瓶改写了瓶子', before, after);
      }
      return true;
    }
    game.selected = idx;
    SFX.select();
    track('bottle_select', { level_index: game.levelIndex + 1, bottle: idx });
    return true;
  }

  if (!canPour(game.selected, idx)) {
    const target = game.bottles[idx];
    if (target && target.layers.length > 0 && spaceLeft(target) === 0) {
      toast('此瓶已满，请点空瓶或同色顶层', 1600);
      triggerShake(idx);
      track('pour_reject', { level_index: game.levelIndex + 1, reason: 'full' });
    } else if (target && target.layers.length > 0) {
      game.selected = idx;
      toast('已改选此瓶', 1200);
      SFX.select();
      track('bottle_select', { level_index: game.levelIndex + 1, bottle: idx, reason: 'reselect' });
    } else {
      toast('无法倒入：只能倒到空瓶或同色顶层', 1800);
      triggerShake(idx);
      track('pour_reject', { level_index: game.levelIndex + 1, reason: 'mismatch' });
    }
    return true;
  }

  const ok = startPour(game.selected, idx);
  if (!ok) {
    toast('无法倒入');
    triggerShake(idx);
    track('pour_reject', { level_index: game.levelIndex + 1, reason: 'rule' });
  }
  return true;
}

function activateButton(btn: UIButton): void {
  game.pressId = btn.id;
  game.pressUntil = game.now + 160;
  SFX.button();
  const fn = btn.onClick;
  setTimeout(() => {
    try {
      fn();
    } catch (err) {
      console.warn(err);
    }
  }, 40);
}

export function onTap(x: number, y: number, phase: string): void {
  if (phase === 'up') {
    game.pressId = null;
    return;
  }
  if (x < 0) return;

  if (game.transition) {
    const t = (game.now - game.transition.t0) / game.transition.dur;
    if (t < 0.85) return;
  }

  const aboveBar = y < getButtonBarTop();
  if (game.state === STATE.PLAY && !game.pouring && aboveBar) {
    if (handleBottleTap(x, y)) return;
  }

  const button = hitButton(x, y);
  if (button) {
    activateButton(button);
    return;
  }

  if (game.state !== STATE.PLAY || game.pouring) return;
  handleBottleTap(x, y);
}

export function addEmptyBottle(): void {
  if (game.extraEmptyUsed >= game.maxExtraEmpty) {
    toast('本关空杯已达上限');
    return;
  }
  showRewarded('empty_bottle').then((ok) => {
    if (!ok) {
      toast('未看完广告，未获得空杯');
      return;
    }
    pushHistory();
    game.bottles.push({ layers: [] });
    game.extraEmptyUsed += 1;
    computeLevelLayout(game.bottles.length);
    game.state = STATE.PLAY;
    game.selected = -1;
    toast('获得 +1 空杯！');
    track('extra_bottle', {
      level_index: game.levelIndex + 1,
      used: game.extraEmptyUsed,
      cap: game.maxExtraEmpty
    });
    afterPourCheck();
  });
}

export function undoMove(fromAd: boolean): void {
  if (game.history.length === 0) {
    toast('没有可撤销的步骤');
    return;
  }
  const apply = () => {
    const prev = game.history.pop();
    if (!prev) return;
    game.bottles = prev;
    game.moves = Math.max(0, game.moves - 1);
    game.selected = -1;
    computeLevelLayout(game.bottles.length);
    game.state = STATE.PLAY;
    toast('已撤销一步');
    track('undo', { level_index: game.levelIndex + 1, free: fromAd ? 0 : 1, moves: game.moves });
  };
  if (!fromAd && game.freeUndos > 0) {
    game.freeUndos -= 1;
    apply();
    return;
  }
  showRewarded('undo').then((ok) => {
    if (!ok) {
      toast('未看完广告，未撤销');
      return;
    }
    apply();
  });
}

export function startLevel(idx: number, reason: LevelStartReason = 'start'): void {
  startTransition('levelIn', { idx, reason });
  buildLevel(idx);
  game.state = STATE.PLAY;
  track('level_start', { level_index: game.levelIndex + 1, reason });
  preload('empty_bottle');
  preload('undo');
}

export function goHome(clearParticles: boolean): void {
  game.state = STATE.HOME;
  game.homeEnterT0 = game.now;
  if (clearParticles) game.particles = [];
  track('home_view', { level_index: game.levelIndex + 1 });
}

export function tick(dt: number): void {
  if (game.pourAnim) {
    const p = (game.now - game.pourAnim.t0) / game.pourAnim.dur;
    if (p >= 1) finishPour();
  }
  if (game.shake && game.now - game.shake.t0 >= game.shake.dur) game.shake = null;
  if (game.surfacePhase && game.now - game.surfacePhase >= WOBBLE_DUR) game.surfacePhase = 0;
  if (game.particles.length) updateParticles(dt);
}

export {
  cloneBottles,
  isBottleDone,
  spaceLeft,
  topColor,
  topRunLength,
  WOBBLE_DUR
};
