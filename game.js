/**
 * 微信小游戏入口。
 * 打开开发者工具前先在本目录执行 npm run build，入口只加载编译产物。
 */
require('./js/main.js');

const host = typeof GameGlobal !== 'undefined' ? GameGlobal : globalThis;
const Main = host.GameMain;

if (Main && typeof Main.start === 'function') {
  Main.start();
} else {
  console.error('[彩虹倒水] GameMain 未加载，请先 npm run build');
}
