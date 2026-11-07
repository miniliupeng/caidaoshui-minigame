import { Bottle, HitBottleOpts, LayoutBox, UIButton } from '../types/game';
import { canPour } from './rules';

/**
 * 点选瓶子。选中后 preferValid 会放大可倒目标的热区，并优先命中可倒瓶。
 * 热区下沿不超过底栏，避免空瓶点击被「重开」抢走。
 */
export function hitBottleAt(
  x: number,
  y: number,
  layout: LayoutBox[],
  bottles: Bottle[],
  selected: number,
  barTop: number,
  opts: HitBottleOpts = {}
): number {
  const excludeSelected = !!opts.excludeSelected;
  const strict = !!opts.strict;
  const preferValid = !!opts.preferValid;
  const candidates: { i: number; d: number; isValid: boolean }[] = [];

  for (let i = 0; i < layout.length; i++) {
    if (excludeSelected && i === selected) continue;
    const box = layout[i];
    if (!box) continue;
    const isValid = preferValid && selected >= 0 && canPour(bottles, selected, i);
    const lift = selected === i ? 18 : isValid ? 6 : 0;
    let padX: number;
    let padTop: number;
    let padBot: number;
    if (strict) {
      padX = Math.max(6, box.w * 0.06);
      padTop = 12;
      padBot = 8;
    } else if (isValid) {
      padX = Math.max(28, box.w * 0.38);
      padTop = Math.max(36, box.h * 0.16);
      padBot = 28;
    } else {
      padX = Math.max(14, box.w * 0.14);
      padTop = Math.max(28, box.h * 0.1);
      padBot = 16;
    }
    const top = box.y - padTop - lift;
    const bot = Math.min(box.y + box.h + padBot - lift, barTop - 1);
    if (x >= box.x - padX && x <= box.x + box.w + padX && y >= top && y <= bot) {
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2 - lift;
      const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      candidates.push({ i, d, isValid: !!isValid });
    }
  }
  if (!candidates.length) return -1;
  if (preferValid) {
    const valid = candidates.filter((item) => item.isValid);
    if (valid.length) {
      valid.sort((a, b) => a.d - b.d);
      return valid[0].i;
    }
  }
  candidates.sort((a, b) => a.d - b.d);
  return candidates[0].i;
}

export function hitButtonAt(x: number, y: number, buttons: UIButton[]): UIButton | null {
  for (const button of buttons) {
    if (x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) {
      return button;
    }
  }
  return null;
}
