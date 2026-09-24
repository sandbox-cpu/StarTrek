/* Sector generation, travel maths and contacts. */
(function () {
  'use strict';
  const ST = window.ST, D = ST.DATA, U = ST.util;
  const G = ST.galaxy = {};
  G.W = 1000; G.H = 640;
  G.SPEED = { 4: 45, 5: 65, 6: 90, 7: 125, 8: 170, 9: 230 };   // map units per day
  G.FUEL = { 4: 0.6, 5: 0.8, 6: 1.0, 7: 1.3, 8: 1.8, 9: 2.6 }; // dilithium per 100 units
  G.LY = 0.06; // light years per map unit (display only)

  const SHIP_NAMES = {
    klingon: { pre: 'I.K.S. ', n: ["Gr'oth", "Qu'Vat", "Hegh'ta", "B'Moth", "Ch'Tang", 'Somraw', "Vor'nak", "Toh'Kaht", 'Kravokh', "Mek'ba"] },
    romulan: { pre: 'I.R.W. ', n: ['Valdus', 'Veraxis', 'Senthi', 'Dhael', 'Rhiannon', 'Tovarr', 'Aethon', 'Llaeir'] },
    cardassian: { pre: '', n: ['Vetar', 'Ravinok', 'Groumall', 'Detrek', 'Sevrin', 'Kornath', 'Olvek', 'Tarsal'] },
    ferengi: { pre: '', n: ['Golden Ear', 'Profitable Venture', 'Latinum Dream', 'Sharp Deal', 'Fair Margin', 'Eager Lobe'] },
    orion: { pre: '', n: ['Green Viper', 'Silk Knife', 'Night Market', 'Rust Queen', 'Red Talon', 'Jade Fang', 'Last Bargain'] },
    federation: { pre: 'U.S.S. ', n: D.SHIP_NAMES }
  };

  G.sys = (id) => ST.S.galaxy.systems[id];
  G.here = () => G.sys(ST.S.location);

  /** Faction or generated species by id. */
  ST.faction = function (id) {
    if (!id) return null;
    return D.factions[id] || (ST.S && ST.S.species[id]) || null;
  };

  // ------------------------------------------------------------ generation
  G.generate = function (S) {
    const R = ST.rng;
    const N = R.int(22, 26);
    const pts = [];
    // Mitchell's best-candidate sampling for even spacing
    for (let i = 0; i < N; i++) {
      let best = null, bd = -1;
      for (let k = 0; k < 26; k++) {
        const c = { x: R.float(55, G.W - 55), y: R.float(50, G.H - 50) };
        let d = Infinity;
        pts.forEach(p => { d = Math.min(d, U.dist(p, c)); });
        if (d > bd) { bd = d; best = c; }
      }
      pts.push(best);
    }
    const names = R.shuffle(D.SYSTEM_NAMES);
    const systems = pts.map((p, i) => {
      let name = names[i % names.length];
      if (R.chance(0.28)) name = R.pick(D.GREEK) + ' ' + name;
      return { id: i, name, x: Math.round(p.x), y: Math.round(p.y), star: null, planets: [], pois: [], faction: null, known: false, visited: false, scanned: false, lanes: [] };
    });
    S.galaxy = { systems, lanes: [], home: 0 };
    buildLanes(S.galaxy, R);

    // stars and planets
    const starKeys = Object.keys(D.stars);
    systems.forEach(s => {
      s.star = R.weighted(starKeys, k => D.stars[k].w);
      const nP = s.star === 'BH' ? R.int(0, 1) : s.star === 'NS' ? R.int(0, 2) : s.star === 'WD' ? R.int(1, 3) : R.int(1, 6);
      for (let i = 0; i < nP; i++) s.planets.push(makePlanet(s, i, R));
    });

    // Federation home: nearest system to a point on the left edge
    const anchor = { x: R.float(40, 160), y: R.float(120, G.H - 120) };
    let home = systems[0];
    systems.forEach(s => { if (U.dist(s, anchor) < U.dist(home, anchor)) home = s; });
    S.galaxy.home = home.id;
    if (!['G', 'K', 'F'].includes(home.star)) home.star = 'G';
    ensurePlanet(home, 'M', R);

    // territories: federation + 3-4 majors
    const majors = R.shuffle(D.TERRITORY_FACTIONS).slice(0, R.chance(0.55) ? 4 : 3);
    const seeds = [{ f: 'federation', s: home }];
    majors.forEach(f => {
      const scored = systems.filter(s => !seeds.some(q => q.s === s)).map(s => ({ s, d: Math.min.apply(null, seeds.map(q => U.dist(q.s, s))) })).sort((a, b) => b.d - a.d);
      seeds.push({ f, s: R.pick(scored.slice(0, 3)).s });
    });
    const quota = {}; seeds.forEach(q => { quota[q.f] = q.f === 'federation' ? R.int(4, 5) : R.int(3, 4); q.s.faction = q.f; });
    S.galaxy.capitals = {}; seeds.forEach(q => { S.galaxy.capitals[q.f] = q.s.id; });
    let grew = true;
    while (grew) {
      grew = false;
      seeds.forEach(q => {
        const owned = systems.filter(s => s.faction === q.f);
        if (owned.length >= quota[q.f]) return;
        let cand = null, cd = Infinity;
        owned.forEach(o => o.lanes.forEach(nid => {
          const n = systems[nid];
          if (n.faction) return;
          const d = U.dist(n, q.s);
          if (d < cd && d < 330) { cd = d; cand = n; }
        }));
        if (cand) { cand.faction = q.f; grew = true; }
      });
    }
    S.galaxy.majors = majors;

    // stations, colonies, features
    home.pois.push({ type: 'starbase', name: 'Starbase ' + R.int(70, 99), faction: 'federation' });
    addColony(home, 'federation', R);
    const fedOthers = R.shuffle(systems.filter(s => s.faction === 'federation' && s !== home));
    if (fedOthers[0]) fedOthers[0].pois.push({ type: 'starbase', name: 'Starbase ' + R.int(100, 299), faction: 'federation' });
    fedOthers.slice(1).forEach(s => { if (R.chance(0.6)) addColony(s, 'federation', R); });
    majors.forEach(f => {
      const cap = systems[S.galaxy.capitals[f]];
      if (f === 'ferengi') cap.pois.push({ type: 'trade', name: 'Ferengi trading post', faction: 'ferengi' });
      else cap.pois.push({ type: 'outpost', name: D.factions[f].adj + ' outpost', faction: f });
      systems.filter(s => s.faction === f && s !== cap).forEach(s => {
        if (R.chance(0.3)) s.pois.push(f === 'ferengi' ? { type: 'trade', name: 'Ferengi trading post', faction: 'ferengi' } : { type: 'outpost', name: D.factions[f].adj + ' listening post', faction: f });
      });
    });
    const wild = systems.filter(s => !s.faction);
    // unknown species (first contact candidates), placed far from home
    const farWild = wild.slice().sort((a, b) => U.dist(b, home) - U.dist(a, home));
    const nSpecies = Math.min(R.int(2, 3), farWild.length);
    for (let i = 0; i < nSpecies; i++) {
      const s = farWild[i * 2] || farWild[i];
      if (!s || s.speciesHome) continue;
      const sp = G.makeSpecies(R, { prewarp: i === nSpecies - 1 && R.chance(0.5) });
      S.species[sp.id] = sp;
      S.relations[sp.id] = 0;
      const pl = ensurePlanet(s, R.pick(['M', 'L', 'O']), R);
      pl.life = sp.prewarp ? 'prewarp' : 'sentient';
      pl.species = sp.id;
      sp.home = s.id;
      s.speciesHome = sp.id;
    }
    // features in unclaimed space
    wild.forEach(s => {
      if (R.chance(0.22)) s.pois.push({ type: 'anomaly', name: '', kind: R.pick(D.ANOMALY_KINDS).id, hidden: R.chance(0.35) });
      if (R.chance(0.16)) s.pois.push({ type: 'derelict', name: 'Derelict vessel', hidden: R.chance(0.4) });
      if (R.chance(0.26)) s.pois.push({ type: 'asteroids', name: 'Asteroid field' });
      if (R.chance(0.16)) s.pois.push({ type: 'nebula', name: s.name + ' Nebula' });
      if (R.chance(0.12) && !s.speciesHome) addColony(s, 'independent', R);
    });
    // also a few features in claimed space
    systems.filter(s => s.faction).forEach(s => {
      if (R.chance(0.12)) s.pois.push({ type: 'asteroids', name: 'Asteroid field' });
      if (R.chance(0.08)) s.pois.push({ type: 'nebula', name: s.name + ' Nebula' });
    });
    // an independent trading post and rare wonders
    const tradeHost = R.pick(wild.filter(s => !s.speciesHome && !s.pois.some(p => p.type === 'trade')));
    if (tradeHost) tradeHost.pois.push({ type: 'trade', name: 'Free trade station', faction: 'ferengi' });
    if (R.chance(0.55)) { const s = R.pick(wild); if (s) s.pois.push({ type: 'megastructure', name: 'Ancient megastructure', hidden: true }); }
    if (R.chance(0.35)) { const s = R.pick(wild); if (s) s.pois.push({ type: 'wormhole', name: 'Wormhole', hidden: true }); }
    systems.forEach(s => s.pois.forEach(p => { if (p.type === 'anomaly' && !p.name) p.name = D.ANOMALY_KINDS.find(k => k.id === p.kind).name; }));

    // knowledge
    systems.forEach(s => { if (s.faction === 'federation') s.known = true; });
    home.lanes.forEach(n => { systems[n].known = true; });
  };

  function makePlanet(s, i, R) {
    const star = s.star;
    const weights = { M: 3, L: 2, O: 1.5, H: 3, P: 2.5, K: 3, N: 2, Y: 1.5, J: 3 };
    if (['M', 'WD', 'NS', 'BH', 'O', 'B'].includes(star)) { weights.M = 0.4; weights.L = 0.5; weights.O = 0.4; }
    const cls = R.weighted(Object.keys(weights), k => weights[k]);
    return planetOf(s, i, cls, R);
  }
  function planetOf(s, i, cls, R) {
    const pd = D.planets[cls];
    const life = R.weighted(Object.keys(pd.life), k => pd.life[k]);
    return {
      name: s.name + ' ' + U.roman(i + 1), cls,
      size: pd.gas ? R.float(1.6, 2.3) : R.float(0.7, 1.3),
      life: life === 'sentient' ? 'fauna' : life,
      dilithium: (['K', 'N', 'H', 'P', 'Y', 'M'].includes(cls) && R.chance(0.28)) ? R.int(1, 3) : 0,
      ruins: R.chance(0.09) && cls !== 'J',
      colony: false, species: null, scanned: false, explored: false, mined: false, seed: R.int(1, 99999)
    };
  }
  function ensurePlanet(s, cls, R) {
    let p = s.planets.find(x => x.cls === cls);
    if (!p) {
      if (s.planets.length && R.chance(0.6)) { const idx = R.int(0, s.planets.length - 1); s.planets[idx] = planetOf(s, idx, cls, R); p = s.planets[idx]; }
      else { p = planetOf(s, s.planets.length, cls, R); s.planets.push(p); }
    }
    return p;
  }
  function addColony(s, faction, R) {
    let p = s.planets.find(x => D.planets[x.cls].habitable && !x.species);
    if (!p) p = s.planets.find(x => x.cls !== 'J' && !x.species);
    if (!p) { p = planetOf(s, s.planets.length, 'K', R); s.planets.push(p); }
    p.colony = true;
    s.pois.push({ type: 'colony', name: (faction === 'federation' ? 'Federation colony on ' : 'Independent colony on ') + p.name, faction: faction === 'federation' ? 'federation' : null, planet: p.name });
  }

  function buildLanes(g, R) {
    const s = g.systems, n = s.length;
    const edges = [];
    const addEdge = (a, b) => { if (a === b || s[a].lanes.includes(b)) return; s[a].lanes.push(b); s[b].lanes.push(a); edges.push([a, b]); };
    // Prim's MST keeps everything connected
    const inTree = new Set([0]);
    while (inTree.size < n) {
      let best = null, bd = Infinity;
      inTree.forEach(a => { for (let b = 0; b < n; b++) { if (inTree.has(b)) continue; const d = U.dist(s[a], s[b]); if (d < bd) { bd = d; best = [a, b]; } } });
      addEdge(best[0], best[1]); inTree.add(best[1]);
    }
    // extra short, non-crossing lanes for loops
    for (let a = 0; a < n; a++) {
      const near = s.map((x, i) => ({ i, d: U.dist(s[a], x) })).filter(o => o.i !== a).sort((p, q) => p.d - q.d).slice(0, 4);
      near.forEach(o => {
        if (o.d > 200 || s[a].lanes.length >= 4 || s[o.i].lanes.length >= 4 || s[a].lanes.includes(o.i)) return;
        if (edges.some(e => crosses(s[a], s[o.i], s[e[0]], s[e[1]]) && !(e.includes(a) || e.includes(o.i)))) return;
        if (R.chance(0.75)) addEdge(a, o.i);
      });
    }
    g.lanes = edges;
  }
  function crosses(p1, p2, p3, p4) {
    const d = (a, b, c) => (c.x - a.x) * (b.y - a.y) - (b.x - a.x) * (c.y - a.y);
    const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
    return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
  }

  G.makeSpecies = function (R, opts) {
    const g = D.speciesGen;
    const base = R.pick(g.syllA) + R.pick(g.syllB);
    const adj = base + R.pick(g.endA);
    const values = {};
    D.VALUES.forEach(v => { values[v] = 0; });
    const vs = R.shuffle(D.VALUES);
    values[vs[0]] = R.int(2, 3); values[vs[1]] = R.int(1, 2); values[vs[2]] = -R.int(1, 2);
    const leaders = [];
    for (let i = 0; i < 5; i++) leaders.push(R.pick(g.syllA) + R.pick(g.syllB).replace(/^./, c => c));
    return {
      id: 'sp_' + base.toLowerCase().replace(/[^a-z]/g, ''),
      name: base + ' ' + R.pick(['Concord', 'Assembly', 'Unity', 'Protectorate', 'Republic', 'Chorus', 'Compact']),
      short: base, adj, plural: /i$/.test(adj) ? adj : adj + 's',
      look: R.pick(g.looks), values,
      color: R.pick(['#cc99cc', '#99ccff', '#ffcc66', '#a57fd8', '#88c0a8']),
      leaderTitles: ['Envoy', 'Speaker', 'First'], leaders,
      ship: 'ship_unknown', portrait: R.pick(g.portraits),
      aggression: R.float(0.15, 0.55), trades: R.chance(0.6), bribable: R.chance(0.3), cloak: false,
      prewarp: !!(opts && opts.prewarp), met: false, species: true, major: false
    };
  };

  // ------------------------------------------------------------ travel
  G.path = function (from, to) {
    const s = ST.S.galaxy.systems;
    const dist = s.map(() => Infinity), prev = s.map(() => -1), done = s.map(() => false);
    dist[from] = 0;
    for (;;) {
      let u = -1;
      for (let i = 0; i < s.length; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || u === to) break;
      done[u] = true;
      s[u].lanes.forEach(v => { const d = dist[u] + U.dist(s[u], s[v]); if (d < dist[v]) { dist[v] = d; prev[v] = u; } });
    }
    if (dist[to] === Infinity) return null;
    const out = [];
    for (let v = to; v >= 0; v = prev[v]) out.unshift(v);
    return out;
  };
  G.hops = function (from, to) { const p = G.path(from, to); return p ? p.length - 1 : Infinity; };
  G.routeInfo = function (path, warp) {
    const st = ST.shipStats(), s = ST.S.galaxy.systems;
    let dist = 0;
    for (let i = 1; i < path.length; i++) dist += U.dist(s[path[i - 1]], s[path[i]]);
    return {
      dist, ly: dist * G.LY,
      days: dist / (G.SPEED[warp] * st.warp),
      dil: Math.round(dist / 100 * G.FUEL[warp] * st.fuel * 10) / 10,
      hops: path.length - 1
    };
  };
  G.legInfo = function (a, b, warp) { return G.routeInfo([a, b], warp); };
  /** True when no neighbouring system is reachable and there is no station to refuel at. */
  G.stranded = function () {
    const S = ST.S, here = G.here();
    if (G.station(here)) return false;
    const cheapest = Math.min.apply(null, here.lanes.map(n => G.legInfo(here.id, n, 4).dil));
    return S.res.dilithium + 1e-9 < cheapest;
  };

  G.visit = function (id, silent) {
    const S = ST.S, s = G.sys(id);
    if (!s.visited) { s.visited = true; S.stats.visited++; }
    s.known = true;
    s.lanes.forEach(n => { G.sys(n).known = true; });
    if (!silent) ST.log('Arrived at the ' + s.name + ' system.');
  };

  // ------------------------------------------------------------ descriptors
  G.factionOf = (s) => s.faction ? ST.faction(s.faction) : null;
  /** Mark a generated species as met (first contact). Returns true the first time. */
  ST.meetSpecies = function (id) {
    const S = ST.S, sp = S && S.species[id];
    if (!sp || sp.met) return false;
    sp.met = true; S.stats.contacts++;
    ST.res.add('renown', 5);
    ST.log('First contact with the ' + sp.name + '.', 'good');
    if (ST.ui && ST.ui.toast) ST.ui.toast('First contact: the ' + sp.name + ' · renown +5', '#99ccff');
    return true;
  };
  G.hasStarbase = (s) => s.pois.some(p => p.type === 'starbase');
  G.station = (s) => s.pois.find(p => p.type === 'starbase' || p.type === 'trade' || (p.type === 'outpost' && ST.S.relations[p.faction] >= 10));
  G.visiblePois = (s) => s.pois.filter(p => !p.hidden || s.scanned);
  G.has = function (s, what) {
    if (what === 'dilithium') return s.planets.some(p => p.dilithium > 0 && !p.mined) || s.pois.some(p => p.type === 'asteroids');
    if (what === 'ruins') return s.planets.some(p => p.ruins);
    if (what === 'habitable') return s.planets.some(p => D.planets[p.cls].habitable);
    if (what === 'life') return s.planets.some(p => p.life !== 'none');
    if (what === 'station') return !!G.station(s);
    if (what === 'pulsar') return s.star === 'NS';
    if (what === 'blackhole') return s.star === 'BH';
    if (what === 'star:collapsed') return ['NS', 'BH', 'WD'].includes(s.star);
    if (what.startsWith('planet:')) { const cls = what.slice(7).split(',').map(x => x.trim()); return s.planets.some(p => cls.includes(p.cls)); }
    return s.pois.some(p => p.type === what);
  };
  G.systemArt = function (s) {
    const P = (t) => s.pois.find(p => p.type === t && (!p.hidden || s.scanned));
    if (P('starbase')) return 'starbase';
    if (P('trade')) return 'trade_station';
    if (s.star === 'BH') return 'black_hole';
    if (s.star === 'NS') return 'pulsar';
    if (P('megastructure')) return 'megastructure';
    if (P('wormhole')) return 'wormhole';
    const an = P('anomaly'); if (an) return (D.ANOMALY_KINDS.find(k => k.id === an.kind) || {}).art || 'rift';
    if (P('nebula')) return 'nebula';
    const hab = s.planets.find(p => D.planets[p.cls].habitable) || s.planets.slice().sort((a, b) => b.size - a.size)[0];
    if (hab) return D.planets[hab.cls].art;
    if (P('asteroids')) return 'asteroids';
    return 'nebula';
  };
  G.describe = function (s) {
    const f = G.factionOf(s);
    return f ? f.name : (s.speciesHome && ST.S.species[s.speciesHome].met ? ST.S.species[s.speciesHome].name : 'Unclaimed space');
  };

  // ------------------------------------------------------------ contacts
  G.shipName = function (fid) {
    const R = ST.rng, f = ST.faction(fid);
    if (f && f.species) return f.adj + ' ' + R.pick(D.speciesGen.shipWords).toLowerCase();
    const t = SHIP_NAMES[fid];
    return t ? t.pre + R.pick(t.n) : 'Unknown vessel';
  };
  G.shipClassFor = function (fid, tier) {
    const R = ST.rng;
    const f = ST.faction(fid);
    if (f && f.species) return tier === 'heavy' ? 'sp_heavy' : tier === 'medium' ? 'sp_medium' : 'sp_light';
    const list = Object.keys(D.ships).filter(k => D.ships[k].faction === fid && (!tier || D.ships[k].tier === tier));
    if (list.length) return R.pick(list);
    const any = Object.keys(D.ships).filter(k => D.ships[k].faction === fid);
    return any.length ? R.pick(any) : 'orion_raider';
  };
  G.shipClassName = function (fid, cls) {
    const f = ST.faction(fid), c = D.ships[cls];
    if (!c) return 'vessel';
    return c.faction === '*species' && f ? f.adj + ' ' + c.name : c.name;
  };
  G.attitudeFor = function (fid) {
    const S = ST.S, f = ST.faction(fid), rel = S.relations[fid] || 0;
    if (fid === 'federation') return 'friendly';
    if (fid === 'borg') return 'hostile';
    if (rel >= 25) return 'friendly';
    if (rel <= -40) return 'hostile';
    if (rel < 0 && ST.rng.chance((f.aggression || 0.3) * 0.45)) return 'hostile';
    return 'neutral';
  };
  G.makeContact = function (fid, tier, attitude) {
    const R = ST.rng;
    tier = tier || R.weighted(['light', 'medium', 'heavy'], t => ({ light: 6, medium: 3.5, heavy: 0.8 })[t]);
    const cls = G.shipClassFor(fid, tier);
    return { id: U.uid('c'), faction: fid, ship: cls, name: G.shipName(fid), attitude: attitude || G.attitudeFor(fid), hailed: false };
  };
  /** Called on arrival. Populates ST.S.contacts. */
  G.rollContacts = function (s) {
    const S = ST.S, R = ST.rng, out = [];
    const protectedSys = G.hasStarbase(s);
    if (s.faction && s.faction !== 'federation' && R.chance(0.55)) out.push(G.makeContact(s.faction));
    if (s.faction === 'federation' && R.chance(0.3)) out.push(G.makeContact('federation', null, 'friendly'));
    if (!s.faction) {
      if (!protectedSys && R.chance(0.2)) out.push(G.makeContact('orion', R.chance(0.7) ? 'light' : 'medium'));
      if (R.chance(0.12)) out.push(G.makeContact('ferengi', 'light', 'neutral'));
      if (R.chance(0.1)) { const f = R.pick(S.galaxy.majors); if (f) out.push(G.makeContact(f)); }
    }
    if (s.speciesHome && R.chance(0.45)) {
      const sp = S.species[s.speciesHome];
      if (!sp.prewarp) out.push(G.makeContact(sp.id, R.chance(0.7) ? 'light' : 'medium', sp.met ? null : 'neutral'));
    }
    if (protectedSys) out.forEach(c => { if (c.attitude === 'hostile') c.attitude = 'neutral'; });
    S.contacts = out;
    return out;
  };
})();
