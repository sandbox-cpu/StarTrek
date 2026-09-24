/* Bridge: main viewscreen, current position, quick orders, captain's log. */
(function () {
  'use strict';
  const ST = window.ST, D = ST.DATA, U = ST.util, G = ST.galaxy;
  const A = ST.actions;

  ST.ui.station('bridge', {
    label: 'Bridge',
    render() {
      const S = ST.S, sys = G.here(), T = ST.travel && ST.travel.active;
      let art, label, label2;
      if (T && T.leg) {
        art = 'warp';
        label = 'WARP ' + T.warp + ' · ' + G.sys(T.leg.from).name + ' → ' + G.sys(T.leg.to).name;
        label2 = 'EN ROUTE TO ' + G.sys(T.dest).name.toUpperCase();
      } else if (S.orbit != null && sys.planets[S.orbit]) {
        const p = sys.planets[S.orbit];
        art = D.planets[p.cls].art; label = 'STANDARD ORBIT · ' + p.name; label2 = D.planets[p.cls].name + ' · ' + D.planets[p.cls].kind;
      } else {
        art = G.systemArt(sys); label = sys.name + ' system'; label2 = S.docked ? 'DOCKED' : 'VIEWSCREEN · MAG 1';
      }
      const f = G.factionOf(sys);
      const pois = G.visiblePois(sys);
      const orders = [];
      if (!T) {
        orders.push('<button class="lc-btn c-peach" data-act="go" data-arg="nav">Set course</button>');
        if (!sys.scanned || ST.missions.wantsScan(sys.id)) orders.push('<button class="lc-btn c-blue" data-act="sciScan">Scan system</button>');
        else orders.push('<button class="lc-btn c-blue" data-act="go" data-arg="science">Sensors</button>');
        if (S.contacts.length) orders.push('<button class="lc-btn c-sky" data-act="go" data-arg="comms">Hail contacts (' + S.contacts.length + ')</button>');
        const st = G.station(sys);
        if (st && !S.docked) orders.push('<button class="lc-btn c-lilac" data-act="dock">Dock at ' + U.esc(st.name) + '</button>');
        if (S.docked) orders.push('<button class="lc-btn c-lilac" data-act="go" data-arg="ops">Station services</button>');
      }
      const warnings = [];
      const stt = ST.shipStats();
      if (S.res.dilithium < 6) warnings.push('Dilithium reserves low: ' + S.res.dilithium + ' left.');
      const stranded = !T && G.stranded();
      if (S.ship.hull < stt.hullMax * 0.4) warnings.push('Hull integrity at ' + Math.round(S.ship.hull / stt.hullMax * 100) + '%.');
      Object.keys(S.ship.systems).forEach(k => { if (S.ship.systems[k] < 50) warnings.push(U.cap(k) + ' at ' + Math.round(S.ship.systems[k]) + '%.'); });
      const hurt = ST.crew.all().filter(o => o.status !== 'ok');
      if (hurt.length) warnings.push(hurt.map(o => o.name + ' (' + o.status + ')').join(', ') + ' in sickbay.');
      if (S.res.morale < 35) warnings.push('Crew morale is poor.');
      const missions = S.missions.active.map(m => {
        const tgt = ST.missions.targetSystem(m), dl = ST.missions.daysLeft(m);
        const here = tgt === S.location;
        return '<div class="card" style="--c:' + (m.crisis ? '#ff6a5a' : 'var(--lilac)') + '"><h3>' + U.esc(m.title) + '</h3><div>' + U.esc(ST.missions.objective(m)) + '</div>' +
          '<div class="muted" style="font-size:15px;margin-top:3px">' + (tgt != null ? (here ? '<span class="good">TARGET: THIS SYSTEM</span>' : 'Target: ' + U.esc(G.sys(tgt).name) + ' · ' + G.hops(S.location, tgt) + ' jumps') : '') + (dl != null ? ' · <span class="' + (dl <= 2 ? 'bad' : '') + '">' + U.fmt1(dl) + ' days left</span>' : '') + '</div></div>';
      }).join('');
      const log = S.log.slice(-9).reverse().map(e => '<div class="e k-' + (e.kind || '') + '"><span class="d">' + ST.stardate(e.day) + '</span><span class="t">' + U.esc(e.text) + '</span></div>').join('');
      const contacts = S.contacts.map(c => { const cf = ST.faction(c.faction); return '<span class="chip" style="--c:' + (c.attitude === 'hostile' ? '#ff6a5a' : c.attitude === 'friendly' ? '#99cc99' : cf.color) + '">' + U.esc(c.name) + ' · ' + c.attitude + '</span>'; }).join(' ');
      return '<div class="cols">' +
        '<div class="stack">' + ST.art.html(art, { label, label2, cls: T ? 'warping' : '', scan: !!T }) +
        '<div class="hdr" style="--c:var(--peach)"><span class="cap"></span><span class="t">Captain\'s log</span><span class="fill"></span><span class="end"></span></div><div class="log">' + log + '</div></div>' +
        '<div class="stack">' +
        '<div class="hdr" style="--c:var(--orange)"><span class="cap"></span><span class="t">' + U.esc(sys.name) + '</span><span class="fill"></span><span class="tag">' + U.esc(f ? f.adj.toUpperCase() : 'UNCLAIMED') + '</span></div>' +
        (T ? '<div class="prose"><p>Travelling at warp ' + T.warp + '. The stars stretch past the viewscreen.</p></div>' :
          '<dl class="kv"><dt>Star</dt><dd>' + D.stars[sys.star].name + '</dd><dt>Planets</dt><dd>' + sys.planets.length + (sys.scanned ? '' : ' (unscanned)') + '</dd>' +
          (pois.length ? '<dt>Features</dt><dd>' + pois.map(p => U.esc(p.name || D.pois[p.type].name)).join(', ') + '</dd>' : '') +
          '<dt>Contacts</dt><dd>' + (contacts || '<span class="muted">None on sensors</span>') + '</dd></dl>' +
          '<div class="row">' + orders.join('') + '</div>') +
        (stranded ? '<div class="card" style="--c:var(--red);margin-top:12px"><h3>Stranded</h3><p style="margin:4px 0 8px">Not enough dilithium to reach any neighbouring system. Mine a planet or asteroid field in Science if you can, or call Starfleet for a tow.</p><button class="lc-btn c-red" data-act="navTow">Request a tow (−10 renown, 6 days)</button></div>' : '') +
        (warnings.length ? '<div class="sub-h">Status reports</div><div class="stack" style="gap:3px">' + warnings.map(w => '<div class="warnc">▸ ' + U.esc(w) + '</div>').join('') + '</div>' : '') +
        '<div class="sub-h">Active missions</div>' + (missions ? '<div class="list">' + missions + '</div>' : '<p class="muted">No active missions. Check the Starfleet mission board in Comms.</p>') +
        '</div></div>';
    }
  });

  A.dock = function () {
    const S = ST.S, sys = G.here(), st = G.station(sys);
    if (!st || ST.ui.busy()) return;
    S.docked = true; S.orbit = null;
    ST.audio.play('select');
    ST.log('Docked at ' + st.name + '.');
    ST.missions.trigger('dock', sys.id);
    ST.ui.go('ops');
    ST.story.pump();
    ST.save();
  };
})();
