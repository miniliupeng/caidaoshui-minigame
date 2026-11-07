import { Bottle, CAPACITY, LevelConfig } from '../types/game';
import { clamp01 } from './easing';

export function cloneBottles(bottles: Bottle[]): Bottle[] {
  return bottles.map((b) => ({ layers: b.layers.slice() }));
}

export function topColor(bottle: Bottle): number {
  if (!bottle.layers.length) return -1;
  return bottle.layers[bottle.layers.length - 1];
}

export function topRunLength(bottle: Bottle): number {
  if (!bottle.layers.length) return 0;
  const color = topColor(bottle);
  let n = 0;
  for (let i = bottle.layers.length - 1; i >= 0; i--) {
    if (bottle.layers[i] !== color) break;
    n += 1;
  }
  return n;
}

export function spaceLeft(bottle: Bottle): number {
  return CAPACITY - bottle.layers.length;
}

/** 空瓶，或装满且整瓶同色，都算完成。 */
export function isBottleDone(bottle: Bottle): boolean {
  if (bottle.layers.length === 0) return true;
  if (bottle.layers.length !== CAPACITY) return false;
  const color = bottle.layers[0];
  return bottle.layers.every((layer) => layer === color);
}

export function isWon(bottles: Bottle[]): boolean {
  return bottles.every(isBottleDone);
}

export function canPour(bottles: Bottle[], fromIdx: number, toIdx: number): boolean {
  if (fromIdx === toIdx) return false;
  const from = bottles[fromIdx];
  const to = bottles[toIdx];
  if (!from || !to) return false;
  if (from.layers.length === 0) return false;
  if (spaceLeft(to) === 0) return false;
  if (to.layers.length === 0) return true;
  return topColor(to) === topColor(from);
}

export function pourAmount(bottles: Bottle[], fromIdx: number, toIdx: number): number {
  if (!canPour(bottles, fromIdx, toIdx)) return 0;
  return Math.min(topRunLength(bottles[fromIdx]), spaceLeft(bottles[toIdx]));
}

/** 就地倒水。成功返回倒入层数，失败返回 0。 */
export function pourInPlace(bottles: Bottle[], fromIdx: number, toIdx: number): number {
  const amount = pourAmount(bottles, fromIdx, toIdx);
  if (amount <= 0) return 0;
  const from = bottles[fromIdx];
  const to = bottles[toIdx];
  const color = topColor(from);
  for (let i = 0; i < amount; i++) {
    const layer = from.layers.pop();
    if (typeof layer === 'number') to.layers.push(layer);
    else to.layers.push(color);
  }
  return amount;
}

export function hasAnyMove(bottles: Bottle[]): boolean {
  const count = bottles.length;
  for (let from = 0; from < count; from++) {
    for (let to = 0; to < count; to++) {
      if (canPour(bottles, from, to)) return true;
    }
  }
  return false;
}

export function expandLevel(cfg: LevelConfig): Bottle[] {
  const bottles = cfg.bottles.map((layers) => ({ layers: layers.slice() }));
  for (let i = 0; i < cfg.emptyExtra; i++) bottles.push({ layers: [] });
  return bottles;
}

export function bottleSignature(bottles: Bottle[]): string {
  return bottles.map((bottle) => bottle.layers.join(',')).join('|');
}

/** 倒水动画的液面插值。progress 为 0~1，moved 按层取整。 */
export function applyPourLayers(
  fromStart: number[],
  toStart: number[],
  color: number,
  amt: number,
  progress: number
): { from: number[]; to: number[]; moved: number } {
  const moved = Math.floor(amt * clamp01(progress) + 1e-6);
  return {
    from: fromStart.slice(0, fromStart.length - moved),
    to: toStart.concat(Array(moved).fill(color)),
    moved
  };
}
