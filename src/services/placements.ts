/**
 * 流量主激励视频广告位。
 * 提审前在微信公众平台替换为真实 adunit-id，三个场景可以共用一个广告位。
 */
export const PLACEMENT = {
  empty_bottle: 'adunit-EMPTY-BOTTLE-PLACEHOLDER',
  undo: 'adunit-UNDO-PLACEHOLDER',
  stuck_help: 'adunit-STUCK-HELP-PLACEHOLDER'
} as const;

export type PlacementKey = keyof typeof PLACEMENT;
