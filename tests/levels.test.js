const test = require('node:test');
const assert = require('node:assert/strict');

const { LEVELS } = require('../js/data/levels');
const { checkLevel } = require('../js/core/level-check');
const { solve } = require('../js/core/solver');
const { expandLevel, isWon, pourInPlace } = require('../js/core/rules');

test('关卡数量与结构合法', () => {
  assert.equal(LEVELS.length, 80);
  const problems = [];
  LEVELS.forEach((cfg, index) => {
    const issues = checkLevel(cfg, index);
    issues.forEach((issue) => problems.push(issue.message));
  });
  assert.deepEqual(problems, []);
});

test('全部关卡可解，且第 1 关回放能够过关', { timeout: 180000 }, () => {
  LEVELS.forEach((cfg, index) => {
    const start = expandLevel(cfg);
    const found = solve(start);
    assert.ok(found, `第 ${index + 1} 关「${cfg.name}」未找到解`);
    assert.ok(found.path.length > 0, `第 ${index + 1} 关开局不应已完成`);
  });

  const first = expandLevel(LEVELS[0]);
  const solved = solve(first);
  solved.path.forEach(([from, to]) => {
    const amount = pourInPlace(first, from, to);
    assert.ok(amount > 0, `回放步 ${from}->${to} 不合法`);
  });
  assert.equal(isWon(first), true);
});
