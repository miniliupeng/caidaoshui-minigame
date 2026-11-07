/** 本项目用到的微信小游戏 API 子集。完整声明以微信开发者工具基础库为准。 */

interface WxMenuRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface WxSafeArea {
  top: number;
  left?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;
}

interface WxWindowInfo {
  windowWidth: number;
  windowHeight: number;
  pixelRatio?: number;
  statusBarHeight?: number;
  safeAreaInsetTop?: number;
  safeArea?: WxSafeArea;
}

interface WxTouchPoint {
  clientX?: number;
  clientY?: number;
  x?: number;
  y?: number;
}

interface WxTouchEvent {
  touches?: WxTouchPoint[];
  changedTouches?: WxTouchPoint[];
}

interface WxRewardedVideoAd {
  show(): Promise<void>;
  load(): Promise<void>;
  onClose(cb: (res: { isEnded?: boolean }) => void): void;
  offClose(cb: (res: { isEnded?: boolean }) => void): void;
  onError(cb: (err: unknown) => void): void;
  offError(cb: (err: unknown) => void): void;
}

interface WxInnerAudio {
  src: string;
  autoplay: boolean;
  loop: boolean;
  volume: number;
  play(): void;
  stop(): void;
  pause(): void;
  onError(cb: (res: { errMsg?: string; errCode?: number }) => void): void;
  onCanplay(cb: () => void): void;
  onPlay(cb: () => void): void;
}

interface WxPrivacyArgs {
  success?: () => void;
  fail?: (err: unknown) => void;
}

interface WxApi {
  createRewardedVideoAd(opts: { adUnitId: string }): WxRewardedVideoAd;
  createInnerAudioContext(opts?: { useWebAudioImplement?: boolean }): WxInnerAudio;
  setInnerAudioOption(opts: {
    obeyMuteSwitch?: boolean;
    mixWithOther?: boolean;
    success?: () => void;
    fail?: (err: unknown) => void;
  }): void;
  getStorageSync(key: string): unknown;
  setStorageSync(key: string, value: unknown): void;
  createCanvas(): HTMLCanvasElement;
  createImage(): HTMLImageElement;
  getWindowInfo?: () => WxWindowInfo;
  getSystemInfoSync?: () => WxWindowInfo;
  getMenuButtonBoundingClientRect?: () => WxMenuRect;
  onTouchStart(cb: (e: WxTouchEvent) => void): void;
  onTouchEnd?: (cb: (e: WxTouchEvent) => void) => void;
  onHide?: (cb: () => void) => void;
  onShow?: (cb: () => void) => void;
  onAudioInterruptionEnd?: (cb: () => void) => void;
  reportEvent?: (eventId: string, data?: Record<string, string | number>) => void;
  requirePrivacyAuthorize?: (args: WxPrivacyArgs) => void;
}

declare const wx: WxApi;

interface GameGlobalHost {
  GameMain?: unknown;
  Ads?: unknown;
}

declare const GameGlobal: GameGlobalHost;
