<p align="center">
  <img src="./banner.png" alt="Motefield - Tiny. Fast. Custom icons." width="100%">
</p>

# Motefield

A tiny, dependency-free particle field for the 2D canvas, built to be **light on CPU, GPU and RAM**, with first-class support for **custom icons and symbols** (emoji, text glyphs, images, inline SVG, SVG paths, and your own draw functions).

- No dependencies. One editable ESM source, one built UMD file, one build script
- Works as a plain `<script>`, CommonJS, AMD, or ESM import
- Sleeps completely when it cannot be seen
- Adapts its particle count if a device struggles

[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

## Live demo

**[Explore the interactive Motefield demo](https://kavineksith.github.io/motefield/index.html)**

The demo is hosted with GitHub Pages from `demo.html`. Try the particle presets, custom icons, motion, and interaction options directly in your browser.

---

```html
<script src="./motefield.js"></script>
<script>
  Motefield.create('#hero', {
    shapes: ['❄', '✨', { glyph: '🔥', weight: 0.4 }],
    motion: { mode: 'sway' },
    pointer: { mode: 'repel' }
  });
</script>
```

---

## Install

**Script tag**

```html
<script src="./motefield.js"></script>
```

**npm / bundlers**

```js
import Motefield from 'motefield';        // ESM
// const Motefield = require('motefield'); // CommonJS
```

> The library touches the DOM, so create instances only in the browser (after the page is ready, or inside `useEffect` / `onMounted` in frameworks).

---

## Quick start

```js
// Full-page background (fixed to the viewport)
const field = Motefield.create();

// Inside a specific element
const field = Motefield.create('#hero', { preset: 'snow' });

// Into a canvas you already have
const field = Motefield.create(document.querySelector('canvas'), { count: 40 });

// From markup only
// <div data-motefield="snow"></div>
// <div data-motefield='{"preset":"embers","count":40}'></div>
Motefield.scan();
```

`create(target, options)`: `target` can be a CSS selector, an element, a `<canvas>`, or omitted (full viewport). If it is an element, Motefield inserts its own canvas, makes it non-interactive (`pointer-events: none`), and removes it again on `destroy()`.

---

## Shapes & custom icons

`shapes` is an array. Mix any of the forms below. Each entry may also carry:

| Key | Meaning |
|---|---|
| `weight` | Relative chance of being picked (default `1`) |
| `scale` | Size multiplier for this shape only (default `1`) |
| `colors` | Colours for this shape, overriding the global `colors` |
| `tint` | Whether the shape takes the `colors`. See each form below for its default |

### Built-in shapes

```js
shapes: ['circle', 'ring', 'square', 'triangle', 'diamond',
         'hexagon', 'plus', 'star', 'spark', 'heart']
```

### Text glyphs and emoji

Any string that is not a built-in or registered shape name is drawn as text.

```js
shapes: ['❄', '✨', '★', 'Hi', { glyph: '🔥', weight: 0.4 }]
shapes: [{ glyph: 'ᛉ', font: 'serif', fontWeight: 'bold' }]
```

- **Emoji** keep their own colours (`tint` defaults to `false`).
- **Plain symbols and letters** take your `colors` (`tint` defaults to `true`).
- Override with `tint: true` or `tint: false`.

### Images

```js
shapes: [
  { image: 'leaf.png' },                       // URL
  { image: document.getElementById('logo') },  // <img>, <canvas> or ImageBitmap
  { image: 'mask.png', tint: true, colors: ['#f55', '#fa0'] }  // recolour a white/black mask
]
```

Images keep their original colours unless `tint: true`. They load asynchronously and appear as soon as they are ready. If one fails to load, a circle is used and a console warning is logged.

> Cross-origin images work for display. Prefer same-origin or CORS-enabled assets and keep them small (64-256 px); they are scaled down into a cached sprite.

### Inline SVG

```js
shapes: [{ svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ff6b9d" d="M12 21s-7-4.6-9.3-9A5.4 5.4 0 0 1 12 6.5 5.4 5.4 0 0 1 21.3 12C19 16.4 12 21 12 21z"/></svg>' }]
```

The SVG is rasterised once into a sprite, so complex SVGs cost nothing extra per frame. Include `xmlns` and a `viewBox`.

### SVG path data

Great for icon sets: copy the `d` attribute of any path.

```js
shapes: [{ path: 'M12 2l2.9 6.9L22 10l-5.5 4.7L18 22l-6-3.6L6 22l1.5-7.3L2 10l7.1-1.1z', viewBox: 24, colors: ['#ffd166'] }]
```

`viewBox` is the size of the square the path was designed in (default `24`). Paths are filled with the shape's colour.

### Your own draw function

```js
shapes: [{
  draw(ctx, size, color) {
    // ctx origin (0,0) is the CENTRE of a size x size box. fillStyle/strokeStyle = color.
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
    ctx.stroke();
  },
  colors: ['#4cc9f0']
}]
```

The function runs **once per colour** when sprites are built, not every frame. You can therefore draw gradients, strokes, shadows, or anything else the 2D canvas supports without hurting performance.

### Register a reusable shape

```js
Motefield.registerShape('bolt', (ctx, size) => {
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(s * 0.2, -s); ctx.lineTo(-s * 0.5, s * 0.1); ctx.lineTo(0, s * 0.1);
  ctx.lineTo(-s * 0.2, s); ctx.lineTo(s * 0.5, -s * 0.15); ctx.lineTo(0, -s * 0.15);
  ctx.closePath(); ctx.fill();
});

Motefield.create('#hero', { shapes: ['bolt', 'circle'] });
```

---

## Presets

```js
Motefield.create('#hero', { preset: 'embers', count: 30 });   // your options override the preset
Motefield.presets();   // ['snow', 'embers', 'fireflies', 'confetti', 'bubbles']
Motefield.registerPreset('mine', { shapes: ['★'], motion: { mode: 'fall' } });
```

| Preset | Look |
|---|---|
| `snow` | Soft white flakes swaying down, with depth |
| `embers` | Warm sparks rising and twinkling |
| `fireflies` | Slow glowing dots wandering on a flow field |
| `confetti` | Coloured shapes tumbling down |
| `bubbles` | Translucent rings rising |

---

## Options reference

Every option is optional. Numbers marked *range* accept a single number or `[min, max]`.

### Layout

| Option | Default | Description |
|---|---|---|
| `layer` | `'behind'` | `'behind'` or `'front'` relative to the host's content |
| `zIndex` | `null` | Overrides the computed z-index |
| `background` | `null` | Optional CSS colour painted behind particles |

### Amount

| Option | Default | Description |
|---|---|---|
| `count` | `60` | Number of particles |
| `density` | `0` | If `> 0`, one particle per this many CSS px² (e.g. `12000`). Overrides `count`, so big screens get more |
| `maxCount` | `300` | Hard cap; also sizes the preallocated memory |

### Appearance

| Option | Default | Description |
|---|---|---|
| `shapes` | `['circle']` | See [Shapes & custom icons](#shapes--custom-icons) |
| `colors` | `['#ffffff']` | Colours for tinted shapes (any CSS colour) |
| `size` | `[3, 8]` | Edge length in CSS px *(range)* |
| `opacity` | `[0.35, 0.9]` | *(range)* |
| `depth` | `0.5` | `0..1`. Far particles are smaller, slower and fainter |
| `parallax` | `0` | `0..~0.1`. Particles shift with the pointer by depth. Ignored when `links` is on |
| `rotation` | `{ enable:false, speed:[-30,30] }` | Spin in degrees/second |
| `twinkle` | `{ enable:false, speed:[0.6,1.6], depth:0.6 }` | Pulsing opacity |

### Motion (`motion`)

| Key | Default | Description |
|---|---|---|
| `mode` | `'drift'` | `'drift'` random direction; `'fall'`; `'rise'`; `'sway'` falling with side-to-side wobble; `'flow'` smooth wandering on a flow field |
| `speed` | `[8, 28]` | px/second *(range)* |
| `angle` | `null` | Force a direction in degrees (`0` = right, `90` = down). `null` = automatic |
| `spread` | `20` | ± degrees of random variation around the direction |
| `sway` | `18` | `sway` mode: side-to-side amplitude (px/s) |
| `swayRate` | `1.2` | `sway` mode: oscillation speed (rad/s) |
| `scale` | `0.003` | `flow` mode: field frequency (smaller = broader curves) |
| `turn` | `1.5` | `flow` mode: how quickly particles steer |
| `edge` | `'wrap'` | `'wrap'`, `'bounce'`, or `'none'` |

Motion is delta-time based, so speeds are identical at 30, 60 or 144 fps.

### Interaction

| Option | Default | Description |
|---|---|---|
| `pointer.mode` | `'none'` | `'repel'`, `'attract'`, `'swirl'` or `'none'` |
| `pointer.radius` | `120` | Influence radius in CSS px |
| `pointer.strength` | `1` | Force multiplier |
| `click.mode` | `'none'` | `'burst'` (emit particles), `'pulse'` (shockwave), or `'none'` |
| `click.count` | `10` | `burst`: number of particles |
| `click.radius` / `click.strength` | `180` / `1` | `pulse` settings |
| `drag` | `3` | How fast interaction kicks fade out (per second) |

Pointer listeners are attached **only** when interaction is enabled. Your canvas can sit behind your content with `pointer-events: none`; Motefield listens on `window`, so mouse, touch and pen all work.

### Links (`links`)

| Key | Default | Description |
|---|---|---|
| `enable` | `false` | Draw lines between nearby particles |
| `distance` | `90` | Maximum link length (CSS px) |
| `color` / `opacity` / `width` | `'#ffffff'` / `0.25` / `1` | Line style |
| `maxLinks` | `400` | Hard cap on lines per frame. This bounds the worst-case cost |

Links use a spatial grid and are drawn in three batched strokes per frame. They are still the most expensive feature, so keep `count` moderate when enabled.

### Performance

| Option | Default | Description |
|---|---|---|
| `fps` | `60` | Frame-rate cap. `30` halves the work for ambient backgrounds |
| `pixelRatio` | `'auto'` | `'auto'` or a number (`1` = never use retina resolution) |
| `maxPixelRatio` | `1.5` | Cap applied when `pixelRatio` is `'auto'` |
| `respectReducedMotion` | `true` | Draws one still frame if the OS asks for reduced motion |
| `pauseWhenHidden` | `true` | Stops when the tab is hidden or the canvas is scrolled off-screen |
| `adaptive` | `{ enable:true, budgetMs:3, minRatio:0.35 }` | Auto-trims particles if per-frame JS cost exceeds `budgetMs`. Never drops below `minRatio` of your count |

---

## Methods

```js
const field = Motefield.create('#hero', { ... });

field.pause();                 // stop the loop completely (0 CPU)
field.play();                  // resume
field.toggle();
field.update({ preset: 'embers', count: 30 });   // change options live (deep-merged)
field.burst(x, y, 12);         // emit particles from a point (CSS px inside the canvas)
field.pulse(x, y, 180, 1);     // shockwave from a point
field.resize();                // normally automatic (ResizeObserver)
field.getStats();              // { fps, particles, quality, frameMs, running }
field.destroy();               // remove listeners, observers and the canvas
```

All instance methods that make sense to chain return the instance.

**Static**

```js
Motefield.create(target, options)
Motefield.scan(rootElement?)             // build from data-motefield attributes
Motefield.registerShape(name, drawFn)
Motefield.registerPreset(name, options)
Motefield.shapes()                       // names of built-in + registered shapes
Motefield.presets()
Motefield.version
```

---

## Performance design

| Technique | What it saves |
|---|---|
| **Sprite cache**: every icon/colour is drawn once to a small off-screen canvas, then stamped with `drawImage` | No per-frame path building, text layout, SVG parsing or `shadowBlur` |
| **Typed arrays** (struct-of-arrays), allocated once | No per-frame allocation, so no GC pauses; constant memory |
| **Fixed pools**: click bursts reuse 64 reserved slots | Spamming clicks can't leak or grow memory |
| **Uniform spatial grid** for links | Near-linear neighbour search instead of O(n²) |
| **Loop that truly stops**: hidden tab, off-screen canvas, reduced motion, `pause()` | Zero CPU/GPU when nobody can see it |
| **Frame cap + delta time** | Run at 30 fps with the same visual speed |
| **Capped pixel ratio** (default 1.5) | Canvas fill-rate is the main GPU cost; this trims it on 2x/3x screens |
| **Adaptive count** | Weak devices get fewer particles instead of dropped frames |
| **Lazy, passive listeners** | No input handlers unless you use interaction |

Measured in headless Chromium (software-rendered, so a pessimistic baseline): 40 particles with emoji, rotation and pointer repel used about **0.1 ms of JavaScript per frame**; a 36-particle field with links, SVG icons and parallax stayed around **0.1 ms**. Treat these as indicative, since your hardware and page will differ.

---

## Performance tips

- Prefer **`density`** over `count` so large screens scale sensibly, and set a sensible `maxCount`.
- For ambient backgrounds use `fps: 30` and `maxPixelRatio: 1`. It looks the same in motion and halves the cost.
- Keep image/SVG shapes small. They are sampled down to the particle size anyway.
- Rotation and twinkle add a little per-particle maths; enable them only where they matter.
- `links` is the costliest feature. Keep `count` under ~80 and `distance` modest.
- Don't create one instance per card. One page-wide field is far cheaper than many small ones.
- Call `destroy()` when removing a field (e.g. on route change in a SPA).
- `getStats().quality < 1` means the adaptive system had to trim. Lower `count` or `fps` to fix it at the source.

> **Note on measurement:** `frameMs` measures JavaScript time (simulation + issuing canvas calls). Browsers rasterise canvas work separately, partly on the GPU, so this is an indicator rather than a full cost. Use the browser's Performance panel for the whole picture.

---

## Accessibility

- The canvas is `aria-hidden="true"` and `role="presentation"`; it is purely decorative.
- It never intercepts pointer events.
- If the user's OS requests **reduced motion**, Motefield draws a single still frame and does not animate (turn off with `respectReducedMotion: false`).
- Don't convey essential information with particles alone, and keep contrast high for text above the effect.

---

## Layering / z-index

- Inside an element, `layer: 'behind'` (default) places the canvas above the element's background but below its content. Motefield sets `isolation: isolate` on the host to make this work, and restores it on `destroy()`.
- For a **full-page** field (`Motefield.create()`), the canvas sits at `z-index: -1`. If your `<body>` has its own background colour it will paint over the canvas. Either put the background on a wrapper element and target that, or use `layer: 'front'` (canvas on top, still click-through).
- Use `zIndex` to set an explicit value.

---

## Browser support

All current evergreen browsers. Motefield uses `ResizeObserver`, `IntersectionObserver` and `Path2D` when available; without the observers it falls back to a window `resize` listener and always-on animation.

---

## FAQ

**Why do my emoji look different on different devices?**
Emoji are rendered by the operating system's font, so artwork varies by platform. For identical visuals everywhere, use `svg` or `image` shapes.

**Can I use a web font or icon font?**
Yes: `{ glyph: '\uf005', font: '"Font Awesome 6 Free"', fontWeight: '900' }`. Make sure the font is loaded before you create the field (e.g. `document.fonts.ready.then(...)`), or call `field.update({})` once it has loaded to rebuild the sprites.

**Is it OK to call `update()` often?**
It rebuilds sprites and particles, so use it for occasional changes (theme switch, preset change), not every frame.

**Does it work with React/Vue/Svelte?**
Yes. Create it in a mount hook with a ref and call `destroy()` in the cleanup.

```jsx
useEffect(() => {
  const f = Motefield.create(ref.current, { preset: 'snow' });
  return () => f.destroy();
}, []);
```

---

## Files in this folder

Everything is flat in one folder, no subfolders:

| File | What it is |
|---|---|
| `motefield.mjs` | ESM source. Edit this. Ends with `export { Motefield as default, Motefield };` |
| `build.mjs` | Zero-dependency build script. Reads the `.mjs`, strips the export, wraps it as UMD, writes the `.js` |
| `motefield.js` | The usable built file (UMD). Produced by `build.mjs`. Works as `<script>`, CommonJS and AMD |
| `motefield.test.mjs` | Node test suite. Tests the `.mjs` source and the built `.js` |
| `index.d.ts` | TypeScript types |
| `demo.html` | Browser demo. Loads `./motefield.js` |
| `banner.png` | Header image |
| `LICENSE` | MIT |

## Manually build, test and create the usable JS file

You only need Node.js 18 or newer. No `npm install`, no dependencies to fetch.

### 1. Build the usable file

From this folder:

```bash
node build.mjs
```

This reads `motefield.mjs`, removes the trailing `export { ... }` line, wraps the body in a UMD shim and writes `motefield.js`. The output is unminified and ready to use as a plain `<script>`, as a CommonJS module (`require('./motefield.js')`), or as an AMD module.

To check syntax without running anything:

```bash
node --check motefield.mjs
node --check motefield.js
```

### 2. Test

```bash
node --test motefield.test.mjs
```

This runs the Node test runner. The suite imports the ESM source from `./motefield.mjs` and the UMD build from `./motefield.js`, so build first if you have changed the source.

### 3. Use the built file

After step 1, drop `motefield.js` into your project:

```html
<script src="./motefield.js"></script>
<script>
  Motefield.create('#hero', { preset: 'snow' });
</script>
```

```js
// ESM
import Motefield from './motefield.js';
// CommonJS
const Motefield = require('./motefield.js');
```

### 4. Edit and rebuild

Edit `motefield.mjs`. Keep the trailing `export { Motefield as default, Motefield };` line — `build.mjs` looks for it. Then run `node build.mjs` again, then `node --test motefield.test.mjs`.

---

## Disclaimer

The software is provided as is. You are responsible for any images or fonts you use, and you should test performance on your target devices.

## License

MIT © 2026 Kavin Eksith. See [LICENSE](./LICENSE). Motefield is an independent implementation and contains no code from other particle libraries.
