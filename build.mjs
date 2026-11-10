// Zero-dependency build: wraps the ESM source into a UMD bundle (motefield.js).
// Run:  node build.mjs
// Input:  motefield.mjs   (ESM source, ends with `export { ... }`)
// Output: motefield.js    (UMD bundle, usable as <script>, CommonJS and AMD)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(root, 'motefield.mjs'), 'utf8');

const exportLine = /^export \{[^}]*\};?\s*$/m;
if (!exportLine.test(src)) {
  throw new Error('Expected a trailing `export { ... }` line in motefield.mjs');
}
const body = src.replace(exportLine, '').trimEnd();

const umd = `/*!
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

${body}

  return Motefield;
}));
`;

writeFileSync(join(root, 'motefield.js'), umd);
console.log('Built motefield.js (' + Buffer.byteLength(umd) + ' bytes, unminified)');
