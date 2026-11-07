const test = require('node:test');
const assert = require('node:assert/strict');
const { CAPACITY } = require('../js/types/game');

function loadRules() {
  return require('../js/core/rules');
}

function tube(layers) {
  return { layers: layers.slice() };
}

test('空瓶与同色满瓶算完成，混色或未满不算', () => {
  const { isBottleDone, isWon } = loadRules();
  assert.equal(isBottleDone(tube([])), true);
  assert.equal(isBottleDone(tube([0, 0, 0, 0])), true);
  assert.equal(isBottleDone(tube([0, 0, 0])), false);
  assert.equal(isBottleDone(tube([0, 1, 0, 1])), false);
  assert.equal(isWon([tube([0, 0, 0, 0]), tube([]), tube([1, 1, 1, 1])]), true);
  assert.equal(isWon([tube([0, 0, 0]), tube([1, 1, 1, 1])]), false);
});

test('只能倒进空瓶或同色顶层，数量取连续顶层与剩余空间的较小值', () => {
  const { canPour, pourAmount, pourInPlace, topRunLength } = loadRules();
  const bottles = [tube([1, 1, 0, 0]), tube([1, 1]), tube([2, 2, 2, 2]), tube([])];
  assert.equal(topRunLength(bottles[0]), 2);
  assert.equal(canPour(bottles, 0, 3), true);
  assert.equal(pourAmount(bottles, 0, 3), 2);
  assert.equal(canPour(bottles, 0, 1), false, '顶层颜色不同不能倒');
  assert.equal(canPour(bottles, 0, 2), false, '满瓶不能再倒入');
  assert.equal(canPour(bottles, 0, 0), false);
  assert.equal(canPour(bottles, 3, 0), false, '空瓶不能作为来源');

  const partial = [tube([0, 1, 1, 1]), tube([1, 1, 1])];
  assert.equal(pourAmount(partial, 0, 1), 1, '目标只剩 1 格，连续顶层有 3，应受空间限制');
  assert.equal(CAPACITY, 4);

  const moving = [tube([2, 0, 0]), tube([])];
  assert.equal(pourInPlace(moving, 0, 1), 2);
  assert.deepEqual(moving[0].layers, [2]);
  assert.deepEqual(moving[1].layers, [0, 0]);
  assert.equal(pourInPlace(moving, 0, 1), 0, '颜色不同时就地倒水失败且不改状态');
  assert.deepEqual(moving[0].layers, [2]);
});

test('倒水动画按进度逐层移动，不一次倒完', () => {
  const { applyPourLayers } = loadRules();
  const mid = applyPourLayers([1, 0, 0], [], 0, 2, 0.5);
  assert.equal(mid.moved, 1);
  assert.deepEqual(mid.from, [1, 0]);
  assert.deepEqual(mid.to, [0]);
  const done = applyPourLayers([1, 0, 0], [], 0, 2, 1);
  assert.equal(done.moved, 2);
  assert.deepEqual(done.from, [1]);
  assert.deepEqual(done.to, [0, 0]);
  const none = applyPourLayers([1, 0, 0], [1], 0, 2, 0);
  assert.equal(none.moved, 0);
});

test('无路可走与仍有空瓶可倒', () => {
  const { hasAnyMove, expandLevel } = loadRules();
  assert.equal(hasAnyMove([tube([0, 1, 0, 1]), tube([1, 0, 1, 0])]), false);
  const level = expandLevel({
    name: '样本',
    bottles: [
      [1, 0, 1, 0],
      [1, 1, 0, 0]
    ],
    emptyExtra: 1
  });
  assert.equal(level.length, 3);
  assert.equal(level[2].layers.length, 0);
  assert.equal(hasAnyMove(level), true);
});
