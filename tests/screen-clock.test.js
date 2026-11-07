const test = require('node:test');
const assert = require('node:assert/strict');

const { clientToDesign } = require('../js/platform/screen');
const { sampleWobble } = require('../js/core/wobble');
const { WOBBLE_DUR } = require('../js/types/game');

test('设计坐标换算只使用 client * (设计边 / 窗口边)', () => {
  const [x, y] = clientToDesign(375, 667, 750, 1334);
  assert.ok(Math.abs(x - 375) < 1e-6);
  assert.ok(Math.abs(y - 667) < 1e-6);

  const [sx, sy] = clientToDesign(187.5, 333.5, 375, 667);
  assert.ok(Math.abs(sx - 375) < 1e-6);
  assert.ok(Math.abs(sy - 667) < 1e-6);

  const [zx, zy] = clientToDesign(10, 20, 0, 0);
  assert.ok(Math.abs(zx - 10) < 1e-6);
  assert.ok(Math.abs(zy - 20) < 1e-6);
});

test('晃动时钟：窗口内有值，超时或时钟回绕后清零', () => {
  assert.equal(WOBBLE_DUR, 380);
  const still = sampleWobble(10000, 10000, WOBBLE_DUR);
  assert.equal(typeof still.value, 'number');
  assert.equal(still.phase, 10000);

  const moving = sampleWobble(10100, 10000, WOBBLE_DUR);
  assert.notEqual(moving.value, 0);
  assert.equal(moving.phase, 10000);

  const ended = sampleWobble(10000 + WOBBLE_DUR + 10, 10000, WOBBLE_DUR);
  assert.equal(ended.value, 0);
  assert.equal(ended.phase, 0);

  const backwards = sampleWobble(10000, 20000, WOBBLE_DUR);
  assert.equal(backwards.value, 0);
  assert.equal(backwards.phase, 0);

  const idle = sampleWobble(5000, 0, WOBBLE_DUR);
  assert.equal(idle.value, 0);
  assert.equal(idle.phase, 0);
});
