/* Science: system sensor display, scans, orbit, away teams, mining and
   investigating anomalies/derelicts. */
(function () {
  'use strict';
  const ST = window.ST, D = ST.DATA, U = ST.util, G = ST.galaxy;
  const A = ST.actions, UI = ST.ui;
  UI.sciSel = { kind: 'star', i: 0 };

  function bodies(sys) {
    const list = [{ kind: 'star', i: 0 }];
    sys.planets.forEach((p, i) => list.push({ kind: 'planet', i }));
    G.visiblePois(sys).forEach(p => { if (!['starbase', 'outpost', 'trade', 'colony'].includes(p.type) || true) list.push({ kind: 'poi', i: sys.pois.indexOf(p) }); });
    return list;
  }

  UI.station('science', {
    label: 'Science',
    render() {
      const S = ST.S, sys = G.here();
      if (UI.sciSel._sys !== sys.id) UI.sciSel = { kind: 'star', i: 0, _sys: sys.id };
      const sel = UI.sciSel;
      const list = bodies(sys).map(b => {
        const on = b.kind === sel.kind && b.i === sel.i;
        let name, sub, col;
        if (b.kind === 'star') { name = sys.name; sub = D.stars[sys.star].name; col = D.stars[sys.star].color; }
        else if (b.kind === 'planet') { const p = sys.planets[b.i]; name = p.name; sub = sys.scanned ? D.planets[p.cls].name + ' · ' + D.LIFE_LABELS[p.life] : 'Unscanned body'; col = D.planets[p.cls].colors[0]; }
        else { const p = sys.pois[b.i]; name = p.name || D.pois[p.type].name; sub = D.pois[p.type].name + (p.done ? ' · investigated' : ''); col = D.pois[p.type].color; }
        return '<button class="card' + (on ? ' sel' : '') + '" style="--c:' + col + ';text-align:left;border-top:0;border-right:0;border-bottom:0;cursor:pointer;color:inherit;font-family:inherit" data-act="sciSel" data-arg="' + b.kind + ':' + b.i + '"><h3 style="font-size:18px">' + U.esc(name) + '</h3><div class="muted" style="font-size:14px">' + U.esc(sub) + '</div></button>';
      }).join('');
      return '<div class="hdr" style="--c:var(--blue)"><span class="cap"></span><span class="t">Sensors · ' + U.esc(sys.name) + '</span><span class="fill"></span><span class="tag">' + (sys.scanned ? 'SURVEYED' : 'NOT SURVEYED') + '</span></div>' +
        '<div class="canvas-wrap sys-wrap"><canvas id="sysCanvas" aria-label="System display"></canvas></div>' +
        '<div class="cols" style="margin-top:14px"><div class="stack">' + detail(sys, sel) + '</div>' +
        '<div class="stack"><div class="row">' + (sys.scanned && !ST.missions.wantsScan(sys.id) ? '' : '<button class="lc-btn c-blue" data-act="sciScan">Full system scan · 0.25 days</button>') + '<button class="lc-btn c-sky ghost" data-act="sciLong">Long-range scan · 0.2 days</button></div>' +
        '<div class="sub-h">Stellar bodies</div><div class="list">' + list + '</div></div></div>';
    },
    mount(main) {
      const c = main.querySelector('#sysCanvas');
      drawSystem(c);
      c.addEventListener('click', (e) => {
        const r = c.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
        let best = null, bd = 40;
        (c._hits || []).forEach(h => { const d = Math.hypot(h.x - mx, h.y - my) - h.r; if (d < bd) { bd = d; best = h; } });
        if (best) { UI.sciSel = { kind: best.kind, i: best.i, _sys: ST.S.location }; ST.audio.play('select'); UI.renderMain(); }
      });
    }
  });

  function detail(sys, sel) {
    const S = ST.S;
    const busy = UI.busy();
    const dis = busy ? ' disabled' : '';
    if (sel.kind === 'star') {
      const st = D.stars[sys.star];
      return '<div class="hdr" style="--c:' + st.color + '"><span class="cap"></span><span class="t">' + U.esc(sys.name) + '</span><span class="fill"></span><span class="end"></span></div>' +
        '<dl class="kv"><dt>Classification</dt><dd>' + st.name + '</dd><dt>Territory</dt><dd>' + U.esc(G.describe(sys)) + '</dd><dt>Planets</dt><dd>' + sys.planets.length + '</dd>' +
        '<dt>Survey</dt><dd>' + (sys.scanned ? 'Complete' : 'Run a full system scan to classify planets and find hidden objects.') + '</dd></dl>' +
        (sys.star === 'BH' ? '<p class="warnc">Gravitational shear is extreme. Keep your distance.</p>' : sys.star === 'NS' ? '<p class="warnc">Intense radiation from the pulsar.</p>' : '');
    }
    if (sel.kind === 'planet') {
      const p = sys.planets[sel.i]; if (!p) return '';
      const pd = D.planets[p.cls];
      const orbiting = S.orbit === sel.i;
      const sp = p.species ? S.species[p.species] : null;
      const known = sys.scanned;
      let facts = '<dt>Class</dt><dd>' + (known ? pd.name + ' · ' + pd.kind : 'Unknown') + '</dd>';
      facts += '<dt>Lifesigns</dt><dd>' + (known ? D.LIFE_LABELS[p.life] + (sp && (sp.met || p.scanned) ? ' · ' + U.esc(sp.name) : '') : 'Unknown') + '</dd>';
      if (p.scanned) {
        facts += '<dt>Dilithium</dt><dd>' + (p.dilithium && !p.mined ? ['', 'Trace deposits', 'Rich deposits', 'Major lode'][p.dilithium] : p.mined ? 'Mined out' : 'None') + '</dd>';
        facts += '<dt>Ruins</dt><dd>' + (p.ruins ? '<span class="hi">Artificial structures detected</span>' : 'None') + '</dd>';
        if (p.colony) facts += '<dt>Settlement</dt><dd>Colony</dd>';
      }
      const acts = [];
      if (!p.scanned) acts.push('<button class="lc-btn c-blue" data-act="sciPlanetScan" data-arg="' + sel.i + '"' + dis + '>Detailed scan · 0.1 days</button>');
      if (!orbiting) acts.push('<button class="lc-btn c-peach" data-act="sciOrbit" data-arg="' + sel.i + '"' + dis + '>Standard orbit</button>');
      if (orbiting && !pd.gas && !p.explored) acts.push('<button class="lc-btn c-orange" data-act="sciAway" data-arg="' + sel.i + '"' + dis + '>Send away team</button>');
      if (orbiting && p.scanned && p.dilithium > 0 && !p.mined) acts.push('<button class="lc-btn c-lilac" data-act="sciMine" data-arg="' + sel.i + '"' + dis + '>Mine dilithium · 1 day</button>');
      if (sp && !sp.prewarp) acts.push('<button class="lc-btn c-sky" data-act="hailPlanet" data-arg="' + sel.i + '"' + dis + '>Hail the planet</button>');
      return '<div class="hdr" style="--c:' + pd.colors[0] + '"><span class="cap"></span><span class="t">' + U.esc(p.name) + '</span><span class="fill"></span><span class="tag">' + (orbiting ? 'IN ORBIT' : known ? pd.name.toUpperCase() : 'UNKNOWN') + '</span></div>' +
        (known ? ST.art.html(pd.art, { label: p.name, seed: p.seed }) : '') +
        '<dl class="kv" style="margin-top:10px">' + facts + '</dl>' +
        (p.explored ? '<p class="muted">An away team has already surveyed this world.</p>' : '') +
        (pd.gas && orbiting ? '<p class="muted">Gas giants cannot support an away team.</p>' : '') +
        (sp && sp.prewarp ? '<p class="warnc">Pre-warp civilisation. The Prime Directive forbids contact. Observation only.</p>' : '') +
        '<div class="row" style="margin-top:10px">' + acts.join('') + '</div>';
    }
    const poi = sys.pois[sel.i]; if (!poi) return '';
    const pd = D.pois[poi.type];
    const art = poi.type === 'anomaly' ? ((D.ANOMALY_KINDS.find(k => k.id === poi.kind) || {}).art || 'rift') : pd.art;
    const acts = [];
    let note = '';
    if (['anomaly', 'megastructure', 'wormhole'].includes(poi.type)) { if (!poi.done) acts.push('<button class="lc-btn c-blue" data-act="sciInvestigate" data-arg="' + sel.i + '"' + dis + '>Investigate</button>'); else note = 'Already investigated.'; }
    if (poi.type === 'derelict') { if (!poi.done) acts.push('<button class="lc-btn c-tan" data-act="sciInvestigate" data-arg="' + sel.i + '"' + dis + '>Board the derelict</button>'); else note = 'Salvaged.'; }
    if (poi.type === 'asteroids') { if (!poi.mined) acts.push('<button class="lc-btn c-lilac" data-act="sciMineRoids" data-arg="' + sel.i + '"' + dis + '>Mine the field · 1 day</button>'); else note = 'Worked out.'; }
    if (poi.type === 'nebula') { if (!poi.done) acts.push('<button class="lc-btn c-violet" data-act="sciNebula" data-arg="' + sel.i + '"' + dis + '>Collect particle samples · 0.5 days</button>'); else note = 'Samples collected.'; }
    if (['starbase', 'trade', 'outpost'].includes(poi.type)) { if (G.station(sys) === poi && !S.docked) acts.push('<button class="lc-btn c-lilac" data-act="dock"' + dis + '>Dock</button>'); else if (poi.type === 'outpost') note = 'They will not let you dock unless relations improve.'; }
    if (poi.type === 'colony') { const pl = sys.planets.find(p => p.name === poi.planet); if (pl && !pl.explored) acts.push('<button class="lc-btn c-green" data-act="sciColony" data-arg="' + sys.planets.indexOf(pl) + '"' + dis + '>Visit the colony</button>'); }
    return '<div class="hdr" style="--c:' + pd.color + '"><span class="cap"></span><span class="t">' + U.esc(poi.name || pd.name) + '</span><span class="fill"></span><span class="end"></span></div>' +
      ST.art.html(art, { label: poi.name || pd.name }) +
      (note ? '<p class="muted">' + note + '</p>' : '') + '<div class="row" style="margin-top:10px">' + acts.join('') + '</div>';
  }

  function drawSystem(c) {
    const S = ST.S, sys = G.here();
    const f = ST.art.fit(c, 800, 300); const x = f.x, w = f.w, h = f.h;
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    ST.art.stars(x, w, h, new ST.RNG(sys.id + 11), 120);
    const hits = [];
    const sx = Math.min(70, w * 0.08), cy = h * 0.5;
    const st = D.stars[sys.star];
    if (sys.star === 'BH') { x.fillStyle = '#000'; x.strokeStyle = '#ffb070'; x.lineWidth = 3; x.beginPath(); x.ellipse(sx, cy, 30, 8, 0, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.arc(sx, cy, 14, 0, Math.PI * 2); x.fill(); }
    else ST.art.drawStar(x, sx, cy, st.r * 1.3, st.color);
    hits.push({ kind: 'star', i: 0, x: sx, y: cy, r: 30 });
    const n = sys.planets.length;
    const span = w - sx - 140;
    sys.planets.forEach((p, i) => {
      const px = sx + 90 + (n > 1 ? span * (i / (n - 1)) * 0.85 : span * 0.3);
      x.strokeStyle = 'rgba(153,153,255,.18)'; x.lineWidth = 1;
      x.beginPath(); x.arc(sx, cy, px - sx, -0.45, 0.45); x.stroke();
      const r = Math.max(7, Math.min(h * 0.16, 14 * p.size * Math.min(1.4, w / 800)));
      if (sys.scanned) ST.art.drawPlanet(x, px, cy, r, p.cls, p.seed);
      else { x.fillStyle = '#3a2e22'; x.beginPath(); x.arc(px, cy, r, 0, Math.PI * 2); x.fill(); }
      const on = UI.sciSel.kind === 'planet' && UI.sciSel.i === i;
      if (on) { x.strokeStyle = '#fff3e0'; x.lineWidth = 1.5; x.setLineDash([4, 3]); x.beginPath(); x.arc(px, cy, r + 8, 0, Math.PI * 2); x.stroke(); x.setLineDash([]); }
      if (S.orbit === i) { x.fillStyle = '#ff9c00'; x.beginPath(); x.moveTo(px, cy - r - 16); x.lineTo(px + 6, cy - r - 26); x.lineTo(px - 6, cy - r - 26); x.closePath(); x.fill(); }
      x.fillStyle = '#ffcc99'; x.font = '400 13px Antonio, sans-serif'; x.textAlign = 'center';
      x.fillText(U.roman(i + 1) + (sys.scanned ? ' · ' + p.cls : ''), px, cy + r + 18);
      if (p.species && sys.scanned) { x.fillStyle = '#99ccff'; x.fillText('◆ LIFE', px, cy + r + 32); }
      else if (p.ruins && p.scanned) { x.fillStyle = '#ff9c00'; x.fillText('◆ RUINS', px, cy + r + 32); }
      x.textAlign = 'left';
      hits.push({ kind: 'planet', i, x: px, y: cy, r });
    });
    const pois = G.visiblePois(sys);
    pois.forEach((p, j) => {
      const px = w - 60, py = 36 + j * Math.min(56, (h - 50) / Math.max(1, pois.length));
      const col = D.pois[p.type].color;
      x.strokeStyle = col; x.fillStyle = ST.art.hexA(col, 0.2); x.lineWidth = 2;
      x.beginPath();
      if (['starbase', 'outpost', 'trade'].includes(p.type)) { x.rect(px - 9, py - 9, 18, 18); }
      else if (p.type === 'anomaly' || p.type === 'wormhole') { for (let a = 0; a < 12; a += 0.4) { const r = a * 0.9; a ? x.lineTo(px + Math.cos(a) * r, py + Math.sin(a) * r) : x.moveTo(px, py); } }
      else if (p.type === 'derelict') { x.moveTo(px - 10, py + 6); x.lineTo(px + 10, py - 2); x.lineTo(px + 2, py + 8); x.closePath(); }
      else x.arc(px, py, 9, 0, Math.PI * 2);
      x.fill(); x.stroke();
      const on = UI.sciSel.kind === 'poi' && UI.sciSel.i === sys.pois.indexOf(p);
      if (on) { x.strokeStyle = '#fff3e0'; x.setLineDash([4, 3]); x.beginPath(); x.arc(px, py, 16, 0, Math.PI * 2); x.stroke(); x.setLineDash([]); }
      x.fillStyle = col; x.font = '400 12px Antonio, sans-serif'; x.textAlign = 'right';
      x.fillText(D.pois[p.type].name.toUpperCase(), px - 16, py + 4); x.textAlign = 'left';
      hits.push({ kind: 'poi', i: sys.pois.indexOf(p), x: px, y: py, r: 12 });
    });
    c._hits = hits;
  }

  // ---------------------------------------------------------------- actions
  function guard() { if (UI.busy()) { ST.audio.play('deny'); return false; } return true; }
  A.sciSel = (arg) => { const [k, i] = arg.split(':'); UI.sciSel = { kind: k, i: +i, _sys: ST.S.location }; ST.audio.play('select'); UI.renderMain(); };
  A.sciScan = function () {
    const S = ST.S, sys = G.here();
    const rescan = sys.scanned;
    if (!guard() || (rescan && !ST.missions.wantsScan(sys.id))) return;
    sys.scanned = true;
    ST.advanceTime(0.25);
    ST.audio.play('scan');
    const hidden = rescan ? [] : sys.pois.filter(p => p.hidden);
    const sci = ST.crew.best('science').officer;
    if (sci) ST.crew.addXp(sci, 5);
    ST.log('Completed a sensor survey of the ' + sys.name + ' system.' + (hidden.length ? ' Sensors found: ' + hidden.map(p => p.name || D.pois[p.type].name).join(', ') + '.' : ''));
    UI.toast('Survey complete' + (hidden.length ? ' · ' + hidden.length + ' new contact' + (hidden.length > 1 ? 's' : '') : ''), '#9999ff');
    ST.missions.trigger('scan', sys.id);
    if (UI.cur !== 'science') UI.go('science'); else UI.render();
    ST.story.pump();
    ST.save();
  };
  A.sciLong = function () {
    const S = ST.S;
    if (!guard()) return;
    ST.advanceTime(0.2);
    ST.audio.play('scan');
    let n = 0;
    S.galaxy.systems.forEach(s => { if (!s.known && G.hops(S.location, s.id) <= 2) { s.known = true; n++; } });
    UI.toast(n ? 'Long-range scan charted ' + n + ' system' + (n > 1 ? 's' : '') : 'No new systems in sensor range', '#9999ff');
    UI.render(); ST.story.pump(); ST.save();
  };
  A.sciPlanetScan = function (i) {
    const sys = G.here(), p = sys.planets[+i];
    if (!guard() || !p) return;
    if (!sys.scanned) { sys.scanned = true; ST.missions.trigger('scan', sys.id); }
    p.scanned = true;
    ST.advanceTime(0.1);
    ST.audio.play('scan');
    const sci = ST.crew.best('science').officer; if (sci) ST.crew.addXp(sci, 3);
    const finds = [];
    if (p.dilithium) finds.push('dilithium');
    if (p.ruins) finds.push('ruins');
    if (p.species) { const sp = ST.S.species[p.species]; finds.push(sp.prewarp ? 'a pre-warp civilisation' : 'a warp-capable species'); }
    if (finds.length) ST.log('Detailed scan of ' + p.name + ' found ' + finds.join(' and ') + '.');
    UI.render(); ST.story.pump(); ST.save();
  };
  A.sciOrbit = function (i) {
    const S = ST.S;
    if (!guard()) return;
    S.orbit = +i; S.docked = false;
    ST.audio.play('select');
    UI.renderMain(); ST.save();
  };
  A.sciAway = function (i) {
    const sys = G.here(), p = sys.planets[+i];
    if (!guard() || !p || p.explored) return;
    if (!p.scanned) { p.scanned = true; }
    const ok = ST.story.runEvent('away', { planet: p }, (result) => { if (result !== 'aborted') p.explored = true; });
    if (!ok) { p.explored = true; UI.toast('The away team finds nothing of note on ' + p.name, '#ffcc99'); ST.log('Away team surveyed ' + p.name + '. Nothing of note.'); ST.advanceTime(0.3); UI.render(); ST.save(); }
  };
  A.sciColony = function (i) {
    const sys = G.here(), p = sys.planets[+i];
    if (!guard() || !p) return;
    ST.S.orbit = +i;
    A.sciAway(i);
  };
  A.sciMine = function (i) {
    const S = ST.S, p = G.here().planets[+i];
    if (!guard() || !p || !p.dilithium || p.mined) return;
    const amt = p.dilithium * ST.rng.int(3, 5);
    const got = ST.res.add('dilithium', amt);
    p.mined = true;
    ST.advanceTime(1);
    ST.audio.play('transporter');
    ST.log('Mined ' + got + ' units of dilithium on ' + p.name + '.', 'good');
    UI.toast('Dilithium +' + got, '#cc99cc');
    UI.render(); ST.story.pump(); ST.save();
  };
  A.sciMineRoids = function (i) {
    const poi = G.here().pois[+i];
    if (!guard() || !poi || poi.mined) return;
    poi.mined = true;
    const sp = ST.res.add('spares', ST.rng.int(2, 4)), dl = ST.res.add('dilithium', ST.rng.int(1, 3));
    ST.advanceTime(1);
    ST.audio.play('phaser');
    ST.log('Mined the asteroid field: ' + sp + ' spares, ' + dl + ' dilithium.', 'good');
    UI.toast('Spares +' + sp + ' · Dilithium +' + dl, '#ffcc66');
    if (ST.rng.chance(0.3)) ST.story.enqueue(() => ST.story.runEvent('arrival', {}, null));
    UI.render(); ST.story.pump(); ST.save();
  };
  A.sciNebula = function (i) {
    const poi = G.here().pois[+i];
    if (!guard() || !poi || poi.done) return;
    poi.done = true;
    ST.advanceTime(0.5);
    ST.res.add('renown', 1);
    const sci = ST.crew.best('science').officer; if (sci) ST.crew.addXp(sci, 12);
    ST.audio.play('scan');
    ST.log('Collected particle samples from the ' + poi.name + '. The science labs are delighted.');
    UI.toast('Renown +1 · science experience', '#a57fd8');
    UI.render(); ST.story.pump(); ST.save();
  };
  A.sciInvestigate = function (i) {
    const poi = G.here().pois[+i];
    if (!guard() || !poi || poi.done) return;
    const ctx = poi.type === 'derelict' ? 'derelict' : 'anomaly';
    const ok = ST.story.runEvent(ctx, { poi }, (result) => { if (result !== 'aborted') poi.done = true; });
    if (!ok) { poi.done = true; UI.toast('Sensors find nothing further', '#9999ff'); UI.render(); }
  };
})();
