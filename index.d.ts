// TypeScript definitions for Motefield v1.0.0
// Generated to mirror the public API documented in README.md.

export type MotefieldLayer = 'behind' | 'front';

export type MotefieldMotionMode = 'drift' | 'fall' | 'rise' | 'sway' | 'flow';

export type MotefieldEdge = 'wrap' | 'bounce' | 'none';

export type MotefieldPointerMode = 'none' | 'repel' | 'attract' | 'swirl';

export type MotefieldClickMode = 'none' | 'burst' | 'pulse';

export type MotefieldRange = number | [number, number];

/** Built-in shape names plus any name added with `Motefield.registerShape`. */
export type MotefieldShapeName =
  | 'circle' | 'ring' | 'square' | 'triangle' | 'diamond'
  | 'hexagon' | 'plus' | 'star' | 'spark' | 'heart' | (string & {});

export type MotefieldImageSource =
  | string | HTMLImageElement | HTMLCanvasElement | ImageBitmap;

/** A single entry in the `shapes` array. Strings are built-in / registered
 *  shape names or text glyphs. */
export interface MotefieldShapeSpec {
  shape?: MotefieldShapeName;
  glyph?: string;
  image?: MotefieldImageSource;
  svg?: string;
  path?: string;
  draw?: (ctx: CanvasRenderingContext2D, size: number, color: string) => void;
  viewBox?: number;
  weight?: number;
  scale?: number;
  colors?: string[];
  tint?: boolean;
  font?: string;
  fontWeight?: string | number;
}

export type MotefieldShape = MotefieldShapeName | MotefieldShapeSpec | ((ctx: CanvasRenderingContext2D, size: number, color: string) => void);

export interface MotefieldMotionOptions {
  mode?: MotefieldMotionMode;
  speed?: MotefieldRange;
  angle?: number | null;
  spread?: number;
  sway?: number;
  swayRate?: number;
  scale?: number;
  turn?: number;
  edge?: MotefieldEdge;
}

export interface MotefieldPointerOptions {
  mode?: MotefieldPointerMode;
  radius?: number;
  strength?: number;
}

export interface MotefieldClickOptions {
  mode?: MotefieldClickMode;
  count?: number;
  radius?: number;
  strength?: number;
}

export interface MotefieldRotationOptions {
  enable?: boolean;
  speed?: MotefieldRange;
}

export interface MotefieldTwinkleOptions {
  enable?: boolean;
  speed?: MotefieldRange;
  depth?: number;
}

export interface MotefieldLinksOptions {
  enable?: boolean;
  distance?: number;
  color?: string;
  opacity?: number;
  width?: number;
  maxLinks?: number;
}

export interface MotefieldAdaptiveOptions {
  enable?: boolean;
  budgetMs?: number;
  minRatio?: number;
}

export interface MotefieldOptions {
  layer?: MotefieldLayer;
  zIndex?: number | null;
  background?: string | null;

  count?: number;
  density?: number;
  maxCount?: number;

  shapes?: MotefieldShape[];
  colors?: string[];
  size?: MotefieldRange;
  opacity?: MotefieldRange;
  depth?: number;
  parallax?: number;
  rotation?: MotefieldRotationOptions;
  twinkle?: MotefieldTwinkleOptions;

  motion?: MotefieldMotionOptions;

  pointer?: MotefieldPointerOptions;
  click?: MotefieldClickOptions;
  drag?: number;

  links?: MotefieldLinksOptions;

  fps?: number;
  pixelRatio?: 'auto' | number;
  maxPixelRatio?: number;
  respectReducedMotion?: boolean;
  pauseWhenHidden?: boolean;
  adaptive?: MotefieldAdaptiveOptions;
}

/** A preset is a partial set of options applied before user options. */
export type MotefieldPreset = MotefieldOptions & { preset?: string };

export interface MotefieldStats {
  fps: number;
  particles: number;
  quality: number;
  frameMs: number;
  running: boolean;
}

/** Target accepted by `Motefield.create()` and `new Motefield()`. */
export type MotefieldTarget =
  | string
  | HTMLElement
  | HTMLCanvasElement
  | null
  | undefined;

export interface Motefield {
  readonly canvas: HTMLCanvasElement;
  readonly o: MotefieldOptions;
  readonly w: number;
  readonly h: number;
  readonly dpr: number;
  readonly maxCount: number;
  readonly total: number;
  readonly nReg: number;
  readonly baseCount: number;
  readonly specs: any[];
  readonly sprites: any[];
  readonly variants: number[][];
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly ex: Float32Array;
  readonly ey: Float32Array;
  readonly sz: Float32Array;
  readonly al: Float32Array;
  readonly rot: Float32Array;
  readonly vr: Float32Array;
  readonly ph: Float32Array;
  readonly tw: Float32Array;
  readonly dp: Float32Array;
  readonly spd: Float32Array;
  readonly ttl: Float32Array;
  readonly ttl0: Float32Array;
  readonly sp: Uint16Array;
  pause(): this;
  play(): this;
  toggle(): this;
  resize(): this;
  update(partial: Partial<MotefieldOptions>): this;
  burst(x: number, y: number, count?: number): this;
  pulse(x: number, y: number, radius?: number, strength?: number): this;
  getStats(): MotefieldStats;
  destroy(): void;
}

export interface MotefieldStatic {
  new (target?: MotefieldTarget, options?: MotefieldOptions): Motefield;
  create(target?: MotefieldTarget, options?: MotefieldOptions): Motefield;
  scan(root?: Document | Element): Motefield[];
  registerShape(name: string, drawFn: (ctx: CanvasRenderingContext2D, size: number, color: string) => void): void;
  registerPreset(name: string, options: MotefieldOptions): void;
  shapes(): string[];
  presets(): string[];
  readonly version: string;
}

declare const Motefield: MotefieldStatic;
export default Motefield;
export { Motefield };
