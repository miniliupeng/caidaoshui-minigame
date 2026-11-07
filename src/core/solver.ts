import { Bottle, CAPACITY } from '../types/game';
import { bottleSignature, canPour, isBottleDone, isWon, pourAmount, topColor } from './rules';

export interface SolveResult {
  path: Array<[number, number]>;
  nodes: number;
}

interface SearchNode {
  state: Bottle[];
  parent: number;
  move: [number, number] | null;
}

function pourCopy(bottles: Bottle[], fromIdx: number, toIdx: number): Bottle[] {
  const amount = pourAmount(bottles, fromIdx, toIdx);
  const next = bottles.map((bottle) => ({ layers: bottle.layers.slice() }));
  const color = topColor(next[fromIdx]);
  for (let i = 0; i < amount; i++) {
    next[fromIdx].layers.pop();
    next[toIdx].layers.push(color);
  }
  return next;
}

/**
 * BFS 求任意一解。已完成的同色满瓶不再倒出（每种颜色恰好 CAPACITY 层时这不会漏解）。
 */
export function solve(start: Bottle[], maxNodes = 1_000_000): SolveResult | null {
  if (isWon(start)) return { path: [], nodes: 0 };
  const nodes: SearchNode[] = [
    {
      state: start.map((bottle) => ({ layers: bottle.layers.slice() })),
      parent: -1,
      move: null
    }
  ];
  const seen = new Set<string>([bottleSignature(nodes[0].state)]);
  let cursor = 0;
  let visited = 0;

  while (cursor < nodes.length && visited < maxNodes) {
    const current = nodes[cursor];
    visited += 1;
    const state = current.state;
    const count = state.length;
    for (let from = 0; from < count; from++) {
      const source = state[from];
      if (source.layers.length === CAPACITY && isBottleDone(source)) continue;
      for (let to = 0; to < count; to++) {
        if (!canPour(state, from, to)) continue;
        const next = pourCopy(state, from, to);
        const key = bottleSignature(next);
        if (seen.has(key)) continue;
        seen.add(key);
        const move: [number, number] = [from, to];
        nodes.push({ state: next, parent: cursor, move });
        if (isWon(next)) {
          return { path: reconstruct(nodes, nodes.length - 1), nodes: visited };
        }
      }
    }
    cursor += 1;
  }
  return null;
}

function reconstruct(nodes: SearchNode[], endIndex: number): Array<[number, number]> {
  const path: Array<[number, number]> = [];
  let index = endIndex;
  while (index > 0) {
    const move = nodes[index].move;
    if (move) path.push(move);
    index = nodes[index].parent;
  }
  path.reverse();
  return path;
}
