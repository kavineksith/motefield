/*!
 * Motefield v1.0.0
 * A tiny, dependency-free, low-resource particle field for the 2D canvas.
 * Supports custom icons: emoji, text glyphs, images, SVG, Path2D paths and
 * your own draw functions.
 *
 * Copyright (c) 2026 Kavin Eksith
 * License: MIT (see LICENSE)
 */
(function (root, factory) {
  /* Universal Module Definition: works as <script>, CommonJS and AMD. */
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Motefield = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

/*!
 * Motefield v1.0.0 - ESM source
 * A tiny, dependency-free, low-resource particle field for the 2D canvas.
 *
 * This is the editable source. Run `node build.mjs` to produce the
 * UMD bundle `motefield.js` that works as <script>, CommonJS and AMD.
 *
 * Copyright (c) 2026 Kavin Eksith
 * License: MIT (see LICENSE)
 */


var VERSION = '1.0.0';
var TAU = Math.PI * 2;
var DEG = Math.PI / 180;
var BURST_CAP = 64;            // max simultaneous click-burst particles
var DEFAULT_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Segoe UI Symbol",sans-serif';

/* Motion mode ids (numbers compare faster than strings in the hot loop). */
var M_DRIFT = 0, M_FALL = 1, M_RISE = 2, M_SWAY = 3, M_FLOW = 4;
var MODE_IDS = { drift: M_DRIFT, fall: M_FALL, rise: M_RISE, sway: M_SWAY, flow: M_FLOW };

/* ========================================================================
 *  Small utilities
 * ====================================================================== */

function now() {
  return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
}

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

/** True for plain `{}` objects only (not arrays, DOM nodes, images...). */
function isPlain(v) {
  return v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype;
}

/**
 * Deep-merge `src` into `target` (mutates target). Plain objects are merged
 * recursively; arrays and everything else are replaced (arrays are copied).
 */
function merge(target, src) {
  for (var k in src) {
    if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
    var v = src[k];
    if (isPlain(v)) {
      if (!isPlain(target[k])) target[k] = {};
      merge(target[k], v);
    } else if (Array.isArray(v)) {
      target[k] = v.slice();
    } else if (v !== undefined) {
      target[k] = v;
    }
  }
  return target;
}

/** A number, or a [min, max] range -> random value inside the range. */
function pick(v) {
  return Array.isArray(v) ? v[0] + Math.random() * (v[1] - v[0]) : v;
}

function maxOf(v) { return Array.isArray(v) ? Math.max(v[0], v[1]) : v; }

function warn(msg) {
  if (typeof console !== 'undefined' && console.warn) console.warn('[Motefield] ' + msg);
}

/* ========================================================================
 *  Default options  (fresh object every call, so instances never share state)
 * ====================================================================== */

function defaults() {
  return {
    /* ---- layout / DOM ------------------------------------------------- */
    layer: 'behind',            // 'behind' | 'front'  (z-order relative to content)
    zIndex: null,               // override the computed z-index
    background: null,           // optional canvas fill colour (CSS colour)

    /* ---- amount ------------------------------------------------------- */
    count: 60,                  // number of particles
    density: 0,                 // if > 0: one particle per N CSS px^2 (overrides count)
    maxCount: 300,              // hard ceiling (also sizes the typed arrays)

    /* ---- appearance --------------------------------------------------- */
    shapes: ['circle'],         // see README "Shapes & custom icons"
    colors: ['#ffffff'],        // CSS colours; used by tinted shapes
    size: [3, 8],               // edge length in CSS px (number or [min,max])
    opacity: [0.35, 0.9],       // number or [min,max]
    depth: 0.5,                 // 0..1  far/near variation of size, speed, alpha
    parallax: 0,                // 0..~0.1  pointer-driven parallax (needs depth)
    rotation: { enable: false, speed: [-30, 30] },        // deg / second
    twinkle:  { enable: false, speed: [0.6, 1.6], depth: 0.6 },

    /* ---- movement ----------------------------------------------------- */
    motion: {
      mode: 'drift',            // 'drift' | 'fall' | 'rise' | 'sway' | 'flow'
      speed: [8, 28],           // px / second
      angle: null,              // degrees (0 = right, 90 = down); null = automatic
      spread: 20,               // +/- degrees of random variation (fall/rise/angle)
      sway: 18,                 // 'sway' mode: horizontal amplitude (px/s)
      swayRate: 1.2,            // 'sway' mode: oscillation speed (rad/s)
      scale: 0.003,             // 'flow' mode: field frequency (smaller = broader)
      turn: 1.5,                // 'flow' mode: how fast particles steer
      edge: 'wrap'              // 'wrap' | 'bounce' | 'none'
    },

    /* ---- interaction -------------------------------------------------- */
    pointer: { mode: 'none', radius: 120, strength: 1 },  // 'repel'|'attract'|'swirl'|'none'
    click:   { mode: 'none', count: 10, radius: 180, strength: 1 }, // 'burst'|'pulse'|'none'
    drag: 3,                    // how quickly interaction "kicks" fade (1/second)

    /* ---- link lines (optional, costs CPU) ------------------------------ */
    links: { enable: false, distance: 90, color: '#ffffff', opacity: 0.25, width: 1, maxLinks: 400 },

    /* ---- performance -------------------------------------------------- */
    fps: 60,                    // frame-rate cap (e.g. 30 for ambient effects)
    pixelRatio: 'auto',         // 'auto' or a number
    maxPixelRatio: 1.5,         // cap used by 'auto'
    respectReducedMotion: true, // draw one still frame if the OS asks for less motion
    pauseWhenHidden: true,      // stop when tab is hidden or canvas off-screen
    adaptive: { enable: true, budgetMs: 3, minRatio: 0.35 }
  };
}

/* ========================================================================
 *  Presets:  Motefield.create('#el', { preset: 'snow' })
 *  Anything else you pass in options overrides the preset.
 * ====================================================================== */

var PRESETS = {
  snow: {
    shapes: ['circle'], colors: ['#ffffff'], density: 9000, size: [2, 6], opacity: [0.4, 0.95],
    motion: { mode: 'sway', speed: [14, 38], sway: 16, spread: 12 }, depth: 0.7
  },
  embers: {
    shapes: ['circle'], colors: ['#ff5e1a', '#ff9a3c', '#ffd27a'], density: 14000, size: [1.5, 4.5],
    opacity: [0.5, 1], motion: { mode: 'rise', speed: [20, 60], spread: 25 },
    twinkle: { enable: true, speed: [1, 3], depth: 0.7 }
  },
  fireflies: {
    shapes: ['circle'], colors: ['#f6ff8a', '#b6ff6a'], density: 22000, size: [3, 7], opacity: [0.5, 1],
    motion: { mode: 'flow', speed: [6, 18], scale: 0.002, turn: 1 },
    twinkle: { enable: true, speed: [0.5, 1.4], depth: 0.9 }
  },
  confetti: {
    shapes: ['square', 'triangle', 'circle', 'star'],
    colors: ['#ff4d6d', '#ffd166', '#06d6a0', '#4cc9f0', '#b980f7'],
    density: 20000, size: [7, 13], opacity: [0.8, 1],
    motion: { mode: 'fall', speed: [40, 90], spread: 15 },
    rotation: { enable: true, speed: [-180, 180] }
  },
  bubbles: {
    shapes: ['ring'], colors: ['#bfe9ff', '#ffffff'], density: 26000, size: [8, 28], opacity: [0.25, 0.7],
    motion: { mode: 'rise', speed: [12, 36], spread: 10 }, depth: 0.8
  }
};

/* ========================================================================
 *  Built-in shapes.
 *  Signature: fn(ctx, size, color)
 *  `ctx` is translated so (0,0) is the CENTRE of a `size` x `size` box and
 *  fillStyle/strokeStyle are already set to `color`. Draw inside +-size/2.
 *  Your own shapes (Motefield.registerShape) use the exact same signature.
 * ====================================================================== */

function poly(c, sides, r, rot) {
  c.beginPath();
  for (var i = 0; i < sides; i++) {
    var a = rot + (i / sides) * TAU;
    if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
  c.fill();
}

var SHAPES = {
  circle:   function (c, s) { c.beginPath(); c.arc(0, 0, s * 0.45, 0, TAU); c.fill(); },
  ring:     function (c, s) { c.lineWidth = Math.max(1, s * 0.08); c.beginPath(); c.arc(0, 0, s * 0.4, 0, TAU); c.stroke(); },
  square:   function (c, s) { var h = s * 0.36; c.fillRect(-h, -h, h * 2, h * 2); },
  triangle: function (c, s) { poly(c, 3, s * 0.5, -Math.PI / 2); },
  diamond:  function (c, s) { poly(c, 4, s * 0.5, -Math.PI / 2); },
  hexagon:  function (c, s) { poly(c, 6, s * 0.46, 0); },
  plus:     function (c, s) { var l = s * 0.45, t = s * 0.14; c.fillRect(-l, -t, l * 2, t * 2); c.fillRect(-t, -l, t * 2, l * 2); },
  star: function (c, s) {
    var o = s * 0.5, n = s * 0.21;
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? n : o, a = -Math.PI / 2 + i * Math.PI / 5;
      if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath(); c.fill();
  },
  spark: function (c, s) {                      // four-point concave sparkle
    var r = s * 0.5;
    c.beginPath();
    c.moveTo(0, -r); c.quadraticCurveTo(0, 0, r, 0);
    c.quadraticCurveTo(0, 0, 0, r); c.quadraticCurveTo(0, 0, -r, 0);
    c.quadraticCurveTo(0, 0, 0, -r); c.fill();
  },
  heart: function (c, s) {
    var r = s * 0.45;
    c.beginPath();
    c.moveTo(0, r * 0.9);
    c.bezierCurveTo(-r * 1.3, r * 0.1, -r * 0.9, -r * 0.9, 0, -r * 0.35);
    c.bezierCurveTo(r * 0.9, -r * 0.9, r * 1.3, r * 0.1, 0, r * 0.9);
    c.fill();
  }
};

/** User-registered shapes live here (see Motefield.registerShape). */
var REGISTRY = {};

/* ========================================================================
 *  Shape-spec normalisation
 *
 *  Accepted forms in `options.shapes` (mix freely, add `weight` to bias):
 *    'circle'                          built-in or registered name
 *    '❄'  /  'Hi'                      any other string = text glyph / emoji
 *    { glyph:'🔥', font, weight }      glyph with options
 *    { image:'url' | <img> | canvas }  bitmap
 *    { svg:'<svg ...>...</svg>' }      inline SVG markup
 *    { path:'M0 0 ...', viewBox:24 }   SVG path data (Path2D)
 *    { draw:function(ctx,size,color){} }  your own renderer
 *    function(ctx,size,color){}        shorthand for { draw: fn }
 *  Common keys: weight, scale, colors (override), tint (bool).
 * ====================================================================== */

var EMOJI_RE = null;
try { EMOJI_RE = new RegExp('\\p{Extended_Pictographic}', 'u'); } catch (e) { /* old engine */ }

function isBitmapSource(s) {
  return !!s && ((s.nodeType === 1) ||
    (typeof ImageBitmap !== 'undefined' && s instanceof ImageBitmap) ||
    (typeof OffscreenCanvas !== 'undefined' && s instanceof OffscreenCanvas));
}

function normalizeSpec(input) {
  var spec = { kind: 'shape', name: 'circle', weight: 1, scale: 1, colors: null, tint: true };
  var s = input;

  if (typeof s === 'string') {
    if (SHAPES[s] || REGISTRY[s]) s = { shape: s };
    else s = { glyph: s };
  } else if (typeof s === 'function') {
    s = { draw: s };
  } else if (isBitmapSource(s)) {
    s = { image: s };
  }
  if (!s || typeof s !== 'object') { warn('Invalid shape spec ignored: ' + String(input)); return null; }

  if (s.weight != null) spec.weight = Math.max(0.0001, +s.weight || 1);
  if (s.scale != null) spec.scale = +s.scale || 1;
  if (Array.isArray(s.colors) && s.colors.length) spec.colors = s.colors.slice();

  if (s.glyph != null) {
    spec.kind = 'glyph';
    spec.glyph = String(s.glyph);
    spec.font = s.font || DEFAULT_FONT;
    spec.fontWeight = s.fontWeight || 'normal';
    /* Emoji keep their own colours; plain symbols/letters get tinted. */
    spec.tint = s.tint != null ? !!s.tint : !(EMOJI_RE && EMOJI_RE.test(spec.glyph));
  } else if (s.image != null || s.svg != null) {
    spec.kind = 'image';
    spec.source = s.image != null
      ? s.image
      : 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.svg);
    spec.tint = !!s.tint;                       // images keep original colours by default
  } else if (s.path != null) {
    spec.kind = 'path';
    spec.path = String(s.path);
    spec.viewBox = +s.viewBox || 24;
  } else if (typeof s.draw === 'function') {
    spec.kind = 'draw';
    spec.draw = s.draw;
  } else if (s.shape != null) {
    var name = String(s.shape);
    var reg = REGISTRY[name];
    if (reg) { spec.kind = 'draw'; spec.draw = reg; }
    else if (SHAPES[name]) { spec.kind = 'shape'; spec.name = name; }
    else { warn('Unknown shape "' + name + '", using circle.'); }
  }
  return spec;
}

/* ========================================================================
 *  Target / DOM helpers
 * ====================================================================== */

function resolveTarget(t) {
  if (!t) return document.body;
  if (typeof t === 'string') {
    var el = document.querySelector(t);
    if (!el) throw new Error('Motefield: target not found: ' + t);
    return el;
  }
  if (t.nodeType === 1) return t;
  throw new Error('Motefield: target must be a selector, an element or a canvas.');
}

/* ========================================================================
 *  The Motefield class
 * ====================================================================== */

/**
 * @param {string|Element|HTMLCanvasElement} [target]
 *        Selector or element to put the field in. A <canvas> is used as-is.
 *        Omit it (or pass document.body) for a full-viewport background.
 * @param {object} [options] See README for every option.
 */
function Motefield(target, options) {
  if (!(this instanceof Motefield)) return new Motefield(target, options);
  if (isPlain(target) && options === undefined) { options = target; target = null; }

  /* ---- options = defaults <- preset <- user ---- */
  var o = defaults();
  if (options && options.preset) {
    if (PRESETS[options.preset]) merge(o, PRESETS[options.preset]);
    else warn('Unknown preset "' + options.preset + '".');
  }
  if (options) merge(o, options);
  this.o = o;

  this._destroyed = false;
  this._paused = false;
  this._running = false;
  this._inView = true;
  this._reduced = false;
  this._raf = 0;
  this._last = 0;
  this._t = 0;                       // simulation time in seconds
  this._quality = 1;                 // adaptive multiplier (0..1)
  this._ema = 0;                     // moving average of per-frame JS cost
  this._frames = 0;
  this._adCount = 0;
  this._fpsCount = 0; this._fpsClock = 0; this._fps = 0;
  this._pointer = { x: 0, y: 0, active: false };
  this._par = { x: 0, y: 0, init: false };
  this._rect = null; this._rectDirty = true;
  this._restore = [];                // [element, cssProperty, oldValue] to undo on destroy
  this._boundFrame = this._frame.bind(this);

  this._mount(resolveTarget(target));
  this.ctx = this.canvas.getContext('2d');
  if (!this.ctx) throw new Error('Motefield: 2D canvas is not supported here.');

  this._measure(true);
  this._allocate();
  this._rebuild();
  this._observe();
  this._bind();
  this._render();                    // first (still) frame, even if never animated
  this._sync();
}

var P = Motefield.prototype;

/* ---------------------------------------------------------------------
 *  DOM setup
 * ------------------------------------------------------------------- */

P._setStyle = function (el, prop, value) {
  this._restore.push([el, prop, el.style[prop]]);
  el.style[prop] = value;
};

P._mount = function (host) {
  var o = this.o;
  this._host = host;
  if (host.tagName === 'CANVAS') {
    this.canvas = host;
    this._ownCanvas = false;
    return;
  }
  var canvas = document.createElement('canvas');
  var fullscreen = host === document.body || host === document.documentElement;
  var s = canvas.style;
  s.position = fullscreen ? 'fixed' : 'absolute';
  s.left = '0'; s.top = '0';
  s.width = '100%'; s.height = '100%';
  s.display = 'block';
  s.pointerEvents = 'none';          // never steals clicks from your content
  s.zIndex = String(o.zIndex != null ? o.zIndex : (o.layer === 'front' ? 1 : -1));
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('role', 'presentation');

  if (!fullscreen) {
    var cs = getComputedStyle(host);
    if (cs.position === 'static') this._setStyle(host, 'position', 'relative');
    /* isolation lets z-index:-1 sit above the host background but below its content */
    if (o.layer === 'behind') this._setStyle(host, 'isolation', 'isolate');
  }
  host.insertBefore(canvas, host.firstChild);
  this.canvas = canvas;
  this._ownCanvas = true;
};

P._measure = function (force) {
  var c = this.canvas, o = this.o;
  var w = c.clientWidth || c.width || 300;
  var h = c.clientHeight || c.height || 150;
  var dpr = o.pixelRatio === 'auto'
    ? Math.min(o.maxPixelRatio, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1))
    : Math.max(0.5, +o.pixelRatio || 1);
  var pw = Math.max(1, Math.round(w * dpr)), ph = Math.max(1, Math.round(h * dpr));
  var dprChanged = this.dpr !== dpr;
  if (force || c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
  var oldW = this.w, oldH = this.h;
  this.w = w; this.h = h; this.dpr = dpr;
  return { dprChanged: dprChanged, oldW: oldW, oldH: oldH };
};

/* ---------------------------------------------------------------------
 *  Memory: allocate everything once.
 * ------------------------------------------------------------------- */

P._allocate = function () {
  var o = this.o;
  this.maxCount = Math.max(1, Math.max(o.maxCount | 0, o.count | 0));
  var n = this.total = this.maxCount + BURST_CAP;   // regular slots, then burst slots
  this.x = new Float32Array(n);  this.y = new Float32Array(n);
  this.vx = new Float32Array(n); this.vy = new Float32Array(n);   // base velocity
  this.ex = new Float32Array(n); this.ey = new Float32Array(n);   // interaction "kick"
  this.sz = new Float32Array(n); this.al = new Float32Array(n);
  this.rot = new Float32Array(n); this.vr = new Float32Array(n);
  this.ph = new Float32Array(n); this.tw = new Float32Array(n);
  this.dp = new Float32Array(n); this.spd = new Float32Array(n);
  this.ttl = new Float32Array(n); this.ttl0 = new Float32Array(n); // burst lifetimes
  this.sp = new Uint16Array(n);                                    // sprite index
  this.nReg = 0;
  this.grid = null;                                                // lazily built for links
};

/* ---------------------------------------------------------------------
 *  Sprites
 * ------------------------------------------------------------------- */

/** (Re)build specs, sprite atlas and particles. Called at start and on update(). */
P._rebuild = function () {
  var o = this.o, i;
  var list = Array.isArray(o.shapes) && o.shapes.length ? o.shapes : ['circle'];
  this.specs = [];
  for (i = 0; i < list.length; i++) {
    var sp = normalizeSpec(list[i]);
    if (sp) this.specs.push(sp);
  }
  if (!this.specs.length) this.specs.push(normalizeSpec('circle'));

  this.cumW = []; this.totalW = 0;
  for (i = 0; i < this.specs.length; i++) {
    this.totalW += this.specs[i].weight;
    this.cumW.push(this.totalW);
  }
  this._buildSprites();
  for (i = 0; i < this.specs.length; i++) this._loadImage(this.specs[i]);

  this._computeBase();
  this.nReg = 0;
  for (i = this.maxCount; i < this.total; i++) this.ttl[i] = 0;
  this._applyCount();
};

P._spriteRes = function () {
  return clamp(Math.ceil(maxOf(this.o.size) * this.dpr), 16, 256);
};

/** Build `this.sprites` and `this.variants` (spec index -> sprite indices). */
P._buildSprites = function () {
  var res = this._spriteRes(), baseColors = this.o.colors && this.o.colors.length ? this.o.colors : ['#fff'];
  this.sprites = []; this.variants = [];
  for (var s = 0; s < this.specs.length; s++) {
    var spec = this.specs[s];
    var colors = spec.colors || baseColors;
    var use = spec.tint ? colors : [colors[0]];       // untinted -> a single sprite
    var ids = [];
    for (var c = 0; c < use.length; c++) {
      ids.push(this.sprites.length);
      this.sprites.push(this._makeSprite(spec, use[c], res));
    }
    this.variants.push(ids);
  }
};

/** Render one icon to a res x res canvas. Returns {c, r} or null (not ready). */
P._makeSprite = function (spec, color, res) {
  var cv = document.createElement('canvas');
  cv.width = cv.height = res;
  var c = cv.getContext('2d');
  c.translate(res / 2, res / 2);
  c.fillStyle = color; c.strokeStyle = color;
  c.lineJoin = 'round'; c.lineCap = 'round';

  switch (spec.kind) {
    case 'shape':
      SHAPES[spec.name](c, res, color);
      break;

    case 'draw':
      try { c.save(); spec.draw(c, res, color); c.restore(); }
      catch (e) { warn('Custom draw function threw: ' + e.message); }
      break;

    case 'path': {
      var k = (res * 0.9) / spec.viewBox;
      c.scale(k, k); c.translate(-spec.viewBox / 2, -spec.viewBox / 2);
      try { c.fill(new Path2D(spec.path)); } catch (e2) { warn('Invalid SVG path data.'); }
      break;
    }

    case 'glyph': {
      var px = res * 0.8;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = spec.fontWeight + ' ' + px + 'px ' + spec.font;
      var w = c.measureText(spec.glyph).width;
      if (w > res * 0.94) { px *= (res * 0.94) / w; c.font = spec.fontWeight + ' ' + px + 'px ' + spec.font; }
      c.fillText(spec.glyph, 0, px * 0.04);
      break;
    }

    case 'image': {
      var img = spec.el;
      if (!img || !spec.ready) return null;          // placeholder until it loads
      c.setTransform(1, 0, 0, 1, 0, 0);
      var iw = img.naturalWidth || img.width || res, ih = img.naturalHeight || img.height || res;
      var f = Math.min(res * 0.94 / iw, res * 0.94 / ih);
      c.drawImage(img, (res - iw * f) / 2, (res - ih * f) / 2, iw * f, ih * f);
      if (spec.tint) {
        c.globalCompositeOperation = 'source-in';
        c.fillStyle = color; c.fillRect(0, 0, res, res);
      }
      break;
    }
  }
  return { c: cv, r: res };
};

/** Start loading an image spec (once). When ready, sprites are rebuilt. */
P._loadImage = function (spec) {
  if (spec.kind !== 'image' || spec.el || spec.failed) return;
  var self = this, src = spec.source;

  function ok() { spec.ready = true; if (!self._destroyed) { self._buildSprites(); self._render(); } }
  function fail() { spec.failed = true; spec.kind = 'shape'; spec.name = 'circle'; warn('Could not load image shape.'); if (!self._destroyed) { self._buildSprites(); self._render(); } }

  if (typeof src === 'string') {
    var img = new Image();
    img.decoding = 'async';
    spec.el = img;
    img.onload = ok; img.onerror = fail;
    img.src = src;
  } else {
    spec.el = src;
    if (src.nodeName === 'IMG' && !(src.complete && src.naturalWidth)) {
      src.addEventListener('load', ok, { once: true });
      src.addEventListener('error', fail, { once: true });
    } else { spec.ready = true; this._buildSprites(); }
  }
};

/* ---------------------------------------------------------------------
 *  Particle population
 * ------------------------------------------------------------------- */

P._computeBase = function () {
  var o = this.o;
  var n = o.density > 0 ? Math.round((this.w * this.h) / o.density) : (o.count | 0);
  this.baseCount = clamp(n, 0, this.maxCount);
};

/** Grow/shrink the live particle count to baseCount * quality. */
P._applyCount = function () {
  var target = Math.round(this.baseCount * this._quality);
  if (this.baseCount > 0) target = Math.max(1, target);
  for (var i = this.nReg; i < target; i++) this._init(i);
  this.nReg = target;
};

/** Give slot `i` brand-new random properties (and a random position). */
P._init = function (i) {
  var o = this.o, m = o.motion;

  /* weighted pick of a shape, then a random colour variant of it */
  var r = Math.random() * this.totalW, s = 0;
  while (s < this.cumW.length - 1 && r > this.cumW[s]) s++;
  var ids = this.variants[s];
  this.sp[i] = ids[(Math.random() * ids.length) | 0];

  var dp = Math.random();
  var f = 1 - o.depth * (1 - dp) * 0.7;         // far particles: smaller, slower, fainter
  this.dp[i] = dp;
  this.sz[i] = pick(o.size) * f * this.specs[s].scale;
  this.al[i] = pick(o.opacity) * (1 - o.depth * (1 - dp) * 0.5);

  this.x[i] = Math.random() * this.w;
  this.y[i] = Math.random() * this.h;

  var mode = MODE_IDS[m.mode]; if (mode === undefined) mode = M_DRIFT;
  var base = typeof m.angle === 'number' ? m.angle
    : (mode === M_FALL || mode === M_SWAY) ? 90
    : mode === M_RISE ? 270 : null;
  var a = base === null ? Math.random() * TAU : (base + (Math.random() * 2 - 1) * m.spread) * DEG;
  var speed = pick(m.speed) * f;
  this.spd[i] = speed;
  this.vx[i] = Math.cos(a) * speed;
  this.vy[i] = Math.sin(a) * speed;
  this.ex[i] = 0; this.ey[i] = 0;

  this.rot[i] = o.rotation.enable ? Math.random() * TAU : 0;
  this.vr[i] = o.rotation.enable ? pick(o.rotation.speed) * DEG : 0;
  this.ph[i] = Math.random() * TAU;
  this.tw[i] = o.twinkle.enable ? pick(o.twinkle.speed) : 0;
  this.ttl[i] = 0; this.ttl0[i] = 0;
};

/* ---------------------------------------------------------------------
 *  Simulation step (hot loop: no allocation, locals cached)
 * ------------------------------------------------------------------- */

P._update = function (dt) {
  var o = this.o, m = o.motion;
  var x = this.x, y = this.y, vx = this.vx, vy = this.vy, ex = this.ex, ey = this.ey;
  var rot = this.rot, vr = this.vr, ph = this.ph, sz = this.sz, spd = this.spd, ttl = this.ttl;
  var W = this.w, H = this.h, t = (this._t += dt);
  var mode = MODE_IDS[m.mode]; if (mode === undefined) mode = M_DRIFT;
  var edge = m.edge, wrap = edge === 'wrap', bounce = edge === 'bounce';
  var rotate = o.rotation.enable;

  /* per-frame constants for specific modes */
  var swayAmp = m.sway, swayRate = m.swayRate;
  var fs = m.scale, turn = Math.min(1, m.turn * dt), t1 = t * 0.35, t2 = t * 0.27;
  var decay = 1 - Math.min(1, o.drag * dt);

  /* pointer interaction constants */
  var pt = this._pointer, pm = o.pointer.mode;
  var usePointer = pt.active && pm !== 'none';
  var px = pt.x, py = pt.y, pr = o.pointer.radius, pr2 = pr * pr;
  var pk = 900 * o.pointer.strength * dt;
  var pRepel = pm === 'repel', pAttract = pm === 'attract', pSwirl = pm === 'swirl';

  var cap = this.maxCount, n = this.nReg, total = this.total, i, from, to, pass;

  for (pass = 0; pass < 2; pass++) {
    from = pass ? cap : 0;
    to = pass ? total : n;
    for (i = from; i < to; i++) {
      if (pass) {                               // burst slot: skip dead, age live
        if (ttl[i] <= 0) continue;
        ttl[i] -= dt;
        if (ttl[i] <= 0) { ttl[i] = 0; continue; }
      }

      var bvx = vx[i], bvy = vy[i];

      if (mode === M_FLOW && !pass) {
        /* cheap analytic "noise": two trig calls steer each particle */
        var a = (Math.sin(x[i] * fs + t1) + Math.cos(y[i] * fs * 1.17 - t2)) * 1.5707963;
        bvx += (Math.cos(a) * spd[i] - bvx) * turn;
        bvy += (Math.sin(a) * spd[i] - bvy) * turn;
        vx[i] = bvx; vy[i] = bvy;
      } else if (mode === M_SWAY && !pass) {
        bvx += Math.sin(t * swayRate + ph[i]) * swayAmp;
      }

      if (usePointer && !pass) {
        var dx = x[i] - px, dy = y[i] - py, d2 = dx * dx + dy * dy;
        if (d2 < pr2 && d2 > 0.01) {
          var d = Math.sqrt(d2), fall = 1 - d / pr;
          var k = fall * fall * pk / d;
          if (pRepel) { ex[i] += dx * k; ey[i] += dy * k; }
          else if (pAttract) {
            var soft = Math.min(1, d / (pr * 0.25));      // avoid collapsing onto the cursor
            ex[i] -= dx * k * soft; ey[i] -= dy * k * soft;
          } else if (pSwirl) { ex[i] += -dy * k; ey[i] += dx * k; }
        }
      }

      x[i] += (bvx + ex[i]) * dt;
      y[i] += (bvy + ey[i]) * dt;
      ex[i] *= decay; ey[i] *= decay;
      if (rotate) rot[i] += vr[i] * dt;

      if (!pass) {                              // edge handling for regular particles
        var mg = sz[i] * 0.5 + 2;
        if (wrap) {
          if (x[i] < -mg) x[i] = W + mg; else if (x[i] > W + mg) x[i] = -mg;
          if (y[i] < -mg) y[i] = H + mg; else if (y[i] > H + mg) y[i] = -mg;
        } else if (bounce) {
          if ((x[i] < mg && (vx[i] + ex[i]) < 0) || (x[i] > W - mg && (vx[i] + ex[i]) > 0)) { vx[i] = -vx[i]; ex[i] = -ex[i]; }
          if ((y[i] < mg && (vy[i] + ey[i]) < 0) || (y[i] > H - mg && (vy[i] + ey[i]) > 0)) { vy[i] = -vy[i]; ey[i] = -ey[i]; }
        }
      }
    }
  }

  /* parallax follows the pointer smoothly (or eases back to centre) */
  if (o.parallax > 0) {
    var par = this._par, tx = usePointer || pt.active ? pt.x : W / 2, ty = usePointer || pt.active ? pt.y : H / 2;
    if (!par.init) { par.x = W / 2; par.y = H / 2; par.init = true; }
    var e = Math.min(1, dt * 3);
    par.x += (tx - par.x) * e; par.y += (ty - par.y) * e;
  }
};

/* ---------------------------------------------------------------------
 *  Rendering
 * ------------------------------------------------------------------- */

P._render = function () {
  var ctx = this.ctx, o = this.o, dpr = this.dpr, W = this.w, H = this.h;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  if (o.background) { ctx.fillStyle = o.background; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); }

  if (o.links.enable) this._drawLinks();

  var sprites = this.sprites, sp = this.sp, x = this.x, y = this.y, sz = this.sz, al = this.al;
  var rot = this.rot, ph = this.ph, tw = this.tw, dp = this.dp, ttl = this.ttl, ttl0 = this.ttl0;
  var rotate = o.rotation.enable, twinkle = o.twinkle.enable, tdepth = o.twinkle.depth, t = this._t;
  var par = o.parallax > 0 && !o.links.enable;           // parallax is skipped when links are on
  var ox = 0, oy = 0, pf = o.parallax;
  if (par) { ox = (this._par.init ? this._par.x : W / 2) - W / 2; oy = (this._par.init ? this._par.y : H / 2) - H / 2; }
  var cap = this.maxCount, n = this.nReg, total = this.total, i, from, to, pass;

  for (pass = 0; pass < 2; pass++) {
    from = pass ? cap : 0;
    to = pass ? total : n;
    for (i = from; i < to; i++) {
      var a = al[i];
      if (pass) {
        if (ttl[i] <= 0) continue;
        var life = ttl[i] / (ttl0[i] * 0.6);          // fade over the last 60% of life
        if (life < 1) a *= life;
      }
      if (twinkle && tw[i]) a *= 1 - tdepth * (0.5 + 0.5 * Math.sin(t * tw[i] + ph[i]));
      if (a < 0.004) continue;

      var spr = sprites[sp[i]];
      if (!spr) continue;                              // image still loading

      var k = (sz[i] * dpr) / spr.r;
      var px = x[i], py = y[i];
      if (par) { px += ox * pf * dp[i] * -1; py += oy * pf * dp[i] * -1; }
      px *= dpr; py *= dpr;

      ctx.globalAlpha = a > 1 ? 1 : a;
      if (rotate) {
        var c = Math.cos(rot[i]) * k, s = Math.sin(rot[i]) * k;
        ctx.setTransform(c, s, -s, c, px, py);
      } else {
        ctx.setTransform(k, 0, 0, k, px, py);
      }
      ctx.drawImage(spr.c, -spr.r / 2, -spr.r / 2);
    }
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

/* ---------------------------------------------------------------------
 *  Link lines (optional). Uniform grid => near-linear neighbour search.
 *  Lines are batched into 3 alpha buckets = 3 stroke() calls per frame.
 * ------------------------------------------------------------------- */

var NX = [1, -1, 0, 1], NY = [0, 1, 1, 1];   // forward neighbour cells (each pair visited once)

P._drawLinks = function () {
  var L = this.o.links, D = L.distance, D2 = D * D, n = this.nReg;
  if (n < 2 || D <= 0) return;
  var cols = Math.ceil(this.w / D) + 1, rows = Math.ceil(this.h / D) + 1, cells = cols * rows;
  var g = this.grid;
  if (!g || g.cells < cells || g.next.length < this.total) {
    g = this.grid = {
      cells: cells,
      head: new Int32Array(cells),
      next: new Int32Array(this.total),
      seg: [new Float32Array(L.maxLinks * 4), new Float32Array(L.maxLinks * 4), new Float32Array(L.maxLinks * 4)]
    };
  }
  var head = g.head, next = g.next, x = this.x, y = this.y, i, j, c;
  head.fill(-1, 0, cells);
  for (i = 0; i < n; i++) {
    var cx = Math.min(cols - 1, Math.max(0, (x[i] / D) | 0)), cy = Math.min(rows - 1, Math.max(0, (y[i] / D) | 0));
    c = cy * cols + cx; next[i] = head[c]; head[c] = i;
  }

  var cnt = [0, 0, 0], total = 0, max = Math.min(L.maxLinks, g.seg[0].length / 4), seg = g.seg;
  function test(a, b) {
    var dx = x[a] - x[b], dy = y[a] - y[b], d2 = dx * dx + dy * dy;
    if (d2 >= D2) return;
    var bk = d2 < D2 * 0.33 ? 0 : (d2 < D2 * 0.66 ? 1 : 2), arr = seg[bk], p = cnt[bk] * 4;
    if (p + 4 > arr.length) return;
    arr[p] = x[a]; arr[p + 1] = y[a]; arr[p + 2] = x[b]; arr[p + 3] = y[b];
    cnt[bk]++; total++;
  }

  outer:
  for (var gy = 0; gy < rows; gy++) {
    for (var gx = 0; gx < cols; gx++) {
      c = gy * cols + gx;
      for (i = head[c]; i !== -1; i = next[i]) {
        for (j = next[i]; j !== -1; j = next[j]) test(i, j);
        for (var q = 0; q < 4; q++) {
          var nx = gx + NX[q], ny = gy + NY[q];
          if (nx < 0 || nx >= cols || ny >= rows) continue;
          for (j = head[ny * cols + nx]; j !== -1; j = next[j]) test(i, j);
        }
        if (total >= max) break outer;
      }
    }
  }

  var ctx = this.ctx, alphas = [1, 0.6, 0.28];
  ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  ctx.strokeStyle = L.color; ctx.lineWidth = L.width; ctx.lineCap = 'round';
  for (var b = 0; b < 3; b++) {
    if (!cnt[b]) continue;
    ctx.globalAlpha = L.opacity * alphas[b];
    ctx.beginPath();
    var arr = seg[b];
    for (var s = 0, e = cnt[b] * 4; s < e; s += 4) { ctx.moveTo(arr[s], arr[s + 1]); ctx.lineTo(arr[s + 2], arr[s + 3]); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

/* ---------------------------------------------------------------------
 *  Main loop
 * ------------------------------------------------------------------- */

P._frame = function (ts) {
  if (!this._running) return;
  this._raf = requestAnimationFrame(this._boundFrame);

  var interval = 1000 / Math.max(1, this.o.fps);
  var elapsed = ts - this._last;
  if (elapsed < interval - 1) return;               // frame-rate cap: skip this tick
  this._last = ts;
  var dt = Math.min(elapsed, 50) / 1000;            // clamp so a stall never teleports particles

  var t0 = now();
  this._update(dt);
  this._render();
  var work = now() - t0;

  /* stats */
  this._fpsCount++;
  if (ts - this._fpsClock >= 1000) { this._fps = Math.round(this._fpsCount * 1000 / (ts - this._fpsClock)); this._fpsCount = 0; this._fpsClock = ts; }

  /* adaptive quality (ignores the first ~1.5s while the JIT warms up) */
  this._ema += (work - this._ema) * 0.1;
  var ad = this.o.adaptive;
  if (ad.enable && ++this._frames > 90 && ++this._adCount >= 45) {
    this._adCount = 0;
    if (this._ema > ad.budgetMs && this._quality > ad.minRatio) {
      this._quality = Math.max(ad.minRatio, this._quality * 0.85); this._applyCount();
    } else if (this._ema < ad.budgetMs * 0.45 && this._quality < 1) {
      this._quality = Math.min(1, this._quality * 1.08 + 0.01); this._applyCount();
    }
  }
};

/** Start or stop the loop depending on every "should we animate?" condition. */
P._sync = function () {
  if (this._destroyed) return;
  var o = this.o;
  var hidden = o.pauseWhenHidden && (document.hidden || !this._inView);
  var reduced = o.respectReducedMotion && this._reduced;
  var should = !this._paused && !hidden && !reduced;

  if (should && !this._running) {
    this._running = true;
    this._last = now(); this._fpsClock = this._last; this._fpsCount = 0;
    this._raf = requestAnimationFrame(this._boundFrame);
  } else if (!should && this._running) {
    this._running = false;
    cancelAnimationFrame(this._raf); this._raf = 0;
  }
};

/* ---------------------------------------------------------------------
 *  Observers & events
 * ------------------------------------------------------------------- */

P._observe = function () {
  var self = this, rafId = 0;

  if (typeof ResizeObserver !== 'undefined') {
    this._ro = new ResizeObserver(function () {
      if (rafId) return;                               // coalesce bursts into one per frame
      rafId = requestAnimationFrame(function () { rafId = 0; self.resize(); });
    });
    this._ro.observe(this.canvas);
  } else {
    this._onWinResize = function () { self.resize(); };
    window.addEventListener('resize', this._onWinResize);
  }

  if (typeof IntersectionObserver !== 'undefined') {
    this._io = new IntersectionObserver(function (entries) {
      self._inView = entries[entries.length - 1].isIntersecting;
      self._rectDirty = true;
      self._sync();
    });
    this._io.observe(this.canvas);
  }

  this._onVis = function () { self._sync(); };
  document.addEventListener('visibilitychange', this._onVis);

  if (window.matchMedia) {
    this._mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    this._reduced = this._mql.matches;
    this._onMql = function (e) { self._reduced = e.matches; self._sync(); self._render(); };
    if (this._mql.addEventListener) this._mql.addEventListener('change', this._onMql);
    else if (this._mql.addListener) this._mql.addListener(this._onMql);
  }
};

/** Attach pointer listeners ONLY if interaction is enabled. */
P._bind = function () {
  this._unbind();
  var o = this.o, self = this;
  if (o.pointer.mode === 'none' && o.click.mode === 'none') return;

  function locate(e) {
    if (self._rectDirty || !self._rect) { self._rect = self.canvas.getBoundingClientRect(); self._rectDirty = false; }
    var r = self._rect;
    if (!r.width || !r.height) return false;
    var x = (e.clientX - r.left) * (self.w / r.width), y = (e.clientY - r.top) * (self.h / r.height);
    var inside = x >= 0 && y >= 0 && x <= self.w && y <= self.h;
    self._pointer.active = inside;
    if (inside) { self._pointer.x = x; self._pointer.y = y; }
    return inside;
  }

  this._h = {
    move:  function (e) { locate(e); },
    down:  function (e) {
      if (!locate(e)) return;
      var c = o.click;
      if (c.mode === 'burst') self.burst(self._pointer.x, self._pointer.y, c.count);
      else if (c.mode === 'pulse') self.pulse(self._pointer.x, self._pointer.y, c.radius, c.strength);
    },
    up:    function (e) { if (e.pointerType === 'touch' || e.pointerType === 'pen') self._pointer.active = false; },
    leave: function () { self._pointer.active = false; },
    dirty: function () { self._rectDirty = true; }
  };
  var h = this._h, passive = { passive: true };
  window.addEventListener('pointermove', h.move, passive);
  window.addEventListener('pointerdown', h.down, passive);
  window.addEventListener('pointerup', h.up, passive);
  window.addEventListener('pointercancel', h.leave, passive);
  window.addEventListener('blur', h.leave);
  document.addEventListener('mouseleave', h.leave);
  window.addEventListener('scroll', h.dirty, { passive: true, capture: true });
};

P._unbind = function () {
  var h = this._h; if (!h) return;
  window.removeEventListener('pointermove', h.move);
  window.removeEventListener('pointerdown', h.down);
  window.removeEventListener('pointerup', h.up);
  window.removeEventListener('pointercancel', h.leave);
  window.removeEventListener('blur', h.leave);
  document.removeEventListener('mouseleave', h.leave);
  window.removeEventListener('scroll', h.dirty, true);
  this._h = null;
};

/* ========================================================================
 *  Public API
 * ====================================================================== */

/** Pause animation (the loop stops completely; zero CPU). */
P.pause = function () { this._paused = true; this._sync(); return this; };

/** Resume after pause(). */
P.play = function () { this._paused = false; this._sync(); return this; };

/** Toggle between pause() and play(). */
P.toggle = function () { return this._paused ? this.play() : this.pause(); };

/**
 * Re-measure the canvas. Called automatically via ResizeObserver; call it
 * manually only if you resize the canvas in a way the browser can't observe.
 */
P.resize = function () {
  if (this._destroyed) return this;
  var info = this._measure(false);
  this._rectDirty = true;
  if (info.oldW && info.oldH && (info.oldW !== this.w || info.oldH !== this.h)) {
    var kx = this.w / info.oldW, ky = this.h / info.oldH;
    for (var i = 0; i < this.nReg; i++) { this.x[i] *= kx; this.y[i] *= ky; }
  }
  if (info.dprChanged) this._buildSprites();
  this._computeBase();
  this._applyCount();
  this._render();
  return this;
};

/**
 * Change options on the fly (deep-merged into the current ones).
 * Rebuilds sprites and particles, keeps the canvas and pause state.
 * @param {object} partial
 */
P.update = function (partial) {
  if (this._destroyed || !partial) return this;
  var o = this.o;
  if (partial.preset && PRESETS[partial.preset]) merge(o, PRESETS[partial.preset]);
  merge(o, partial);
  this._quality = 1;
  if ((o.maxCount | 0) > this.maxCount || (o.count | 0) > this.maxCount) this._allocate();
  this._measure(true);
  this._rebuild();
  this._bind();
  this._render();
  this._sync();
  return this;
};

/**
 * Emit a burst of particles from a point (CSS px, relative to the canvas).
 * Uses a small fixed pool, so spamming it can never leak memory.
 * @param {number} x @param {number} y @param {number} [count=10]
 */
P.burst = function (x, y, count) {
  if (this._destroyed) return this;
  count = count == null ? 10 : count;
  var start = this.maxCount, end = this.total, made = 0;
  for (var i = start; i < end && made < count; i++) {
    if (this.ttl[i] > 0) continue;
    this._init(i);
    var a = Math.random() * TAU, v = 80 + Math.random() * 140;
    this.x[i] = x; this.y[i] = y;
    this.vx[i] = 0; this.vy[i] = 0;
    this.ex[i] = Math.cos(a) * v; this.ey[i] = Math.sin(a) * v;
    this.sz[i] *= 1 + Math.random() * 0.3;
    this.al[i] = Math.max(this.al[i], 0.6);
    this.ttl[i] = this.ttl0[i] = 0.9 + Math.random() * 0.6;
    made++;
  }
  if (!this._running) this._render();
  return this;
};

/**
 * Shockwave: push regular particles away from a point.
 * @param {number} x @param {number} y @param {number} [radius=180] @param {number} [strength=1]
 */
P.pulse = function (x, y, radius, strength) {
  if (this._destroyed) return this;
  radius = radius || 180; strength = strength == null ? 1 : strength;
  var r2 = radius * radius;
  for (var i = 0; i < this.nReg; i++) {
    var dx = this.x[i] - x, dy = this.y[i] - y, d2 = dx * dx + dy * dy;
    if (d2 >= r2 || d2 < 0.01) continue;
    var d = Math.sqrt(d2), f = (1 - d / radius) * 420 * strength / d;
    this.ex[i] += dx * f; this.ey[i] += dy * f;
  }
  return this;
};

/** @returns {{fps:number, particles:number, quality:number, frameMs:number, running:boolean}} */
P.getStats = function () {
  return {
    fps: this._fps, particles: this.nReg, quality: Math.round(this._quality * 100) / 100,
    frameMs: Math.round(this._ema * 100) / 100, running: this._running
  };
};

/** Stop everything, remove listeners, remove the canvas (if we created it). */
P.destroy = function () {
  if (this._destroyed) return;
  this._running = false;
  cancelAnimationFrame(this._raf);
  this._destroyed = true;
  this._unbind();
  if (this._ro) this._ro.disconnect();
  if (this._io) this._io.disconnect();
  if (this._onWinResize) window.removeEventListener('resize', this._onWinResize);
  document.removeEventListener('visibilitychange', this._onVis);
  if (this._mql) {
    if (this._mql.removeEventListener) this._mql.removeEventListener('change', this._onMql);
    else if (this._mql.removeListener) this._mql.removeListener(this._onMql);
  }
  if (this._ownCanvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  else this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  for (var i = this._restore.length - 1; i >= 0; i--) this._restore[i][0].style[this._restore[i][1]] = this._restore[i][2];
  this._restore = [];
  if (this._host && this._host.__motefield === this) delete this._host.__motefield;
  this.sprites = this.specs = this.variants = this.grid = null;
  this.x = this.y = this.vx = this.vy = this.ex = this.ey = this.sz = this.al = null;
  this.rot = this.vr = this.ph = this.tw = this.dp = this.spd = this.ttl = this.ttl0 = this.sp = null;
};

/* ========================================================================
 *  Static API
 * ====================================================================== */

Motefield.version = VERSION;

/** Same as `new Motefield(target, options)`. */
Motefield.create = function (target, options) { return new Motefield(target, options); };

/**
 * Register a reusable shape by name.
 * @param {string} name
 * @param {function(CanvasRenderingContext2D, number, string)} drawFn
 *        (ctx, size, color); ctx origin is the centre of the box.
 */
Motefield.registerShape = function (name, drawFn) {
  if (typeof name !== 'string' || typeof drawFn !== 'function') throw new TypeError('registerShape(name, drawFn)');
  REGISTRY[name] = drawFn;
};

/** Add or replace a preset. */
Motefield.registerPreset = function (name, options) { PRESETS[name] = merge({}, options); };

/** Names of built-in shapes and presets (handy for demos/UI). */
Motefield.shapes = function () { return Object.keys(SHAPES).concat(Object.keys(REGISTRY)); };
Motefield.presets = function () { return Object.keys(PRESETS); };

/**
 * Auto-create fields from markup:
 *   <div data-motefield="snow"></div>
 *   <div data-motefield='{"preset":"embers","count":40}'></div>
 * @param {ParentNode} [rootEl=document]
 * @returns {Motefield[]}
 */
Motefield.scan = function (rootEl) {
  var out = [], nodes = (rootEl || document).querySelectorAll('[data-motefield]');
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    if (el.__motefield) continue;
    var raw = el.getAttribute('data-motefield'), opts = {};
    if (raw) {
      try { opts = JSON.parse(raw); } catch (e) { opts = { preset: raw.trim() }; }
    }
    el.__motefield = new Motefield(el, opts);
    out.push(el.__motefield);
  }
  return out;
};

  return Motefield;
}));
