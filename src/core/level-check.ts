import { CAPACITY, LevelConfig } from '../types/game';
import { expandLevel, hasAnyMove, isWon } from './rules';

export interface LevelIssue {
  code: string;
  message: string;
}

/** 关卡合法性：容量、颜色恰好 4 份、有空瓶、开局未完成且存在步可走。 */
export function checkLevel(cfg: LevelConfig, index = 0): LevelIssue[] {
  const issues: LevelIssue[] = [];
  const label = `第 ${index + 1} 关「${cfg.name || '未命名'}」`;

  if (!cfg.name || !cfg.name.trim()) {
    issues.push({ code: 'name', message: `${label} 缺少名称` });
  }
  if (!Number.isInteger(cfg.emptyExtra) || cfg.emptyExtra < 1) {
    issues.push({ code: 'empty_extra', message: `${label} emptyExtra 应为正整数` });
  }
  if (!Array.isArray(cfg.bottles) || cfg.bottles.length < 1) {
    issues.push({ code: 'bottles', message: `${label} 没有初始瓶子` });
    return issues;
  }

  const counts = new Map<number, number>();
  cfg.bottles.forEach((layers, bottleIndex) => {
    if (!Array.isArray(layers)) {
      issues.push({ code: 'bottles', message: `${label} 瓶 ${bottleIndex} 不是数组` });
      return;
    }
    if (layers.length > CAPACITY) {
      issues.push({
        code: 'overflow',
        message: `${label} 瓶 ${bottleIndex} 有 ${layers.length} 层，超过容量 ${CAPACITY}`
      });
    }
    layers.forEach((color) => {
      if (!Number.isInteger(color) || color < 0) {
        issues.push({ code: 'color', message: `${label} 存在非法颜色 ${String(color)}` });
        return;
      }
      counts.set(color, (counts.get(color) || 0) + 1);
    });
  });

  const ids = Array.from(counts.keys()).sort((a, b) => a - b);
  ids.forEach((id, order) => {
    if (id !== order) {
      issues.push({ code: 'color_gap', message: `${label} 颜色 id 不连续，出现 ${id}` });
    }
  });
  counts.forEach((count, color) => {
    if (count !== CAPACITY) {
      issues.push({
        code: 'color_count',
        message: `${label} 颜色 ${color} 出现 ${count} 次，应为 ${CAPACITY}`
      });
    }
  });

  const expanded = expandLevel(cfg);
  const emptyCount = expanded.filter((bottle) => bottle.layers.length === 0).length;
  if (emptyCount < 1) {
    issues.push({ code: 'no_empty', message: `${label} 展开后没有空瓶` });
  }
  if (isWon(expanded)) {
    issues.push({ code: 'already_won', message: `${label} 开局即过关` });
  } else if (!hasAnyMove(expanded)) {
    issues.push({ code: 'no_move', message: `${label} 开局没有任何合法倒水` });
  }
  return issues;
}
