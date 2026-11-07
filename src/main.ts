/**
 * 彩虹倒水入口。
 * 微信：game.js require 本文件编译产物 js/main.js。
 * 浏览器预览：esbuild 打成 preview/game.bundle.js 后由 index.html 启动。
 */

import { initBgm } from './audio/bgm';
import { initSfx } from './audio/sfx';
import {
  buildLevel,
  canPour,
  computeLevelLayout,
  cloneBottles,
  doPourSync,
  finishPour,
  game,
  getButtonBarTop,
  handleBottleTap,
  hasAnyMove,
  hitBottle,
  isWon,
  onTap,
  pourAmount,
  snapshotBottlesMeta,
  spaceLeft,
  startPour,
  STATE,
  tick,
  toast,
  topColor,
  topRunLength,
  triggerShake,
  waterWobble,
  WOBBLE_DUR
} from './app/session';
import { LEVELS } from './data/levels';
import { perfNow } from './platform/clock';
import { bindInput } from './platform/input';
import { Screen } from './platform/screen';
import { HomeHero } from './render/hero';
import { render } from './render/scene';
import { track } from './services/analytics';
import { APP_VERSION, CAPACITY, DESIGN_H as H, DESIGN_W as W } from './types/game';

function start(): void {
  track('app_launch', { version: APP_VERSION });
  initSfx();
  initBgm();
  HomeHero.load();
  const canvas = Screen.createCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('[彩虹倒水] 无法取得 2d 上下文');
    return;
  }
  bindInput(canvas, onTap);
  game.homeEnterT0 = 0;
  game.now = 0;
  Screen.refresh();

  let last = 0;
  let clockReady = false;
  const loop = (ts?: number): void => {
    game.now = typeof ts === 'number' ? ts : perfNow();
    if (!clockReady) {
      game.homeEnterT0 = game.now;
      last = game.now;
      clockReady = true;
    }
    const dt = Math.min(0.05, (game.now - last) / 1000);
    last = game.now;
    tick(dt);
    render(ctx);
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(loop);
    else setTimeout(() => loop(perfNow()), 16);
  };

  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(loop);
  else loop(perfNow());
  console.log('[彩虹倒水] ready', APP_VERSION, '· levels', LEVELS.length);
}

const GameMain = {
  start,
  W,
  H,
  STATE,
  game,
  LEVELS,
  CAPACITY,
  _test: {
    buildLevel,
    canPour,
    doPour: doPourSync,
    pourAmount,
    isWon,
    hasAnyMove,
    cloneBottles,
    topColor,
    topRunLength,
    spaceLeft,
    startPour,
    finishPour,
    hitBottle,
    onTap,
    handleBottleTap,
    computeLayout: (count?: number) => computeLevelLayout(count ?? game.bottles.length),
    getButtonBarTop,
    touchToLogic: (cx: number, cy: number) => Screen.touchToLogic(cx, cy),
    getWindowSize: () => Screen.getWindowSize(),
    snapshotBottlesMeta,
    toast,
    triggerShake,
    waterWobble,
    WOBBLE_DUR,
    Screen
  }
};

function publish(): void {
  const hosts: Array<Record<string, unknown>> = [globalThis as unknown as Record<string, unknown>];
  if (typeof GameGlobal !== 'undefined') hosts.push(GameGlobal as unknown as Record<string, unknown>);
  if (typeof window !== 'undefined') hosts.push(window as unknown as Record<string, unknown>);
  hosts.forEach((host) => {
    host.GameMain = GameMain;
  });
}

publish();

export = GameMain;
