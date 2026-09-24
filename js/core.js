/* Core namespace, seeded RNG and small helpers. Loaded first; no DOM use so
   the content validator can run it under Node too. */
(function (root) {
  'use strict';
  const ST = root.ST = root.ST || {};

  // ---- Seeded RNG (mulberry32). State is a single uint32 so it can be saved.
  function RNG(seed) { this.s = (seed >>> 0) || 1; }
  RNG.prototype.next = function () {
    let t = (this.s = (this.s + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  RNG.prototype.float = function (a, b) { return a + (b - a) * this.next(); };
  RNG.prototype.int = function (a, b) { return Math.floor(a + (b - a + 1) * this.next()); };
  RNG.prototype.chance = function (p) { return this.next() < p; };
  RNG.prototype.pick = function (arr) { return arr.length ? arr[Math.floor(this.next() * arr.length)] : undefined; };
  RNG.prototype.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  /** items: array; weightFn(item) -> number */
  RNG.prototype.weighted = function (items, weightFn) {
    let total = 0;
    const ws = items.map(it => { const w = Math.max(0, +weightFn(it) || 0); total += w; return w; });
    if (total <= 0) return undefined;
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  };
  ST.RNG = RNG;

  // Game RNG lives on ST.rng and is re-seeded from saved state.
  ST.rng = new RNG(Date.now());

  const U = ST.util = {};
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  U.uid = (() => { let n = 0; return (p) => (p || 'id') + '_' + Date.now().toString(36) + '_' + (n++).toString(36); })();
  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.roman = (n) => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n);
  U.cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
  U.pct = (v) => Math.round(v * 100) + '%';
  U.sign = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);
  U.deepClone = (o) => JSON.parse(JSON.stringify(o));
  U.isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
  U.fmt1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
  U.plural = (n, one, many) => n + ' ' + (n === 1 ? one : (many || one + 's'));
})(typeof window !== 'undefined' ? window : globalThis);
