/**
 * 激励视频。
 * 浏览器预览：confirm 模拟看完 / 取消。
 * 微信：wx.createRewardedVideoAd。广告失败或未看完不发奖。
 * 播放前尝试 wx.requirePrivacyAuthorize，与公众平台隐私指引对齐。
 */

import { track } from './analytics';
import { PLACEMENT, PlacementKey } from './placements';

interface RewardedAd {
  show(): Promise<void>;
  load(): Promise<void>;
  onClose(cb: (res: { isEnded?: boolean }) => void): void;
  offClose(cb: (res: { isEnded?: boolean }) => void): void;
  onError(cb: (err: unknown) => void): void;
  offError(cb: (err: unknown) => void): void;
}

const instances: Record<string, RewardedAd | undefined> = {};

export function isWeChatGame(): boolean {
  return typeof wx !== 'undefined' && typeof wx.createRewardedVideoAd === 'function';
}

function unitIdOf(placementKey: string): string {
  if (placementKey in PLACEMENT) return PLACEMENT[placementKey as PlacementKey];
  return PLACEMENT.empty_bottle;
}

function getWxAd(placementKey: string): RewardedAd | null {
  const unitId = unitIdOf(placementKey);
  const cached = instances[unitId];
  if (cached) return cached;
  try {
    const ad = wx.createRewardedVideoAd({ adUnitId: unitId });
    instances[unitId] = ad;
    return ad;
  } catch (err) {
    console.warn('[Ads] createRewardedVideoAd 失败', err);
    return null;
  }
}

function ensureWxPrivacy(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof wx === 'undefined' || typeof wx.requirePrivacyAuthorize !== 'function') {
      resolve(true);
      return;
    }
    try {
      wx.requirePrivacyAuthorize({
        success: () => resolve(true),
        fail: (err) => {
          console.warn('[Ads] 用户未同意隐私指引', err);
          resolve(false);
        }
      });
    } catch (err) {
      console.warn('[Ads] requirePrivacyAuthorize 异常', err);
      resolve(false);
    }
  });
}

function showMock(placementKey: string): Promise<boolean> {
  return new Promise((resolve) => {
    const labels: Record<string, string> = {
      empty_bottle: '看完广告可获得 +1 空杯',
      undo: '看完广告可撤销一步',
      stuck_help: '看完广告可获得帮助（+1 空杯）'
    };
    const msg = `${labels[placementKey] || '观看激励视频'}\n\n【本地 Mock】点「确定」= 看完并发放奖励；「取消」= 未看完`;
    const ok = typeof confirm === 'function' ? confirm(msg) : true;
    console.log('[Ads][mock]', placementKey, ok ? 'rewarded' : 'skipped');
    resolve(!!ok);
  });
}

function showWx(placementKey: string): Promise<boolean> {
  return new Promise((resolve) => {
    const ad = getWxAd(placementKey);
    if (!ad) {
      console.warn('[Ads] 无广告实例，不发奖', placementKey);
      resolve(false);
      return;
    }

    const onClose = (res: { isEnded?: boolean }) => {
      ad.offClose(onClose);
      ad.offError(onError);
      const got = !!(res && res.isEnded);
      console.log('[Ads][wx]', placementKey, got ? 'rewarded' : 'skipped');
      resolve(got);
    };
    const onError = (err: unknown) => {
      ad.offClose(onClose);
      ad.offError(onError);
      console.warn('[Ads][wx] 广告错误，不发奖', err);
      resolve(false);
    };

    ad.onClose(onClose);
    ad.onError(onError);
    ad.show().catch(() => {
      ad
        .load()
        .then(() => ad.show())
        .catch((err: unknown) => {
          ad.offClose(onClose);
          ad.offError(onError);
          console.warn('[Ads][wx] show 失败，不发奖', err);
          resolve(false);
        });
    });
  });
}

function reportResult(placementKey: string, rewarded: boolean): boolean {
  track('ad_result', { placement: placementKey, rewarded: rewarded ? 1 : 0 });
  return rewarded;
}

export function showRewarded(placementKey: string): Promise<boolean> {
  track('ad_request', { placement: placementKey });
  const run = isWeChatGame() ? showWx(placementKey) : showMock(placementKey);
  return ensureWxPrivacy().then((allowed) => {
    if (!allowed) return reportResult(placementKey, false);
    return run.then((ok) => reportResult(placementKey, ok));
  });
}

export function preload(placementKey: string): void {
  if (!isWeChatGame()) return;
  const ad = getWxAd(placementKey);
  if (ad && ad.load) {
    ad.load().catch(() => {
      /* 预加载失败不影响当局，下次 show 会再 load */
    });
  }
}

const Ads = { PLACEMENT, showRewarded, preload, isWeChatGame };

if (typeof GameGlobal !== 'undefined') GameGlobal.Ads = Ads;
else if (typeof window !== 'undefined') (window as unknown as { Ads: typeof Ads }).Ads = Ads;
else (globalThis as unknown as { Ads: typeof Ads }).Ads = Ads;
