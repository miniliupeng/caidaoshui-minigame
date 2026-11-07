const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const session = require('../js/app/session');
const { getTrackedEvents, clearTrackedEvents } = require('../js/services/analytics');
const { loadProgress, saveProgressUnlocked } = require('../js/services/progress');
const { hasPrivacyConsent, acceptPrivacy, PRIVACY_SUMMARY } = require('../js/services/privacy');
const { writeStorage, clearMemoryStorage } = require('../js/platform/storage');

describe('对局会话', { concurrency: false }, () => {
test('免费撤销回滚瓶子与步数，不看广告', () => {
  session.buildLevel(0);
  session.game.state = 'play';
  const before = session.snapshotBottlesMeta().sig;
  assert.equal(session.doPourSync(0, 2), true);
  assert.equal(session.game.moves, 1);
  assert.equal(session.game.history.length, 1);
  session.undoMove(false);
  assert.equal(session.game.freeUndos, 2);
  assert.equal(session.snapshotBottlesMeta().sig, before);
  assert.equal(session.game.moves, 0);
  assert.equal(session.game.state, 'play');
});

test('浏览器 / Node 无 confirm 时激励广告按看完发奖，并增加空杯', async () => {
  session.buildLevel(0);
  const before = session.game.bottles.length;
  session.addEmptyBottle();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(session.game.bottles.length, before + 1);
  assert.equal(session.game.bottles[session.game.bottles.length - 1].layers.length, 0);
  assert.equal(session.game.extraEmptyUsed, 1);
  assert.equal(session.game.state, 'play');
});

test('同关空杯有上限', async () => {
  session.buildLevel(0);
  session.addEmptyBottle();
  await new Promise((resolve) => setImmediate(resolve));
  session.addEmptyBottle();
  await new Promise((resolve) => setImmediate(resolve));
  const count = session.game.bottles.length;
  session.addEmptyBottle();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(session.game.extraEmptyUsed, 2);
  assert.equal(session.game.bottles.length, count);
  assert.match(session.game.message, /上限/);
});

test('通关推进解锁进度，重玩旧关不把进度打回去', () => {
  clearMemoryStorage();
  writeStorage('caidaoshui_progress', '0');
  assert.equal(loadProgress(), 0);
  saveProgressUnlocked(0);
  assert.equal(loadProgress(), 1);
  saveProgressUnlocked(3);
  assert.equal(loadProgress(), 4);
  saveProgressUnlocked(1);
  assert.equal(loadProgress(), 4);
});

test('隐私同意只记一次，埋点里能看到 privacy_accept 与 level_start', () => {
  clearTrackedEvents();
  clearMemoryStorage();
  assert.match(PRIVACY_SUMMARY, /本机/);
  assert.equal(hasPrivacyConsent(), false);
  acceptPrivacy();
  acceptPrivacy();
  session.startLevel(0, 'start');
  const names = getTrackedEvents().map((item) => item.event);
  assert.equal(names.filter((name) => name === 'privacy_accept').length, 1);
  assert.ok(names.includes('level_start'));
  assert.equal(hasPrivacyConsent(), true);
  assert.equal(session.game.state, 'play');
  assert.equal(session.game.levelIndex, 0);
});
});
