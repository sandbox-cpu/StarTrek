/* Art: manifest lookup, viewscreen markup, and procedural stand-ins drawn on
   canvas whenever a picture is missing (or while it loads). Also shared
   drawing helpers for planets, stars and ship schematics. */
(function () {
  'use strict';
  const ST = window.ST, D = ST.DATA, U = ST.util;
  const A = ST.art = {};

  A.resolve = function (key) {
    let k = key, guard = 0;
    while (k && !ST.ART[k] && ST.ART_ALIAS[k] && guard++ < 5) k = ST.ART_ALIAS[k];
    return ST.ART[k] ? { key: k, url: ST.ART[k] } : { key: key, url: null };
  };

  /** Viewscreen markup. The canvas paints a stand-in; the <img> covers it once loaded. */
  A.html = function (key, opts) {
    opts = opts || {};
    const r = A.resolve(key);
    const seed = opts.seed || hash(String(key) + (opts.salt || ''));
    const cls = 'viewscreen' + (opts.cls ? ' ' + opts.cls : '');
    return '<div class="' + cls + '">' +
      '<canvas data-proc="' + U.esc(key) + '" data-seed="' + seed + '"' + (opts.color ? ' data-color="' + U.esc(opts.color) + '"' : '') + '></canvas>' +
      (r.url ? '<img src="' + U.esc(r.url) + '" alt="' + U.esc(opts.alt || '') + '" onerror="this.remove()">' : '') +
      (opts.scan ? '<div class="scanline"></div>' : '') +
      '<div class="vs-frame"></div>' +
      (opts.label ? '<div class="vs-label">' + U.esc(opts.label) + '</div>' : '') +
      (opts.label2 ? '<div class="vs-label r">' + U.esc(opts.label2) + '</div>' : '') +
      '</div>';
  };

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  A.hash = hash;

  A.paintAll = function (root) {
    (root || document).querySelectorAll('canvas[data-proc]').forEach(c => { if (!c._painted) A.paint(c); });
  };
  A.fit = function (c, fallbackW, fallbackH) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth || fallbackW || 640, h = c.clientHeight || fallbackH || 360;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { x, w, h };
  };

  A.paint = function (c) {
    const { x, w, h } = A.fit(c);
    c._painted = true;
    const key = c.getAttribute('data-proc') || '';
    const R = new ST.RNG(+c.getAttribute('data-seed') || 1);
    const color = c.getAttribute('data-color');
    x.fillStyle = '#02030a'; x.fillRect(0, 0, w, h);
    if (key.startsWith('portrait_')) return portrait(x, w, h, key, R, color);
    A.stars(x, w, h, R, 160);
    if (key.startsWith('planet_') || key.startsWith('surface_')) {
      const cls = key.startsWith('planet_') ? key.slice(7).toUpperCase() : (key === 'surface_caves' ? 'K' : key === 'surface_colony' ? 'M' : 'H');
      const r = h * 0.62;
      A.drawPlanet(x, w * 0.66, h * 0.55, r, cls, R.int(1, 99999));
      return;
    }
    switch (key) {
      case 'warp': return warp(x, w, h, R);
      case 'nebula': return nebula(x, w, h, R, ['#7a3cc4', '#d04a9a', '#ff9c40']);
      case 'ion_storm': return storm(x, w, h, R);
      case 'rift': return rift(x, w, h, R);
      case 'wormhole': return vortex(x, w, h, R, '#9fd0ff', '#ffe2a0');
      case 'black_hole': return blackhole(x, w, h);
      case 'pulsar': return pulsar(x, w, h);
      case 'entity': return entity(x, w, h, R);
      case 'asteroids': return asteroids(x, w, h, R);
      case 'megastructure': return mega(x, w, h, R);
      case 'starbase': case 'trade_station': case 'title':
        A.drawPlanet(x, w * 0.8, h * 1.05, h * 0.7, 'M', 7);
        return station(x, w * 0.45, h * 0.45, h * 0.28, key === 'trade_station' ? '#ffcc66' : '#dfe6ff');
      case 'derelict': return A.drawShip(x, w * 0.5, h * 0.52, h * 0.012, 'derelict', '#8a7a66', 0.3);
      default:
        if (key.startsWith('ship_') || key === 'doomsday') {
          const kind = key === 'doomsday' ? 'doomsday' : key.slice(5);
          const col = { klingon: '#cc6666', romulan: '#66bb99', cardassian: '#c9a36b', ferengi: '#ff9c00', orion: '#88c070', unknown: '#cc99cc', cube: '#66cc66', player: '#9999ff' }[kind] || color || '#ffcc99';
          nebula(x, w, h, R, ['#1b1030', '#10203a', '#301018'], 0.5);
          return A.drawShip(x, w * 0.5, h * 0.52, h * 0.011, kind === 'cube' ? 'borg' : kind, col, 0);
        }
    }
  };

  // ------------------------------------------------------------ primitives
  A.stars = function (x, w, h, R, n) {
    for (let i = 0; i < n; i++) {
      const s = R.next();
      x.fillStyle = 'rgba(255,255,255,' + (0.25 + R.next() * 0.7).toFixed(2) + ')';
      x.fillRect(R.next() * w, R.next() * h, s < 0.93 ? 1 : 2, s < 0.93 ? 1 : 2);
    }
  };

  A.drawPlanet = function (x, cx, cy, r, cls, seed, opt) {
    const pd = D.planets[cls] || D.planets.K;
    const R = new ST.RNG(seed || 1);
    const [c1, c2, c3] = pd.colors;
    x.save();
    // atmosphere glow
    if (!['K', 'N'].includes(cls) && !(opt && opt.flat)) {
      const g = x.createRadialGradient(cx, cy, r * 0.95, cx, cy, r * 1.18);
      g.addColorStop(0, hexA(c3, 0.35)); g.addColorStop(1, hexA(c3, 0));
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r * 1.18, 0, Math.PI * 2); x.fill();
    }
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.clip();
    x.fillStyle = c1; x.fillRect(cx - r, cy - r, r * 2, r * 2);
    if (pd.gas) {
      for (let i = 0; i < 14; i++) {
        const yy = cy - r + (i / 14) * r * 2 + R.float(-4, 4);
        x.fillStyle = hexA(i % 2 ? c2 : c3, 0.35 + R.next() * 0.3);
        x.fillRect(cx - r, yy, r * 2, r * 2 / 14 * R.float(0.5, 1.2));
      }
      x.fillStyle = hexA('#c0603a', 0.7); x.beginPath(); x.ellipse(cx + r * 0.25, cy + r * 0.25, r * 0.16, r * 0.09, 0, 0, Math.PI * 2); x.fill();
    } else {
      for (let i = 0; i < 26; i++) {
        x.fillStyle = hexA(i % 3 === 0 ? c3 : c2, 0.25 + R.next() * 0.4);
        x.beginPath();
        x.ellipse(cx + R.float(-r, r), cy + R.float(-r, r), R.float(r * 0.08, r * 0.45), R.float(r * 0.05, r * 0.25), R.float(0, 3), 0, Math.PI * 2);
        x.fill();
      }
      if (cls === 'N') { x.strokeStyle = 'rgba(255,120,30,.8)'; x.lineWidth = Math.max(1, r * 0.02); for (let i = 0; i < 9; i++) { x.beginPath(); let px = cx + R.float(-r, r), py = cy + R.float(-r, r); x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += R.float(-r * .2, r * .2); py += R.float(-r * .2, r * .2); x.lineTo(px, py); } x.stroke(); } }
    }
    // terminator shading (light from the left)
    const sh = x.createLinearGradient(cx - r, cy, cx + r, cy);
    sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.55, 'rgba(0,0,0,0.15)'); sh.addColorStop(1, 'rgba(0,0,0,0.85)');
    x.fillStyle = sh; x.fillRect(cx - r, cy - r, r * 2, r * 2);
    const hl = x.createRadialGradient(cx - r * 0.45, cy - r * 0.35, 0, cx - r * 0.45, cy - r * 0.35, r);
    hl.addColorStop(0, 'rgba(255,255,255,0.18)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = hl; x.fillRect(cx - r, cy - r, r * 2, r * 2);
    x.restore();
    if (pd.gas && (seed % 3 === 0)) {
      x.save(); x.strokeStyle = hexA(c3, 0.55); x.lineWidth = Math.max(1, r * 0.05);
      x.beginPath(); x.ellipse(cx, cy, r * 1.7, r * 0.35, -0.25, 0, Math.PI * 2); x.stroke(); x.restore();
    }
  };

  A.drawStar = function (x, cx, cy, r, color) {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r * 3.2);
    g.addColorStop(0, '#fff'); g.addColorStop(0.18, color); g.addColorStop(0.4, hexA(color, 0.35)); g.addColorStop(1, hexA(color, 0));
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r * 3.2, 0, Math.PI * 2); x.fill();
  };

  /** Top-down LCARS schematic. kind: player|federation|klingon|romulan|cardassian|ferengi|orion|unknown|species|borg|doomsday|derelict */
  A.drawShip = function (x, cx, cy, s, kind, color, rot, opt) {
    opt = opt || {};
    x.save();
    x.translate(cx, cy); x.rotate(rot || 0); x.scale(s, s);
    x.lineWidth = 2.2 / s * (opt.thin ? 0.6 : 1) * s; // keep ~2px regardless of scale
    x.lineWidth = 2 / s;
    x.strokeStyle = color; x.fillStyle = hexA(color, opt.alpha != null ? opt.alpha : 0.22);
    x.shadowColor = color; x.shadowBlur = opt.glow ? 12 : 0;
    const P = (pts, close) => { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); if (close !== false) x.closePath(); x.fill(); x.stroke(); };
    switch (kind) {
      case 'player': case 'federation':
        x.beginPath(); x.ellipse(-8, 0, 26, 24, 0, 0, Math.PI * 2); x.fill(); x.stroke();
        P([[14, -4], [40, -6], [46, 0], [40, 6], [14, 4]]);
        P([[26, -6], [30, -26], [36, -26]], false); P([[26, 6], [30, 26], [36, 26]], false);
        P([[28, -30], [70, -30], [72, -24], [30, -22]]); P([[28, 30], [70, 30], [72, 24], [30, 22]]);
        x.beginPath(); x.arc(-8, 0, 6, 0, Math.PI * 2); x.stroke();
        break;
      case 'klingon':
        x.beginPath(); x.ellipse(-34, 0, 12, 9, 0, 0, Math.PI * 2); x.fill(); x.stroke();
        P([[-24, -3], [4, -4], [4, 4], [-24, 3]]);
        P([[0, -8], [30, -46], [40, -44], [22, -6], [30, 0], [22, 6], [40, 44], [30, 46], [0, 8]]);
        break;
      case 'romulan':
        P([[-50, 0], [-30, -10], [10, -46], [40, -40], [20, -12], [44, 0], [20, 12], [40, 40], [10, 46], [-30, 10]]);
        x.beginPath(); x.ellipse(-6, 0, 10, 26, 0, 0, Math.PI * 2); x.stroke();
        break;
      case 'cardassian':
        P([[-52, 0], [-10, -26], [10, -30], [30, -14], [46, -20], [40, 0], [46, 20], [30, 14], [10, 30], [-10, 26]]);
        P([[-30, 0], [20, -6], [20, 6]]);
        break;
      case 'ferengi':
        P([[-40, 0], [-24, -18], [10, -40], [40, -34], [30, -14], [10, -10], [10, 10], [30, 14], [40, 34], [10, 40], [-24, 18]]);
        x.beginPath(); x.ellipse(-26, 0, 12, 10, 0, 0, Math.PI * 2); x.stroke();
        break;
      case 'orion':
        P([[-40, -4], [-10, -18], [26, -24], [40, -10], [24, -4], [24, 4], [40, 10], [26, 24], [-10, 18], [-40, 4]]);
        P([[-8, -18], [0, -34], [10, -22]], false); P([[-8, 18], [0, 34], [10, 22]], false);
        break;
      case 'borg':
        x.fillRect(-40, -40, 80, 80); x.strokeRect(-40, -40, 80, 80);
        for (let i = -30; i <= 30; i += 12) { x.beginPath(); x.moveTo(i, -40); x.lineTo(i, 40); x.moveTo(-40, i); x.lineTo(40, i); x.globalAlpha = 0.35; x.stroke(); x.globalAlpha = 1; }
        break;
      case 'doomsday':
        P([[-60, 0], [30, -34], [50, -26], [50, 26], [30, 34]]);
        x.fillStyle = 'rgba(255,160,60,0.5)'; x.beginPath(); x.ellipse(50, 0, 6, 26, 0, 0, Math.PI * 2); x.fill();
        break;
      case 'derelict':
        P([[-60, -6], [-20, -12], [10, -10], [16, -2], [6, 4], [-20, 12], [-60, 8]]);
        P([[24, -8], [58, -14], [62, 2], [30, 6]]);
        x.setLineDash([4 / s, 4 / s]); x.beginPath(); x.moveTo(10, -10); x.lineTo(24, -8); x.stroke(); x.setLineDash([]);
        break;
      default: // unknown / species: organic teardrop
        x.beginPath(); x.moveTo(-50, 0); x.bezierCurveTo(-30, -40, 30, -34, 46, 0); x.bezierCurveTo(30, 34, -30, 40, -50, 0); x.fill(); x.stroke();
        x.beginPath(); x.moveTo(-30, 0); x.bezierCurveTo(-10, -14, 20, -10, 34, 0); x.stroke();
    }
    x.restore();
  };

  // ------------------------------------------------------------ scenes
  function hexA(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  A.hexA = hexA;
  function nebula(x, w, h, R, cols, alpha) {
    alpha = alpha == null ? 1 : alpha;
    for (let i = 0; i < 18; i++) {
      const cx = R.float(0, w), cy = R.float(0, h), r = R.float(h * 0.2, h * 0.7), col = R.pick(cols);
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, hexA(col, 0.22 * alpha)); g.addColorStop(1, hexA(col, 0));
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    }
    A.stars(x, w, h, R, 60);
  }
  function warp(x, w, h, R) {
    const cx = w / 2, cy = h / 2;
    for (let i = 0; i < 260; i++) {
      const a = R.float(0, Math.PI * 2), d0 = R.float(8, w * 0.2), d1 = d0 + R.float(w * 0.08, w * 0.5);
      x.strokeStyle = 'rgba(' + (190 + R.int(0, 60)) + ',' + (210 + R.int(0, 40)) + ',255,' + R.float(0.2, 0.9).toFixed(2) + ')';
      x.lineWidth = R.float(0.5, 2);
      x.beginPath(); x.moveTo(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0); x.lineTo(cx + Math.cos(a) * d1, cy + Math.sin(a) * d1); x.stroke();
    }
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, h * 0.4);
    g.addColorStop(0, 'rgba(160,190,255,.35)'); g.addColorStop(1, 'rgba(160,190,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  }
  function storm(x, w, h, R) {
    nebula(x, w, h, R, ['#3a2a9a', '#6a3ad0', '#2a60c0']);
    x.strokeStyle = 'rgba(200,220,255,.8)';
    for (let i = 0; i < 7; i++) { x.lineWidth = R.float(0.7, 2); x.beginPath(); let px = R.float(0, w), py = R.float(0, h * 0.3); x.moveTo(px, py); for (let k = 0; k < 9; k++) { px += R.float(-30, 30); py += R.float(10, 40); x.lineTo(px, py); } x.stroke(); }
  }
  function rift(x, w, h, R) {
    nebula(x, w, h, R, ['#401060', '#102050'], 0.8);
    x.save(); x.translate(w / 2, h / 2); x.rotate(-0.4);
    for (let i = 0; i < 4; i++) {
      x.strokeStyle = ['#ffffff', '#ff66dd', '#66ccff', '#ffffff'][i]; x.lineWidth = [10, 6, 3, 1.5][i]; x.globalAlpha = [0.15, 0.4, 0.7, 1][i];
      x.beginPath(); x.moveTo(-w * 0.35, 0); for (let k = -w * 0.35; k < w * 0.35; k += 18) x.lineTo(k, R.float(-14, 14)); x.stroke();
    }
    x.restore();
  }
  function vortex(x, w, h, R, c1, c2) {
    const cx = w / 2, cy = h / 2;
    for (let i = 0; i < 500; i++) {
      const t = i / 500, a = t * 30, r = t * h * 0.6;
      x.fillStyle = hexA(i % 2 ? c1 : c2, (1 - t) * 0.7);
      x.beginPath(); x.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.55, (1 - t) * 3 + 0.5, 0, Math.PI * 2); x.fill();
    }
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, h * 0.18);
    g.addColorStop(0, '#fff'); g.addColorStop(1, hexA(c1, 0));
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, h * 0.18, 0, Math.PI * 2); x.fill();
  }
  function blackhole(x, w, h) {
    const cx = w / 2, cy = h / 2;
    x.save(); x.translate(cx, cy);
    for (let i = 0; i < 60; i++) { x.strokeStyle = hexA(i % 2 ? '#ffb070' : '#ffe0b0', 0.05 + i / 120); x.lineWidth = 2; x.beginPath(); x.ellipse(0, 0, h * 0.2 + i * 2.2, (h * 0.2 + i * 2.2) * 0.22, -0.2, 0, Math.PI * 2); x.stroke(); }
    x.fillStyle = '#000'; x.beginPath(); x.arc(0, 0, h * 0.17, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(255,200,140,.8)'; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, h * 0.175, 0, Math.PI * 2); x.stroke();
    x.restore();
  }
  function pulsar(x, w, h) {
    const cx = w / 2, cy = h / 2;
    x.save(); x.translate(cx, cy); x.rotate(-0.5);
    const g = x.createLinearGradient(0, -h, 0, h);
    g.addColorStop(0, 'rgba(150,200,255,0)'); g.addColorStop(0.5, 'rgba(200,230,255,.9)'); g.addColorStop(1, 'rgba(150,200,255,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(-3, 0); x.lineTo(-40, -h); x.lineTo(40, -h); x.lineTo(3, 0); x.lineTo(40, h); x.lineTo(-40, h); x.fill();
    x.restore();
    A.drawStar(x, cx, cy, 10, '#b9e3ff');
  }
  function entity(x, w, h, R) {
    const cx = w / 2, cy = h / 2;
    for (let i = 0; i < 70; i++) {
      const a = R.float(0, Math.PI * 2), len = R.float(h * 0.1, h * 0.42);
      const col = R.pick(['#ffffff', '#ff99ee', '#99eeff', '#ffee99', '#bb99ff']);
      x.strokeStyle = hexA(col, 0.6); x.lineWidth = R.float(1, 3);
      x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len * 0.8); x.stroke();
    }
    A.drawStar(x, cx, cy, 14, '#ffffff');
  }
  function asteroids(x, w, h, R) {
    for (let i = 0; i < 60; i++) {
      const cx = R.float(0, w), cy = R.float(0, h), r = R.float(2, h * 0.08);
      x.fillStyle = 'rgb(' + R.int(70, 130) + ',' + R.int(60, 110) + ',' + R.int(50, 90) + ')';
      x.beginPath(); for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, rr = r * R.float(0.7, 1.1); k ? x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : x.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill();
      x.fillStyle = 'rgba(0,0,0,.5)'; x.beginPath(); x.arc(cx + r * 0.3, cy + r * 0.2, r * 0.7, 0, Math.PI * 2); x.fill();
    }
  }
  function mega(x, w, h, R) {
    const cx = w / 2, cy = h / 2;
    A.drawStar(x, cx, cy, 18, '#ffe9a8');
    x.strokeStyle = 'rgba(80,70,60,.95)'; x.lineWidth = 16;
    for (let i = 0; i < 16; i++) { if (R.chance(0.3)) continue; const a0 = i / 16 * Math.PI * 2; x.beginPath(); x.arc(cx, cy, h * 0.36, a0, a0 + Math.PI * 2 / 16 - 0.04); x.stroke(); }
  }
  function station(x, cx, cy, s, col) {
    x.save(); x.translate(cx, cy);
    x.strokeStyle = col; x.fillStyle = hexA(col, 0.18); x.lineWidth = 2;
    x.beginPath(); x.ellipse(0, -s * 0.35, s * 0.8, s * 0.32, 0, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillRect(-s * 0.08, -s * 0.2, s * 0.16, s * 1.1); x.strokeRect(-s * 0.08, -s * 0.2, s * 0.16, s * 1.1);
    x.beginPath(); x.ellipse(0, s * 0.45, s * 0.45, s * 0.14, 0, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillStyle = '#ffe9a8';
    for (let i = -6; i <= 6; i++) x.fillRect(i * s * 0.1, -s * 0.36, 2, 2);
    x.restore();
  }
  function portrait(x, w, h, key, R, color) {
    const col = color || ({ portrait_admiral: '#9999ff', portrait_klingon: '#cc6666', portrait_romulan: '#66bb99', portrait_cardassian: '#c9a36b', portrait_ferengi: '#ff9c00', portrait_orion: '#88c070', portrait_borg: '#66cc66' }[key]) || '#cc99cc';
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, hexA(col, 0.25)); g.addColorStop(1, '#000');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = hexA(col, 0.55);
    x.beginPath(); x.ellipse(w / 2, h * 0.42, h * 0.16, h * 0.2, 0, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(w / 2, h * 1.02, h * 0.42, h * 0.38, 0, Math.PI, 0); x.fill();
    x.strokeStyle = hexA(col, 0.3); x.lineWidth = 1;
    for (let y = 0; y < h; y += 4) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); }
    x.fillStyle = col; x.font = '600 ' + Math.round(h * 0.06) + 'px Antonio, sans-serif'; x.textAlign = 'right';
    x.fillText('SUBSPACE CHANNEL OPEN', w - 16, 28);
  }
})();
