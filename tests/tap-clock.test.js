/**
 * 从 MVP scripts/test-tap.js 迁来的点击 / 时钟回归。
 * 通过编译后的 GameMain._test 驱动，避免渲染层参与。
 */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

require('../js/main.js');

const GM = globalThis.GameMain;
const T = GM._test;
const g = GM.game;

function bottleSig() {
  return g.bottles.map((bottle) => bottle.layers.join(',')).join('|');
}

function centerOf(i) {
  const box = g.layout[i];
  return [box.x + box.w / 2, box.y + box.h / 2];
}

function leftOf(i, frac) {
  const box = g.layout[i];
  return [box.x + box.w * frac, box.y + box.h * 0.55];
}

function enterLevel() {
  T.buildLevel(0);
  g.state = GM.STATE.PLAY;
  g.selected = -1;
  g.pouring = false;
  g.transition = null;
  g.pourAnim = null;
}

describe('点击与时钟回归', { concurrency: false }, () => {
test('重开后点空瓶不删瓶、不改液面、不选中', () => {
  enterLevel();
  g.now = 1000;
  const n0 = g.bottles.length;
  const sig0 = bottleSig();
  assert.equal(n0, 3);
  assert.equal(g.bottles[2].layers.length, 0);
  const [ex, ey] = centerOf(2);
  T.onTap(ex, ey, 'down');
  assert.equal(g.bottles.length, n0);
  assert.equal(bottleSig(), sig0);
  assert.equal(g.selected, -1);
  assert.equal(g.shake && g.shake.idx, 2);

  T.onTap(ex, ey, 'down');
  assert.equal(g.bottles.length, n0);
  assert.equal(bottleSig(), sig0);
});

test('选中满瓶再点空瓶会开始倒水', () => {
  enterLevel();
  g.now = 2000;
  const [fx, fy] = centerOf(0);
  T.onTap(fx, fy, 'down');
  assert.equal(g.selected, 0);
  const [ex, ey] = centerOf(2);
  T.onTap(ex, ey, 'down');
  assert.equal(g.pouring === true || g.pourAnim != null, true);
  assert.equal(g.selected, -1);

  g.pourAnim = null;
  g.pouring = false;
  enterLevel();
  assert.equal(T.canPour(0, 2), true);
  assert.equal(T.doPour(0, 2), true);
  assert.ok(g.bottles[2].layers.length > 0);
  assert.equal(g.bottles.length, 3);
});

test('选中后空瓶左缘 preferValid 命中可倒目标', () => {
  enterLevel();
  g.selected = 0;
  g.now = 3000;
  const [lx, ly] = leftOf(2, 0.08);
  const hit = T.hitBottle(lx, ly, { excludeSelected: true, preferValid: true });
  assert.equal(hit, 2);
  assert.equal(T.canPour(0, hit), true);
});

test('点空瓶不得触发底栏重开', () => {
  enterLevel();
  g.now = 4000;
  g.buttons = [
    {
      id: 'restart',
      x: 470,
      y: GM.H - 168,
      w: 226,
      h: 92,
      label: '重开',
      onClick: () => {
        g._restartClicked = true;
      }
    }
  ];
  g._restartClicked = false;
  const [ex, ey] = centerOf(2);
  const barTop = T.getButtonBarTop();
  assert.ok(ey < barTop, `空瓶中心 y=${ey} 应在底栏 ${barTop} 以上`);
  const sigBefore = bottleSig();
  T.onTap(ex, ey, 'down');
  assert.equal(g._restartClicked, false);
  assert.equal(bottleSig(), sigBefore);
  assert.equal(g.bottles.length, 3);
});

test('倒过再重开，空瓶仍在且点它不删瓶', () => {
  enterLevel();
  g.selected = 0;
  T.doPour(0, 2);
  enterLevel();
  g.now = 5000;
  const sigR = bottleSig();
  const [rx, ry] = centerOf(2);
  T.onTap(rx, ry, 'down');
  assert.equal(g.bottles.length, 3);
  assert.equal(bottleSig(), sigR);
  assert.equal(g.bottles[2].layers.length, 0);
});

test('点空白不清除已选中', () => {
  enterLevel();
  g.selected = 0;
  g.now = 6000;
  T.onTap(10, 10, 'down');
  assert.equal(g.selected, 0);
});

test('会话晃动只认 game.now，超时与回绕都清零', () => {
  g.now = 10000;
  g.surfacePhase = 10000;
  assert.equal(typeof T.waterWobble(), 'number');
  g.now = 10100;
  assert.notEqual(T.waterWobble(), 0);
  g.now = 10000 + T.WOBBLE_DUR + 10;
  assert.equal(T.waterWobble(), 0);
  assert.equal(g.surfacePhase, 0);

  g.surfacePhase = 20000;
  g.now = 10000;
  assert.equal(T.waterWobble(), 0);
  assert.equal(g.surfacePhase, 0);
});

test('无 wx 时触摸换算保持 1:1', () => {
  const [tx, ty] = T.touchToLogic(375, 667);
  assert.ok(Math.abs(tx - 375) < 0.01);
  assert.ok(Math.abs(ty - 667) < 0.01);
});
});
