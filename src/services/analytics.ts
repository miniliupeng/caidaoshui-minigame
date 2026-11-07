export type TrackValue = string | number | boolean;

export interface TrackRecord {
  event: string;
  props: Record<string, TrackValue>;
  ts: number;
}

const BUFFER_MAX = 80;
const buffer: TrackRecord[] = [];

/**
 * 埋点出口。
 * 微信后台配置同名事件后，wx.reportEvent 会收到扁平的 string/number 字段。
 * 未配置或本地预览时只进内存缓冲，并打 console，不阻断玩法。
 */
export function track(event: string, props: Record<string, TrackValue> = {}): void {
  const record: TrackRecord = { event, props: { ...props }, ts: Date.now() };
  buffer.push(record);
  if (buffer.length > BUFFER_MAX) buffer.shift();

  const flat: Record<string, string | number> = {};
  Object.keys(props).forEach((key) => {
    const value = props[key];
    if (typeof value === 'boolean') flat[key] = value ? 1 : 0;
    else flat[key] = value;
  });

  try {
    if (typeof wx !== 'undefined' && typeof wx.reportEvent === 'function') {
      wx.reportEvent(event, flat);
    }
  } catch (err) {
    console.warn('[track] reportEvent 失败', event, err);
  }
  console.log('[track]', event, flat);
}

export function getTrackedEvents(): TrackRecord[] {
  return buffer.slice();
}

export function clearTrackedEvents(): void {
  buffer.length = 0;
}
