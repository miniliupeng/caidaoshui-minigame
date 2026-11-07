/** 彩虹倒水 · 共享类型与设计常量 */

export const DESIGN_W = 750;
export const DESIGN_H = 1334;
export const CAPACITY = 4;
export const FREE_UNDOS = 3;
export const MAX_EXTRA_EMPTY = 2;
export const HISTORY_LIMIT = 80;
export const WOBBLE_DUR = 380;
export const APP_VERSION = '0.3.0';

export type GamePhase = 'home' | 'play' | 'clear' | 'stuck';

export type LevelStartReason = 'start' | 'continue' | 'next' | 'restart' | 'replay';

export interface Bottle {
  layers: number[];
}

export interface LevelConfig {
  name: string;
  bottles: number[][];
  emptyExtra: number;
}

export interface LayoutBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface UIButton {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  bg?: string;
  bg2?: string;
  border?: string;
  color?: string;
  sub?: string;
  subColor?: string;
  radius?: number;
  fontSize?: number;
  onClick: () => void;
}

export interface PourAnim {
  from: number;
  to: number;
  color: number;
  amt: number;
  t0: number;
  dur: number;
  fromStart: number[];
  toStart: number[];
}

export interface ShakeAnim {
  idx: number;
  t0: number;
  dur: number;
}

export interface TransitionAnim {
  kind: string;
  t0: number;
  dur: number;
  payload?: unknown;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  life: number;
  age: number;
  r: number;
  color: string;
  rot: number;
  vr: number;
}

export interface WindowSize {
  ww: number;
  wh: number;
  dpr: number;
}

export interface HitBottleOpts {
  excludeSelected?: boolean;
  strict?: boolean;
  preferValid?: boolean;
}

export interface SessionState {
  state: GamePhase;
  levelIndex: number;
  bottles: Bottle[];
  selected: number;
  history: Bottle[][];
  freeUndos: number;
  moves: number;
  message: string;
  messageUntil: number;
  buttons: UIButton[];
  layout: LayoutBox[];
  pouring: boolean;
  maxExtraEmpty: number;
  extraEmptyUsed: number;
  now: number;
  pourAnim: PourAnim | null;
  shake: ShakeAnim | null;
  pressId: string | null;
  pressUntil: number;
  particles: Particle[];
  clearT0: number;
  tipShown: boolean;
  tipDismissed: boolean;
  transition: TransitionAnim | null;
  /** 倒水后短时液面晃动起点；0 = 无晃动。只与 game.now 比较 */
  surfacePhase: number;
  homeEnterT0: number;
  _restartClicked?: boolean;
}
