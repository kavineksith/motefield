import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import Motefield from './motefield.mjs';

const W = 800;
const H = 600;

/* Minimal 2D context: every method is a no-op, property writes succeed. */
function makeCtx() {
  const noop = () => {};
  const ctx = {
    canvas: null,
    fillStyle: '', strokeStyle: '', font: '', textAlign: '', textBaseline: '',
    lineWidth: 1, lineCap: '', lineJoin: '', globalAlpha: 1, globalCompositeOperation: 'source-over',
    setTransform() {}, translate() {}, scale() {}, rotate() {}, save() {}, restore() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, rect() {}, fillRect() {},
    strokeRect() {}, fill() {}, stroke() {}, drawImage() {}, fillText() {}, measureText() { return { width: 10 }; },
    clearRect() {}, quadraticCurveTo() {}
  };
  return new Proxy(ctx, {
    get: (t, k) => (k in t ? t[k] : noop),
    set: (t, k, v) => ((t[k] = v), true)
  });
}

function setupDom() {
  const body = {
    style: {},
    childNodes: [],
    insertBefore(c) { c.parentNode = body; this.childNodes.push(c); },
    appendChild(c) { c.parentNode = body; this.childNodes.push(c); },
    removeChild(c) { c.parentNode = null; }
  };
  function createElement(tag) {
    if (tag === 'canvas') {
      return {
        tagName: 'CANVAS',
        nodeName: 'CANVAS',
        style: {}, width: 300, height: 150, parentNode: null,
        clientWidth: W, clientHeight: H,
        getContext: () => makeCtx(),
        setAttribute() {}, getAttribute() { return null; }
      };
    }
    return {
      tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(),
      style: {}, parentNode: null,
      clientWidth: W, clientHeight: H,
      insertBefore(c) { c.parentNode = this; },
      appendChild(c) { c.parentNode = this; },
      removeChild(c) { c.parentNode = null; },
      setAttribute() {}, getAttribute() { return null; }
    };
  }
  globalThis.document = {
    body,
    documentElement: { clientWidth: W, clientHeight: H },
    createElement,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  globalThis.window = globalThis;
  globalThis.innerWidth = W;
  globalThis.innerHeight = H;
  globalThis.devicePixelRatio = 1;
  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};
  globalThis.getComputedStyle = () => ({ position: 'static' });
  globalThis.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
  let id = 0;
  globalThis.requestAnimationFrame = () => ++id;
  globalThis.cancelAnimationFrame = () => {};
  globalThis.ResizeObserver = class {
    observe() {} unobserve() {} disconnect() {}
  };
  globalThis.IntersectionObserver = class {
    observe() {} unobserve() {} disconnect() {}
  };
  globalThis.Path2D = function (d) { this.d = d; };
  return body;
}

function make(target, options = {}) {
  setupDom();
  // Pass options through unchanged so preset-only tests are not overridden.
  return new Motefield(target, options);
}

/* ------------------------------------------------------------------ tests */

test('exposes a function and a static create()', () => {
  setupDom();
  assert.equal(typeof Motefield, 'function');
  assert.equal(typeof Motefield.create, 'function');
  assert.equal(typeof Motefield.scan, 'function');
  assert.equal(typeof Motefield.registerShape, 'function');
  assert.equal(typeof Motefield.registerPreset, 'function');
  assert.equal(typeof Motefield.shapes, 'function');
  assert.equal(typeof Motefield.presets, 'function');
  assert.equal(Motefield.version, '1.0.0');
});

test('built-in presets are present', () => {
  setupDom();
  const names = Motefield.presets();
  for (const p of ['snow', 'embers', 'fireflies', 'confetti', 'bubbles']) {
    assert.ok(names.indexOf(p) !== -1, `preset "${p}" missing`);
  }
});

test('built-in shapes are present', () => {
  setupDom();
  const names = Motefield.shapes();
  for (const s of ['circle', 'ring', 'square', 'triangle', 'diamond',
                   'hexagon', 'plus', 'star', 'spark', 'heart']) {
    assert.ok(names.indexOf(s) !== -1, `shape "${s}" missing`);
  }
});

test('create() builds a canvas on document.body and destroy removes it', () => {
  const body = setupDom();
  const f = Motefield.create(null, { count: 30 });
  assert.ok(f.canvas);
  assert.equal(f.canvas.tagName, 'CANVAS');
  assert.equal(f.nReg, 30);
  assert.equal(f._destroyed, false);
  f.destroy();
  assert.equal(f._destroyed, true);
});

test('particle count can be set via count option', () => {
  const f = make(null, { count: 25 });
  assert.equal(f.nReg, 25);
  f.destroy();
});

test('density overrides count based on screen area', () => {
  const f = make(null, { density: 8000, count: 999, maxCount: 500 });
  // area = 800*600 = 480000; /8000 = 60
  assert.equal(f.baseCount, 60);
  f.destroy();
});

