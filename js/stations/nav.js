/* Navigation: stellar cartography map, route plotting, warp travel and the
   arrival sequence (contacts, mission triggers, encounters, events). */
(function () {
  'use strict';
  const ST = window.ST, D = ST.DATA, U = ST.util, G = ST.galaxy;
  const A = ST.actions;
  const UI = ST.ui;
  UI.navSel = null;

  // ================================================================ travel
  const T = ST.travel = { active: null };

  T.start = function (dest) {
    const S = ST.S;
    if (UI.busy()) return;
    const path = G.path(S.location, dest);
    if (!path || path.length < 2) return;
    const info = G.routeInfo(path, S.warp);
    const firstLeg = G.legInfo(path[0], path[1], S.warp);
    if (S.res.dilithium + 1e-9 < firstLeg.dil) { UI.toast('Not enough dilithium for the first jump', '#cc6666'); ST.audio.play('deny'); return; }
    if (S.res.dilithium + 1e-9 < info.dil) UI.toast('Warning: not enough dilithium for the whole route', '#ffcc66');
    T.active = { path, i: 0, dest, warp: S.warp, leg: null };
    S.orbit = null; S.docked = false; S.contacts = [];
    UI.setAlert('none');
    UI.setNavLocked(true);
    ST.audio.play('warp');
    ST.log('Course laid in for ' + G.sys(dest).name + ', warp ' + S.warp + '.');
    UI.go('bridge', true);
    setTimeout(hop, 900);
  };
  T.abort = function () { if (T.active) T.active.aborted = true; };

  function finalize(msg) {
    T.active = null;
    UI.setNavLocked(false);
    if (msg) UI.toast(msg, '#ffcc66');
    UI.autoAlert();
    UI.render();
    ST.save();
  }

  function hop() {
    const t = T.active, S = ST.S;
    if (!t) return;
    if (t.aborted || S.over) return finalize(t.aborted ? 'Course abandoned.' : null);
    const from = t.path[t.i], to = t.path[t.i + 1];
    const leg = G.legInfo(from, to, t.warp);
    if (S.res.dilithium + 1e-9 < leg.dil) return finalize('Insufficient dilithium. Holding at ' + G.sys(from).name + '.');
    ST.res.add('dilithium', -leg.dil);
    S.stats.jumps++; S.stats.ly = Math.round((S.stats.ly + leg.ly) * 10) / 10;
    S.prevLocation = from;
    ST.advanceTime(leg.days);
    if (t.warp >= 9 && ST.rng.chance(0.18)) {
      S.ship.systems.engines = Math.max(0, S.ship.systems.engines - 12);
      ST.log('Sustained warp 9 strains the engines.', 'warn');
      UI.toast('Engine strain · engines −12%', '#ffcc66');
    }
    t.leg = { from, to };
    UI.render();
    const gd = D.GAME_DIFFICULTY[S.difficulty];
    const chance = gd.eventChance * U.clamp(leg.dist / 140, 0.5, 1.5);
    if (ST.rng.chance(chance)) ST.story.enqueue(() => ST.story.runEvent('travel', {}, null));
    setTimeout(() => {
      ST.story.whenIdle(() => {
        if (!T.active) return;
        if (S.over) return;
        if (T.active.aborted) return finalize('Course abandoned.');
        arrive(to);
      });
    }, 700);
  }

  function arrive(to) {
    const t = T.active, S = ST.S;
    t.i++;
    const final = t.i >= t.path.length - 1;
    const before = ST.story.runs;
    ST.arrive(to);
    ST.story.whenIdle(() => {
      if (!T.active) return;
      if (S.over) return;
      const interrupted = ST.story.runs > before || S.location !== to || T.active.aborted;
      if (final) return finalize(null);
      if (interrupted) return finalize('Course interrupted at ' + G.here().name + '. Re-plot to continue.');
      t.leg = null;
      setTimeout(hop, 500);
    });
  }

  /** Arrival at a system: visit, contacts, triggers and encounters are queued. */
  ST.arrive = function (id) {
    const S = ST.S;
    S.location = id; S.orbit = null; S.docked = false;
    G.visit(id);
    G.rollContacts(G.sys(id));
    UI.autoAlert();
    UI.render();
    ST.missions.trigger('arrive', id);
    const hostile = S.contacts.find(c => c.attitude === 'hostile');
    if (hostile) {
      ST.story.enqueue(() => {
        if (!S.contacts.includes(hostile) || hostile.attitude !== 'hostile') return false;
        UI.setAlert('red'); ST.audio.play('alert');
        if (ST.story.runEvent('encounter', { them: hostile.faction, contact: hostile }, null)) return true;
        ST.combat.start({ enemies: [{ faction: hostile.faction, cls: hostile.ship, name: hostile.name, contactId: hostile.id }], canFlee: true, canHail: true, intro: hostile.name + ' attacks without warning!' });
        return true;
      });
    } else if (ST.rng.chance(0.24)) {
      ST.story.enqueue(() => ST.story.runEvent('arrival', {}, null));
    }
    ST.story.pump();
  };

  /** Stranded with no fuel: request a tow from Starfleet. */
  A.navTow = function () {
    const S = ST.S;
    if (UI.busy()) return;
    const home = G.sys(S.galaxy.home);
    ST.res.add('renown', -10); ST.res.add('morale', -10);
    ST.advanceTime(6);
    ST.res.add('dilithium', 12 - S.res.dilithium > 0 ? 12 - S.res.dilithium : 0);
    ST.log('Stranded without dilithium. A Starfleet tug towed us to ' + home.name + '.', 'warn');
    UI.toast('Towed to ' + home.name + ' · Renown −10', '#ffcc66');
    S.prevLocation = S.location;
    ST.arrive(home.id);
    ST.save();
  };

  // ================================================================ station
  UI.station('nav', {
    label: 'Navigation',
    render() {
      const S = ST.S;
      const sel = UI.navSel != null ? G.sys(UI.navSel) : null;
      let panel = '';
      if (sel && sel.id !== S.location) {
        const path = G.path(S.location, sel.id);
        const info = path ? G.routeInfo(path, S.warp) : null;
        const f = G.factionOf(sel);
        const ms = S.missions.active.filter(m => ST.missions.targetSystem(m) === sel.id);
        const warps = [4, 5, 6, 7, 8, 9].map(w => '<button class="lc-btn sm ' + (w >= 9 ? 'c-red' : w >= 8 ? 'c-tan' : 'c-peach') + (S.warp === w ? ' on' : '') + '" data-act="navWarp" data-arg="' + w + '">' + w + '</button>').join('');
        const enough = info && S.res.dilithium + 1e-9 >= info.dil;
        panel = '<div class="hdr" style="--c:var(--peach)"><span class="cap"></span><span class="t">' + U.esc(sel.name) + '</span><span class="fill"></span><span class="tag">' + (sel.visited ? 'VISITED' : sel.known ? 'CHARTED' : 'UNCHARTED') + '</span></div>' +
          '<dl class="kv"><dt>Territory</dt><dd>' + U.esc(G.describe(sel)) + '</dd>' +
          (sel.visited ? '<dt>Star</dt><dd>' + D.stars[sel.star].name + '</dd><dt>Planets</dt><dd>' + sel.planets.length + '</dd>' : '<dt>Survey</dt><dd class="muted">No data. Travel there to learn more.</dd>') +
          (sel.visited && G.visiblePois(sel).length ? '<dt>Features</dt><dd>' + G.visiblePois(sel).map(p => U.esc(p.name || D.pois[p.type].name)).join(', ') + '</dd>' : '') +
          (ms.length ? '<dt>Missions</dt><dd style="color:var(--lilac)">' + ms.map(m => U.esc(m.title)).join('<br>') + '</dd>' : '') +
          (info ? '<dt>Route</dt><dd>' + info.hops + ' jump' + (info.hops > 1 ? 's' : '') + ' · ' + U.fmt1(info.ly) + ' ly</dd><dt>Travel time</dt><dd>' + U.fmt1(info.days) + ' days</dd><dt>Dilithium</dt><dd class="' + (enough ? '' : 'bad') + '">' + info.dil + ' of ' + S.res.dilithium + '</dd>' : '<dt>Route</dt><dd class="bad">No known route</dd>') +
          '</dl>' +
          '<div class="sub-h">Warp factor</div><div class="warp-sel">' + warps + '</div>' +
          '<p class="muted" style="font-size:15px">Higher warp is faster but burns more dilithium. Warp 9 can strain the engines.</p>' +
          '<div class="row" style="margin-top:10px"><button class="lc-btn lg c-orange" data-act="navEngage"' + (info && !UI.busy() ? '' : ' disabled') + '>Engage</button><button class="lc-btn c-peach ghost" data-act="navClear">Clear</button></div>';
      } else {
        const here = G.here();
        const stranded = G.stranded();
        panel = '<div class="hdr" style="--c:var(--peach)"><span class="cap"></span><span class="t">Stellar cartography</span><span class="fill"></span><span class="end"></span></div>' +
          '<div class="prose" style="font-size:18px"><p>Select a system on the chart to plot a course. Routes follow charted warp lanes. Visiting a system charts its neighbours.</p></div>' +
          '<dl class="kv"><dt>Position</dt><dd>' + U.esc(here.name) + '</dd><dt>Warp</dt><dd>' + S.warp + '</dd><dt>Dilithium</dt><dd>' + S.res.dilithium + '</dd><dt>Charted</dt><dd>' + S.galaxy.systems.filter(s => s.known).length + ' of ' + S.galaxy.systems.length + ' systems</dd></dl>' +
          (stranded ? '<div class="card" style="--c:var(--red);margin-top:12px"><h3>Stranded</h3><p>Not enough dilithium to reach any neighbouring system. Mine a planet or asteroid field if you can, or call for a tow.</p><button class="lc-btn c-red" data-act="navTow">Request a Starfleet tow (−10 renown, 6 days)</button></div>' : '');
      }
      const legend = [['#9999ff', 'Federation'], ['#cc99cc', 'Mission target'], ['#ff9c00', 'Your ship'], ['#8a7a66', 'Uncharted']].map(l => '<span class="row" style="gap:6px"><i style="width:10px;height:10px;border-radius:99px;background:' + l[0] + ';display:inline-block"></i><span class="muted" style="font-size:14px">' + l[1] + '</span></span>').join('');
      const facs = [...new Set(S.galaxy.systems.filter(s => s.faction && s.known).map(s => s.faction))].map(fid => { const f = ST.faction(fid); return '<span class="chip o" style="--c:' + f.color + '">' + U.esc(f.adj) + '</span>'; }).join(' ');
      return '<div class="cols"><div class="stack"><div class="canvas-wrap map-wrap"><canvas id="mapCanvas" aria-label="Sector map"></canvas><div class="tip" id="mapTip" hidden></div></div>' +
        '<div class="row" style="gap:14px">' + legend + '</div><div class="row" style="gap:6px">' + facs + '</div></div>' +
        '<div class="stack">' + panel + '</div></div>';
    },
    mount(main) {
      const c = main.querySelector('#mapCanvas');
      drawMap(c);
      c.addEventListener('mousemove', (e) => hover(c, e));
      c.addEventListener('mouseleave', () => { const t = document.getElementById('mapTip'); if (t) t.hidden = true; c._hover = null; drawMap(c, true); });
      c.addEventListener('click', (e) => {
        const s = pickSys(c, e);
        if (s != null) { UI.navSel = s; ST.audio.play('select'); UI.renderMain(); }
      });
      if (!c._anim) {
        c._anim = true;
        const tick = () => { if (!c.isConnected) return; drawMap(c, true); requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }
    }
  });

  function toScreen(c, s) { const k = c._k; return { x: c._ox + s.x * k, y: c._oy + s.y * k }; }
  function pickSys(c, e) {
    const r = c.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    let best = null, bd = 22;
    ST.S.galaxy.systems.forEach(s => { if (!s.known) return; const p = toScreen(c, s); const d = Math.hypot(p.x - mx, p.y - my); if (d < bd) { bd = d; best = s.id; } });
    return best;
  }
  function hover(c, e) {
    const id = pickSys(c, e), tip = document.getElementById('mapTip');
    c._hover = id;
    if (id == null) { tip.hidden = true; return; }
    const s = G.sys(id), r = c.getBoundingClientRect(), p = toScreen(c, s);
    const h = G.hops(ST.S.location, id);
    tip.innerHTML = U.esc(s.name) + ' · ' + U.esc(G.describe(s)) + (id === ST.S.location ? ' · HERE' : ' · ' + h + ' jump' + (h === 1 ? '' : 's'));
    tip.hidden = false;
    tip.style.left = Math.min(p.x + 14, r.width - tip.offsetWidth - 4) + 'px'; tip.style.top = (p.y - 34) + 'px';
  }

  function drawMap(c, anim) {
    if (!c || !c.isConnected) return;
    const S = ST.S;
    if (!c._fit || c._cw !== c.clientWidth) { const f = ST.art.fit(c, 800, 512); c._x = f.x; c._w = f.w; c._h = f.h; c._fit = true; c._cw = c.clientWidth; c._bg = null; }
    const x = c._x, w = c._w, h = c._h;
    const k = Math.min(w / G.W, h / G.H); c._k = k; c._ox = (w - G.W * k) / 2; c._oy = (h - G.H * k) / 2;
    const sys = S.galaxy.systems;
    const now = performance.now() / 1000;
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    if (!c._stars) c._stars = new ST.RNG(S.seed);
    const R = new ST.RNG(S.seed); ST.art.stars(x, w, h, R, 140);
    // grid
    x.strokeStyle = 'rgba(153,153,255,.07)'; x.lineWidth = 1;
    for (let gx = 0; gx <= G.W; gx += 50) { const p = c._ox + gx * k; x.beginPath(); x.moveTo(p, 0); x.lineTo(p, h); x.stroke(); }
    for (let gy = 0; gy <= G.H; gy += 50) { const p = c._oy + gy * k; x.beginPath(); x.moveTo(0, p); x.lineTo(w, p); x.stroke(); }
    // territory
    sys.forEach(s => {
      if (!s.faction || !s.known) return;
      const f = ST.faction(s.faction), p = toScreen(c, s), r = 95 * k;
      const g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, ST.art.hexA(f.color, 0.2)); g.addColorStop(1, ST.art.hexA(f.color, 0));
      x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, r, 0, Math.PI * 2); x.fill();
    });
    // route
    let route = null;
    if (UI.navSel != null && UI.navSel !== S.location) route = G.path(S.location, UI.navSel);
    const T = ST.travel.active;
    if (T) route = T.path;
    // lanes
    S.galaxy.lanes.forEach(([a, b]) => {
      const A1 = sys[a], B1 = sys[b];
      if (!A1.known && !B1.known) return;
      const pa = toScreen(c, A1), pb = toScreen(c, B1);
      const both = A1.known && B1.known;
      x.strokeStyle = both ? 'rgba(255,204,153,.28)' : 'rgba(255,204,153,.1)';
      x.setLineDash(both ? [] : [3, 5]); x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(pa.x, pa.y); x.lineTo(pb.x, pb.y); x.stroke();
    });
    x.setLineDash([]);
    if (route) {
      x.strokeStyle = '#ff9c00'; x.lineWidth = 3; x.shadowColor = '#ff9c00'; x.shadowBlur = 8;
      x.beginPath(); route.forEach((id, i) => { const p = toScreen(c, sys[id]); i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y); }); x.stroke();
      x.shadowBlur = 0;
    }
    // mission targets
    const targets = {};
    S.missions.active.forEach(m => { const t = ST.missions.targetSystem(m); if (t != null) targets[t] = m.crisis ? '#ff6a5a' : '#cc99cc'; });
    // systems
    sys.forEach(s => {
      const p = toScreen(c, s);
      if (!s.known) { x.fillStyle = 'rgba(138,122,102,.5)'; x.beginPath(); x.arc(p.x, p.y, 2.2, 0, Math.PI * 2); x.fill(); return; }
      const st = D.stars[s.star];
      const r = Math.max(3, st.r * 0.28 * Math.max(k, 0.6));
      if (s.visited) ST.art.drawStar(x, p.x, p.y, r * 0.9, st.color);
      x.fillStyle = s.visited ? st.color : 'rgba(255,255,255,.55)';
      x.beginPath(); x.arc(p.x, p.y, r, 0, Math.PI * 2); x.fill();
      if (s.faction) { x.strokeStyle = ST.faction(s.faction).color; x.lineWidth = 1.5; x.beginPath(); x.arc(p.x, p.y, r + 4, 0, Math.PI * 2); x.stroke(); }
      if (G.hasStarbase(s)) { x.strokeStyle = '#9999ff'; x.lineWidth = 2; x.strokeRect(p.x - r - 7, p.y - r - 7, (r + 7) * 2, (r + 7) * 2); }
      if (targets[s.id] != null) {
        const pr = r + 9 + Math.sin(now * 3) * 3;
        x.strokeStyle = targets[s.id]; x.lineWidth = 2.5; x.beginPath(); x.arc(p.x, p.y, pr, 0, Math.PI * 2); x.stroke();
      }
      if (s.id === UI.navSel) { x.strokeStyle = '#fff3e0'; x.lineWidth = 1.5; x.setLineDash([4, 3]); x.beginPath(); x.arc(p.x, p.y, r + 14, 0, Math.PI * 2); x.stroke(); x.setLineDash([]); }
      x.fillStyle = s.id === S.location ? '#ff9c00' : s.visited ? '#ffcc99' : 'rgba(255,204,153,.6)';
      x.font = (s.id === S.location ? '600 ' : '400 ') + Math.round(Math.max(11, 13 * k * 1.4)) + 'px Antonio, sans-serif';
      x.fillText(s.name.toUpperCase(), p.x + r + 6, p.y - r - 2);
    });
    // ship marker
    let sp = toScreen(c, sys[S.location]);
    if (T && T.leg) {
      const a = toScreen(c, sys[T.leg.from]), b = toScreen(c, sys[T.leg.to]);
      const tt = (now * 0.8) % 1;
      sp = { x: a.x + (b.x - a.x) * tt, y: a.y + (b.y - a.y) * tt };
    }
    x.save(); x.translate(sp.x, sp.y);
    x.fillStyle = '#ff9c00'; x.beginPath(); x.moveTo(0, -9); x.lineTo(7, 7); x.lineTo(0, 3); x.lineTo(-7, 7); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(255,156,0,' + (0.5 + 0.5 * Math.sin(now * 4)).toFixed(2) + ')'; x.lineWidth = 1.5; x.beginPath(); x.arc(0, 0, 14, 0, Math.PI * 2); x.stroke();
    x.restore();
  }
  UI.drawMap = drawMap;

  A.navWarp = (w) => { ST.S.warp = +w; ST.audio.play('click'); UI.renderMain(); };
  A.navClear = () => { UI.navSel = null; ST.audio.play('click'); UI.renderMain(); };
  A.navEngage = () => { if (UI.navSel == null) return; T.start(UI.navSel); };
  A.navTo = (id) => { UI.navSel = +id; ST.audio.play('select'); UI.go('nav'); };
})();
