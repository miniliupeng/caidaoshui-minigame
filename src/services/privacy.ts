import { readStorage, writeStorage } from '../platform/storage';
import { track } from './analytics';

export const PRIVACY_KEY = 'caidaoshui_privacy_v1';

export const PRIVACY_SUMMARY =
  '彩虹倒水只在本机保存关卡进度、隐私同意和背景音乐开关，不收集昵称、头像或好友关系。激励视频由微信播放。';

export function hasPrivacyConsent(): boolean {
  const raw = readStorage(PRIVACY_KEY);
  return raw === '1' || raw === 1 || raw === true;
}

export function acceptPrivacy(): void {
  if (hasPrivacyConsent()) return;
  writeStorage(PRIVACY_KEY, '1');
  track('privacy_accept', { version: 1 });
}
