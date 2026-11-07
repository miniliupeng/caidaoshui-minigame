# 彩虹倒水

竖屏水排序微信小游戏。点选瓶子，再点目标瓶倒水；同色倒满或倒空即过关。激励视频可以换一个空杯，或在免费次数用完后续撤销。

当前版本 **0.3.0**。AppID：`wx50da0aafbce43359`。设计分辨率 **750×1334**。

## 文档

- [需求](docs/01-需求PRD.md)：规则、关卡、广告、埋点、隐私和平台约束
- [UX](docs/02-UX设计.md)：首页 / 对局 / 过关 / 卡住、引导和动效
- [架构](docs/03-架构.md)：分层、适配、时钟和构建产物
- [测试与验收](docs/04-测试与验收.md)：命令、开发者工具步骤、验收清单
- [工程规范](docs/05-工程规范.md)：流程、风格、哪些文件不要手改

## 本地构建与测试

需要 Node.js 18 或更高。

```bash
npm install
npm test
```

`npm test` 会编译 `src/` 到 `js/`，打出浏览器预览包，并运行规则、80 关求解、点击和时钟回归。求解全部关卡大约需要几十秒。

只看画面：

```bash
npm run build
npm run preview
```

浏览器打开 `http://127.0.0.1:41773`。预览里的广告是确认框：确定代表看完。

## 微信开发者工具

1. `npm install && npm run build`，生成 `js/main.js`。
2. 开发者工具里选择小游戏，导入**本目录**（含 `game.js` 和 `project.config.json`）。
3. AppID 填 `wx50da0aafbce43359`。没有权限时可用测试号看玩法；占位广告位创建失败时不会发奖。
4. 竖屏模拟器里走一遍 [验收清单](docs/04-测试与验收.md)。
5. 提审前把 `src/services/placements.ts` 的占位广告位换成流量主真实 ID，并在公众平台配好用户隐私保护指引，然后重新构建。

入口是 `game.js`，它加载 `js/main.js`。不要直接运行 `src/`，也不要手改 `js/`。

## 目录

```
game.js                 微信入口
game.json               竖屏与网络超时
project.config.json     AppID、上传忽略列表
index.html              浏览器预览页
src/main.ts             启动与帧循环
src/app/session.ts      对局状态、点击、胜负、撤销、空杯
src/core/               倒水规则、命中、布局、求解、晃动
src/data/levels.ts      80 关
src/platform/           Screen、触摸、存储
src/services/           广告、埋点、进度、隐私
src/audio/              音效与背景音乐
src/render/             四个界面和瓶子
tests/                  对编译结果的回归
docs/                   需求、UX、架构、测试、规范
audio/ images/          运行时资源
```

`js/` 和 `preview/` 是构建产物，已忽略，不入库。

## 相对 MVP 0.2.0 的主要变化

玩法保持一致：同样的 80 关、四层容量、点选再倒、3 次免费撤销、每关最多 2 个广告空杯、过关 / 卡住 / 首页，以及「瓶子热区优先于底栏重开」。

工程上从单文件 `main.ts` 拆成规则、对局、渲染、输入、音频、广告和存档。适配仍只有 `Screen` 一处，动画时钟仍只有 `game.now`。

另外收紧了几处会影响线上的行为：

- 微信激励视频失败或未看完不再发奖。旧版失败时会落到 mock，且没有确认框时直接当看完。
- 播广告前会调用 `wx.requirePrivacyAuthorize`（基础库有这个接口时）。
- 首次开始按钮写成「同意并开始」，本地只存进度、同意标记和静音。
- 埋点集中在 `track`，能接到 `wx.reportEvent`。
- 关卡合法性与可解性、倒水规则、点击和时钟都进了 `npm test`。
