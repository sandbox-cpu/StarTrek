/* Procedural sound effects with Web Audio. No audio files needed.
   Audio starts only after the first user gesture (browser policy). */
(function () {
  'use strict';
  const ST = window.ST;
  const A = ST.audio = { enabled: true, ctx: null, master: null, _noise: null, _alertTimer: null };

  try { const v = localStorage.getItem('fc-audio'); if (v === 'off') A.enabled = false; } catch (e) { /* storage blocked */ }

  function ctx() {
    if (!A.enabled) return null;
    if (!A.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        A.ctx = new AC();
        A.master = A.ctx.createGain();
        A.master.gain.value = 0.32;
        A.master.connect(A.ctx.destination);
      } catch (e) { A.enabled = false; return null; }
    }
    if (A.ctx.state === 'suspended') A.ctx.resume();
    return A.ctx;
  }
  function noiseBuffer(c) {
    if (A._noise) return A._noise;
    const len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return (A._noise = b);
  }
  function tone(freq, dur, opts) {
    const c = ctx(); if (!c) return;
    opts = opts || {};
    const t = c.currentTime + (opts.delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    const v = opts.vol == null ? 0.35 : opts.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (opts.attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(A.master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, opts) {
    const c = ctx(); if (!c) return;
    opts = opts || {};
    const t = c.currentTime + (opts.delay || 0);
    const s = c.createBufferSource(); s.buffer = noiseBuffer(c);
    const f = c.createBiquadFilter(); f.type = opts.filter || 'lowpass';
    f.frequency.setValueAtTime(opts.from || 2000, t);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    f.Q.value = opts.q || 1;
    const g = c.createGain();
    const v = opts.vol == null ? 0.4 : opts.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (opts.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(A.master);
    s.start(t); s.stop(t + dur + 0.05);
  }

  // LCARS console chirps: short sine blips at "computer" pitches.
  const CHIRPS = [[1318, 1760], [1568, 1175], [1760, 2093], [1175, 1568], [2093, 1568]];
  A.click = function () { const p = CHIRPS[Math.floor(Math.random() * CHIRPS.length)]; tone(p[0], 0.06, { vol: 0.18 }); tone(p[1], 0.07, { vol: 0.16, delay: 0.055 }); };
  A.select = function () { tone(1760, 0.05, { vol: 0.16 }); tone(2349, 0.09, { vol: 0.14, delay: 0.05 }); };
  A.deny = function () { tone(330, 0.16, { type: 'square', vol: 0.08 }); tone(262, 0.2, { type: 'square', vol: 0.08, delay: 0.14 }); };
  A.success = function () { [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.12, { vol: 0.14, delay: i * 0.07 })); };
  A.fail = function () { [784, 622, 523].forEach((f, i) => tone(f, 0.18, { vol: 0.14, type: 'triangle', delay: i * 0.1 })); };
  A.hail = function () { [880, 1175, 1568].forEach((f, i) => tone(f, 0.18, { vol: 0.16, type: 'sine', delay: i * 0.12 })); tone(2093, 0.35, { vol: 0.12, delay: 0.36 }); };
  A.scan = function () { tone(600, 0.9, { to: 2400, vol: 0.08, type: 'sine' }); tone(1200, 0.9, { to: 300, vol: 0.05, type: 'triangle', delay: 0.1 }); };
  A.transporter = function () {
    for (let i = 0; i < 14; i++) tone(2400 + Math.random() * 1800, 0.18, { vol: 0.035, delay: i * 0.08 });
    noise(1.4, { filter: 'bandpass', from: 5000, to: 9000, q: 3, vol: 0.12, attack: 0.3 });
  };
  A.phaser = function () {
    tone(1400, 0.55, { to: 1100, type: 'sawtooth', vol: 0.07 });
    tone(2100, 0.55, { to: 1700, type: 'square', vol: 0.03 });
    noise(0.55, { filter: 'bandpass', from: 3000, to: 2000, q: 6, vol: 0.12 });
  };
  A.disruptor = function () { tone(520, 0.35, { to: 180, type: 'sawtooth', vol: 0.09 }); noise(0.3, { filter: 'lowpass', from: 1800, to: 300, vol: 0.15 }); };
  A.torpedo = function () { tone(900, 0.45, { to: 220, type: 'sine', vol: 0.2 }); noise(0.25, { filter: 'bandpass', from: 1500, to: 600, q: 2, vol: 0.2 }); };
  A.hit = function () { noise(0.4, { filter: 'lowpass', from: 900, to: 120, vol: 0.45 }); tone(90, 0.35, { to: 45, vol: 0.35 }); };
  A.shieldHit = function () { tone(420, 0.25, { to: 260, type: 'triangle', vol: 0.12 }); noise(0.2, { filter: 'highpass', from: 2500, vol: 0.06 }); };
  A.explosion = function () { noise(1.6, { filter: 'lowpass', from: 1400, to: 60, vol: 0.6, attack: 0.02 }); tone(70, 1.2, { to: 30, vol: 0.4 }); };
  A.warp = function () {
    noise(2.2, { filter: 'bandpass', from: 200, to: 3000, q: 1.5, vol: 0.25, attack: 0.6 });
    tone(110, 1.8, { to: 440, type: 'sawtooth', vol: 0.05, attack: 0.5 });
    tone(55, 2.2, { to: 220, vol: 0.15, attack: 0.4 });
  };
  A.alert = function (times) {
    // Red alert klaxon: a rising "whoop"
    times = times || 3;
    for (let i = 0; i < times; i++) {
      tone(420, 0.55, { to: 980, type: 'sawtooth', vol: 0.07, delay: i * 0.9, attack: 0.05 });
      tone(840, 0.55, { to: 1960, type: 'square', vol: 0.02, delay: i * 0.9, attack: 0.05 });
    }
  };
  A.yellow = function () { tone(988, 0.25, { vol: 0.12 }); tone(740, 0.35, { vol: 0.12, delay: 0.22 }); };
  A.levelUp = function () { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.16, { vol: 0.12, type: 'triangle', delay: i * 0.09 })); };

  A.setEnabled = function (on) {
    A.enabled = !!on;
    try { localStorage.setItem('fc-audio', on ? 'on' : 'off'); } catch (e) { /* ignore */ }
    if (!on && A.ctx) { try { A.ctx.suspend(); } catch (e) { /* ignore */ } }
    if (on) ctx();
  };
  A.play = function (name) { try { if (A.enabled && A[name]) A[name](); } catch (e) { /* never let audio break the game */ } };
})();