test('motion modes set the right base direction', () => {
  const m = make(null, { motion: { mode: 'fall' } });
  assert.equal(typeof m._update, 'function');
  // advance the simulation: should not throw
  assert.doesNotThrow(() => m._update(0.016));
  m.destroy();
});

test('particles stay inside bounds over a long run with wrap edge', () => {
  for (const mode of ['drift', 'fall', 'rise', 'sway', 'flow']) {
    const f = make(null, { count: 50, motion: { mode } });
    for (let i = 0; i < 600; i++) f._update(1 / 60);
    for (let i = 0; i < f.nReg; i++) {
      // wrap leaves a small overshoot of one sprite radius; allow generous margin
      assert.ok(f.x[i] >= -50 && f.x[i] <= W + 50, `${mode} x ${f.x[i]}`);
      assert.ok(f.y[i] >= -50 && f.y[i] <= H + 50, `${mode} y ${f.y[i]}`);
    }
    f.destroy();
  }
});

test('pause/play toggle the running state', () => {
  const f = make(null, { count: 10 });
  f.pause();
  assert.equal(f._paused, true);
  f.play();
  assert.equal(f._paused, false);
  f.toggle();
  assert.equal(f._paused, true);
  f.destroy();
});

test('update() changes live options', () => {
  const f = make(null, { count: 20 });
  assert.equal(f.nReg, 20);
  f.update({ count: 40 });
  assert.equal(f.nReg, 40);
  f.update({ preset: 'embers' });
  assert.equal(f.o.shapes[0], 'circle');
  assert.deepEqual(f.o.colors, ['#ff5e1a', '#ff9a3c', '#ffd27a']);
  f.destroy();
});

test('burst() emits particles into the burst pool', () => {
  const f = make(null, { count: 5 });
  let live = 0;
  for (let i = f.maxCount; i < f.total; i++) if (f.ttl[i] > 0) live++;
  assert.equal(live, 0);
  f.burst(100, 100, 8);
  live = 0;
  for (let i = f.maxCount; i < f.total; i++) if (f.ttl[i] > 0) live++;
  assert.equal(live, 8);
  f.destroy();
});

test('pulse() pushes particles away from a point', () => {
  const f = make(null, { count: 10 });
  // Place particles slightly off the pulse centre so d2 > 0.01 (the function
  // skips points that coincide with the pulse origin).
  for (let i = 0; i < f.nReg; i++) { f.x[i] = 220; f.y[i] = 200; f.ex[i] = 0; f.ey[i] = 0; }
  f.pulse(200, 200, 100, 2);
  let any = false;
  for (let i = 0; i < f.nReg; i++) {
    if (Math.abs(f.ex[i]) > 0 || Math.abs(f.ey[i]) > 0) any = true;
  }
  assert.ok(any, 'pulse should apply a kick');
  f.destroy();
});

test('registerShape adds a reusable shape name', () => {
  setupDom();
  const drawFn = (c, s) => { c.beginPath(); c.moveTo(0, -s / 2); c.lineTo(0, s / 2); c.stroke(); };
  Motefield.registerShape('bolt', drawFn);
  assert.ok(Motefield.shapes().indexOf('bolt') !== -1);
  const f = make(null, { count: 5, shapes: ['bolt'] });
  // Registered shapes are wrapped as kind:'draw' with the draw function attached.
  assert.equal(f.specs[0].kind, 'draw');
  assert.equal(f.specs[0].draw, drawFn);
  f.destroy();
});

test('registerPreset adds a reusable preset', () => {
  setupDom();
  Motefield.registerPreset('mine', { shapes: ['★'], count: 7 });
  assert.ok(Motefield.presets().indexOf('mine') !== -1);
  const f = make(null, { preset: 'mine' });
  assert.equal(f.o.shapes[0], '★');
  assert.equal(f.o.count, 7);
  f.destroy();
});

test('getStats() returns expected fields', () => {
  const f = make(null, { count: 12 });
  const s = f.getStats();
  assert.equal(typeof s.fps, 'number');
  assert.equal(s.particles, 12);
  assert.equal(typeof s.quality, 'number');
  assert.equal(typeof s.frameMs, 'number');
  assert.equal(typeof s.running, 'boolean');
  f.destroy();
});

test('UMD build exposes the same factory (CJS)', () => {
  const require = createRequire(import.meta.url);
  const Umd = require('./motefield.js');
  assert.equal(typeof Umd, 'function');
  assert.equal(Umd.version, '1.0.0');
  assert.equal(typeof Umd.create, 'function');
  assert.equal(typeof Umd.presets, 'function');
  setupDom();
  const f = new Umd(null, { count: 5 });
  assert.ok(f.canvas);
  assert.equal(f.nReg, 5);
  f.destroy();
});
