/* =========================================================================
   Story engine: interprets mission and event data (see js/schema.js and
   docs/MISSION_AUTHORING.md). Handles text templating, conditions, effects,
   slot resolution, and the dialog runner (scenes, checks, combat,
   negotiation and away-team nodes).
   ========================================================================= */
(function () {
  'use strict';
  const ST = window.ST, D = ST.DATA, U = ST.util, G = ST.galaxy;
  const Y = ST.story = { active: null, _queue: [] };

  // ================================================================ slots
  /** Resolve a slots spec into concrete values. Returns null if impossible. */
  Y.resolveSlots = function (spec, base) {
    const S = ST.S, R = ST.rng, out = Object.assign({}, base || {});
    const names = Object.keys(spec || {});
    for (const name of names) {
      const s = spec[name];
      const v = resolveSlot(s, out, S, R);
      if (!v) return null;
      out[name] = v;
    }
    return out;
  };

  function factionSlotValue(fid, extra) {
    const f = ST.faction(fid);
    const R = ST.rng;
    const title = R.pick(f.leaderTitles || ['Captain']);
    const cls = extra && extra.shipCls ? extra.shipCls : G.shipClassFor(fid, 'medium');
    return Object.assign({
      type: f.species ? 'species' : 'faction', id: fid,
      leader: (title ? title + ' ' : '') + R.pick(f.leaders || ['Unknown']),
      title: title || '',
      shipName: G.shipClassName(fid, cls),
      vessel: G.shipName(fid)
    }, extra && extra.vessel ? { vessel: extra.vessel } : {});
  }
  Y.factionSlotValue = factionSlotValue;

  function resolveSlot(s, out, S, R) {
    switch (s.type) {
      case 'faction': {
        if (s.fromLocation) {
          const lf = G.here().faction;
          if (!lf || !D.factions[lf] || (s.oneOf && ![].concat(s.oneOf).includes(lf))) return null;
          return factionSlotValue(lf);
        }
        let pool = s.oneOf ? (Array.isArray(s.oneOf) ? s.oneOf : [s.oneOf]) : S.galaxy.majors.concat(['orion']);
        pool = pool.filter(f => D.factions[f] && (s.present === false || f === 'orion' || f === 'federation' || f === 'borg' || f === 'ancient' || S.galaxy.majors.includes(f)));
        pool = pool.filter(f => !Object.values(out).some(v => v && v.type === 'faction' && v.id === f));
        if (!pool.length) return null;
        let fid;
        if (s.prefer === 'hostile') fid = pool.slice().sort((a, b) => S.relations[a] - S.relations[b])[0];
        else if (s.prefer === 'friendly') fid = pool.slice().sort((a, b) => S.relations[b] - S.relations[a])[0];
        else fid = R.pick(pool);
        return factionSlotValue(fid);
      }
      case 'species': {
        let pool = Object.values(S.species).filter(sp => (s.met == null ? !sp.met : sp.met === s.met) && (s.prewarp == null || !!sp.prewarp === !!s.prewarp));
        pool = pool.filter(sp => !Object.values(out).some(v => v && v.id === sp.id));
        let sp = R.pick(pool);
        if (!sp) {
          // Generate a new species with a home in unclaimed space.
          const hosts = S.galaxy.systems.filter(x => !x.faction && !x.speciesHome && x.id !== S.location);
          const host = R.pick(hosts);
          if (!host) return null;
          sp = G.makeSpecies(R, { prewarp: !!s.prewarp });
          if (S.species[sp.id]) sp.id += R.int(2, 99);
          S.species[sp.id] = sp; S.relations[sp.id] = 0;
          let pl = host.planets.find(p => D.planets[p.cls].habitable && !p.species);
          if (!pl) { pl = { name: host.name + ' ' + U.roman(host.planets.length + 1), cls: R.pick(['M', 'L', 'O']), size: 1, life: 'sentient', dilithium: 0, ruins: false, colony: false, species: null, scanned: false, explored: false, mined: false, seed: R.int(1, 99999) }; host.planets.push(pl); }
          pl.life = sp.prewarp ? 'prewarp' : 'sentient'; pl.species = sp.id;
          sp.home = host.id; host.speciesHome = sp.id;
        }
        return factionSlotValue(sp.id);
      }
      case 'system': {
        const here = S.location;
        if (s.homeOf) {
          const ref = out[s.homeOf];
          if (!ref) return null;
          const f = ST.faction(ref.id);
          const sid = f && f.species ? f.home : S.galaxy.capitals && S.galaxy.capitals[ref.id];
          if (sid == null) return null;
          return { type: 'system', id: sid, name: G.sys(sid).name };
        }
        const used = Object.values(out).filter(v => v && v.type === 'system').map(v => v.id);
        const minJ = s.minJumps == null ? 1 : s.minJumps, maxJ = s.maxJumps == null ? 5 : s.maxJumps;
        let cands = S.galaxy.systems.filter(sys => {
          if (used.includes(sys.id)) return false;
          if (!s.allowCurrent && sys.id === here && minJ > 0) return false;
          const h = G.hops(here, sys.id);
          if (h < minJ || h > maxJ) return false;
          if (s.unvisited && sys.visited) return false;
          if (s.faction && s.faction !== 'any') {
            if (s.faction === 'none' && sys.faction) return false;
            if (s.faction === 'foreign' && (!sys.faction || sys.faction === 'federation')) return false;
            if (s.faction[0] === '{') { const ref = out[s.faction.slice(1, -1)]; if (!ref || sys.faction !== ref.id) return false; }
            else if (!['none', 'foreign'].includes(s.faction) && sys.faction !== s.faction) return false;
          }
          if (s.has && !String(s.has).split('|').some(hh => G.has(sys, hh.trim()))) return false;
          if (s.noSpecies !== false && sys.speciesHome && !(s.has === 'life')) { /* allowed; species homes are fine targets */ }
          return true;
        });
        if (!cands.length) return null;
        const sys = R.pick(cands);
        return { type: 'system', id: sys.id, name: sys.name };
      }
      case 'planet': {
        const sref = out[s.system];
        if (!sref) return null;
        const sys = G.sys(sref.id);
        const cls = s.class ? (Array.isArray(s.class) ? s.class : [s.class]) : null;
        let pl = R.pick(sys.planets.filter(p => (!cls || cls.includes(p.cls)) && (!s.ruins || p.ruins) && (!s.colony || p.colony)));
        if (!pl) {
          if (!cls || s.ruins || s.colony) return null;
          pl = { name: sys.name + ' ' + U.roman(sys.planets.length + 1), cls: R.pick(cls), size: 1, life: 'none', dilithium: 0, ruins: false, colony: false, species: null, scanned: false, explored: false, mined: false, seed: R.int(1, 99999) };
          if (D.planets[pl.cls].gas) pl.size = 1.9;
          sys.planets.push(pl);
        }
        return { type: 'planet', name: pl.name, system: sys.id, cls: pl.cls };
      }
      case 'officer': {
        const b = ST.crew.best(s.skill);
        return b.officer ? { type: 'officer', id: b.officer.id } : null;
      }
      case 'number': return { type: 'number', value: R.int(s.min, s.max) };
      case 'text': return { type: 'text', value: R.pick(s.options) };
      case 'name': {
        const sp = s.species && D.SPECIES[s.species] ? s.species : R.pick(Object.keys(D.SPECIES));
        return { type: 'name', value: ST.randomName(sp) };
      }
    }
    return null;
  }

  // ================================================================ text
  Y.fill = function (str, run) {
    if (str == null) return '';
    const S = ST.S;
    return String(str).replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)(?:\.([a-zA-Z_]+))?\}/g, (m, name, prop) => {
      prop = prop || '';
      try {
        const v = placeholder(name, prop, run, S);
        return v == null ? m : v;
      } catch (e) { return m; }
    });
  };
  function placeholder(name, prop, run, S) {
    const slots = (run && run.slots) || {};
    switch (name) {
      case 'ship': return 'U.S.S. ' + S.ship.name;
      case 'shipclass': return D.playerClasses[S.ship.cls].name;
      case 'captain': return prop === 'name' ? S.captain.name : 'Captain ' + S.captain.name.split(' ').slice(-1)[0];
      case 'stardate': return ST.stardate();
      case 'system': return G.here().name;
      case 'sector': return S.sector;
      case 'officer': {
        let o = null;
        if (prop === 'random') o = ST.rng.pick(ST.crew.available().filter(x => x.role !== 'captain')) || ST.crew.byId('captain');
        else if (D.SKILLS.includes(prop)) o = ST.crew.best(prop).officer;
        else o = ST.crew.available().find(x => x.role === prop) || ST.crew.best((D.ROLES.find(r => r.id === prop) || {}).skill || 'command').officer;
        return ST.crew.display(o);
      }
      case 'away': {
        const team = (run && run.team || []).map(ST.crew.byId).filter(Boolean);
        if (!team.length) return 'the away team';
        return ST.crew.display(prop === 'any' ? ST.rng.pick(team) : team[0]);
      }
    }
    const v = slots[name];
    if (!v) return null;
    switch (v.type) {
      case 'system': {
        const sys = G.sys(v.id);
        if (!prop) return sys.name;
        if (prop === 'planet') { const p = sys.planets.find(x => D.planets[x.cls].habitable) || sys.planets[0]; return p ? p.name : sys.name + ' Prime'; }
        if (prop === 'faction') return G.describe(sys);
        if (prop === 'star') return D.stars[sys.star].name;
        return null;
      }
      case 'faction': case 'species': {
        const f = ST.faction(v.id);
        if (!f) return null;
        switch (prop) {
          case '': return f.adj;
          case 'name': return f.name;
          case 'adj': return f.adj;
          case 'plural': return f.plural;
          case 'short': return f.short;
          case 'leader': return v.leader;
          case 'title': return v.title;
          case 'ship': return v.shipName;
          case 'vessel': return v.vessel;
          case 'look': return f.look || 'a people you have never seen before';
        }
        return null;
      }
      case 'planet': {
        if (!prop) return v.name;
        if (prop === 'class') return D.planets[v.cls].name;
        if (prop === 'kind') return D.planets[v.cls].kind.toLowerCase();
        if (prop === 'system') return G.sys(v.system).name;
        return null;
      }
      case 'officer': {
        const o = ST.crew.byId(v.id);
        if (!o) return 'a crew member';
        if (!prop) return ST.crew.display(o);
        if (prop === 'name') return o.name;
        if (prop === 'rank') return o.role === 'captain' ? 'Captain' : D.RANKS[o.rank];
        if (prop === 'role') return ST.crew.roleTitle(o);
        return null;
      }
      case 'number': case 'text': case 'name': return String(v.value);
    }
    return null;
  }

  // ================================================================ conditions
  function factionIdFor(key, run) {
    if (!key) return null;
    key = String(key).replace(/^\{|\}$/g, '');
    if (D.factions[key]) return key;
    const v = run && run.slots && run.slots[key];
    return v ? v.id : null;
  }
  Y.factionIdFor = factionIdFor;

  Y.test = function (c, run) {
    if (!c) return true;
    const S = ST.S;
    for (const k of Object.keys(c)) {
      const v = c[k];
      switch (k) {
        case 'flag': if (![].concat(v).every(f => S.flags[f])) return false; break;
        case 'notFlag': if ([].concat(v).some(f => S.flags[f])) return false; break;
        case 'item': if (!S.items.includes(v)) return false; break;
        case 'notItem': if (S.items.includes(v)) return false; break;
        case 'min': for (const r of Object.keys(v)) if (ST.res.get(r) < v[r]) return false; break;
        case 'relationAtLeast': for (const f of Object.keys(v)) { const id = factionIdFor(f, run); if (id == null || (S.relations[id] || 0) < v[f]) return false; } break;
        case 'relationBelow': for (const f of Object.keys(v)) { const id = factionIdFor(f, run); if (id == null || (S.relations[id] || 0) >= v[f]) return false; } break;
        case 'twist': if (!(run && run.twists && run.twists[v])) return false; break;
        case 'notTwist': if (run && run.twists && run.twists[v]) return false; break;
        case 'trait': {
          const pool = run && run.team && run.team.length ? run.team.map(ST.crew.byId).filter(Boolean) : ST.crew.available();
          if (!ST.crew.hasTrait(v, pool)) return false; break;
        }
        case 'skillAtLeast': for (const s of Object.keys(v)) if (ST.crew.best(s).value < v[s]) return false; break;
        case 'locationFaction': {
          const f = G.here().faction;
          const ok = [].concat(v).some(x => x === 'none' ? !f : x === 'major' ? !!(f && f !== 'federation') : x === 'foreign' ? !!(f && f !== 'federation') : f === x);
          if (!ok) return false; break;
        }
        case 'locationHas': if (![].concat(v).some(x => G.has(G.here(), x))) return false; break;
        case 'factionIs': {
          const slot = run && run.slots && run.slots[v.slot];
          if (!slot) return false;
          const f = ST.faction(slot.id);
          if (!v.oneOf.some(x => x === slot.id || (x === 'species' && f && f.species))) return false; break;
        }
        case 'planet': {
          const p = run && run.planet;
          if (!p) return false;
          if (v.class && ![].concat(v.class).includes(p.cls)) return false;
          if (v.life && ![].concat(v.life).includes(p.life)) return false;
          if (v.ruins != null && !!p.ruins !== v.ruins) return false;
          if (v.dilithium != null && (p.dilithium > 0 && !p.mined) !== v.dilithium) return false;
          if (v.colony != null && !!p.colony !== v.colony) return false;
          break;
        }
        case 'day': if ((v.min != null && S.day < v.min) || (v.max != null && S.day > v.max)) return false; break;
        case 'chance': if (!(ST.rng.next() < v)) return false; break;
        case 'any': if (!v.some(cc => Y.test(cc, run))) return false; break;
        case 'not': if (Y.test(v, run)) return false; break;
        case 'renownAtLeast': if (S.res.renown < v) return false; break;
        case 'missionActive': if (!S.missions.active.some(m => m.id === v)) return false; break;
        case 'shipClass': if (![].concat(v).includes(S.ship.cls)) return false; break;
        case 'poi': {
          const p = run && run.poi;
          if (!p) return false;
          if (v.type && ![].concat(v.type).includes(p.type)) return false;
          if (v.kind && ![].concat(v.kind).includes(p.kind)) return false;
          break;
        }
      }
    }
    return true;
  };
  /** True if every key of the condition is a resource minimum (so we can show it disabled rather than hide it). */
  Y.isResourceOnly = (c) => c && Object.keys(c).every(k => k === 'min');

  // ================================================================ effects
  const RES_LABEL = { hull: 'Hull', shields: 'Shields', dilithium: 'Dilithium', torpedoes: 'Torpedoes', spares: 'Spares', latinum: 'Latinum', crew: 'Crew', morale: 'Morale', renown: 'Renown' };
  Y.apply = function (fx, run) {
    const S = ST.S, chips = [];
    if (!fx) return chips;
    const push = (text, good) => chips.push({ text, good });
    for (const k of Object.keys(fx)) {
      const v = fx[k];
      if (RES_LABEL[k]) {
        const d = ST.res.add(k, v);
        if (Math.abs(d) >= 0.05) push(RES_LABEL[k] + ' ' + U.sign(Math.round(d * 10) / 10), d > 0);
        if (k === 'crew' && d < 0) { S.stats.crewLost += -d; }
        continue;
      }
      switch (k) {
        case 'time': ST.advanceTime(v); push('+' + v + (v === 1 ? ' day' : ' days'), null); break;
        case 'xp': {
          const team = run && run.team && run.team.length ? run.team.map(ST.crew.byId) : (run && run.lastCheck && run.lastCheck.officer ? [run.lastCheck.officer] : ST.crew.available());
          team.filter(Boolean).forEach(o => ST.crew.addXp(o, v));
          push('Experience +' + v, true); break;
        }
        case 'repair': {
          ST.res.add('hull', v / 2);
          Object.keys(S.ship.systems).forEach(s => { S.ship.systems[s] = Math.min(100, S.ship.systems[s] + v); });
          push('Repairs +' + v, true); break;
        }
        case 'relation':
          Object.keys(v).forEach(key => {
            const id = factionIdFor(key, run);
            if (!id || id === 'federation') return;
            S.relations[id] = U.clamp((S.relations[id] || 0) + v[key], -100, 100);
            push(ST.faction(id).adj + ' relations ' + U.sign(v[key]), v[key] > 0);
          });
          break;
        case 'injure': {
          const n = v.count || 1, sev = v.severity || 'injured';
          for (let i = 0; i < n; i++) {
            const o = pickVictim(v.who, run);
            if (o) push(ST.crew.injure(o, sev), false);
          }
          break;
        }
        case 'damage': {
          const sys = v.system === 'random' ? ST.rng.pick(Object.keys(S.ship.systems)) : v.system;
          S.ship.systems[sys] = Math.max(0, S.ship.systems[sys] - v.amount);
          push(U.cap(sys) + ' damaged −' + v.amount + '%', false); break;
        }
        case 'items':
          (v.add || []).forEach(it => { if (!S.items.includes(it)) { S.items.push(it); push('+ ' + ((D.items[it] || {}).name || it), true); } });
          (v.remove || []).forEach(it => { const i = S.items.indexOf(it); if (i >= 0) { S.items.splice(i, 1); push('− ' + ((D.items[it] || {}).name || it), null); } });
          break;
        case 'setFlags': v.forEach(f => { S.flags[f] = true; }); break;
        case 'clearFlags': v.forEach(f => { delete S.flags[f]; }); break;
        case 'reveal': {
          if (v === 'nearby') { S.galaxy.systems.forEach(s => { if (G.hops(S.location, s.id) <= 2) s.known = true; }); push('Charts updated', true); }
          else { const sl = run && run.slots && run.slots[v]; if (sl) { G.sys(sl.id).known = true; push(G.sys(sl.id).name + ' charted', true); } }
          break;
        }
        case 'startMission': if (ST.missions) { const m = ST.missions.startDirect(v, run); if (m) push('New orders: ' + m.title, true); } break;
        case 'log': ST.log(Y.fill(v, run), 'mission'); break;
        case 'contact': if (run && run.contact) {
          const c = run.contact;
          if (v === 'leave') { S.contacts = S.contacts.filter(x => x.id !== c.id); }
          else c.attitude = v;
        } break;
        case 'openTrade': if (v) run.openTrade = true; break;
        case 'heal': {
          const pool = v === 'away' && run && run.team ? run.team.map(ST.crew.byId).filter(Boolean) : S.officers;
          pool.forEach(o => { if (o.status === 'injured' || o.status === 'critical') { o.status = 'ok'; o.heal = 0; } });
          push('Crew treated', true); break;
        }
      }
    }
    return chips;
  };
  function pickVictim(who, run) {
    const avail = ST.crew.all().filter(o => o.status !== 'dead');
    const nonCap = avail.filter(o => o.role !== 'captain');
    const team = run && run.team ? run.team.map(ST.crew.byId).filter(o => o && o.status !== 'dead') : [];
    if (who === 'away') return ST.rng.pick(team.length ? team : nonCap);
    if (who === 'captain') return ST.crew.byId('captain');
    if (who === 'bridge') return ST.rng.pick(nonCap.filter(o => !team.includes(o))) || ST.rng.pick(nonCap);
    if (D.SKILLS.includes(who)) return ST.crew.best(who, nonCap.length ? nonCap : avail).officer;
    return ST.rng.pick(nonCap.length ? nonCap : avail);
  }

  Y.imageFor = function (img, run) {
    if (!img) return null;
    if (img === '@location') {
      if (run && run.planet) return D.planets[run.planet.cls].art;
      if (run && run.poi) return run.poi.type === 'anomaly' ? ((D.ANOMALY_KINDS.find(k => k.id === run.poi.kind) || {}).art || 'rift') : D.pois[run.poi.type].art;
      return G.systemArt(G.here());
    }
    if (img === '@ship') return 'ship_player';
    const m = /^\{([a-zA-Z_][a-zA-Z0-9_]*)(?:\.(portrait|ship))?\}$/.exec(img);
    if (m) {
      const v = run && run.slots && run.slots[m[1]];
      if (!v) return null;
      if (v.type === 'system') return G.systemArt(G.sys(v.id));
      if (v.type === 'planet') return D.planets[v.cls].art;
      const f = ST.faction(v.id);
      if (!f) return null;
      return m[2] === 'ship' ? f.ship : (f.portrait || f.ship);
    }
    return img;
  };

  // ================================================================ event picking
  Y.pickEvent = function (context, extra) {
    const S = ST.S;
    extra = extra || {};
    const base = {};
    if (extra.them) base.them = extra.themSlot || factionSlotValue(extra.them, extra.contact ? { shipCls: extra.contact.ship, vessel: extra.contact.name } : null);
    const probe = { slots: base, planet: extra.planet, poi: extra.poi, team: [], twists: {} };
    const cands = Object.values(ST.content.events).filter(e => e.context === context && !(e.once && S.eventSeen[e.id]) && Y.test(e.requires, probe));
    for (let tries = 0; tries < 6 && cands.length; tries++) {
      const def = ST.rng.weighted(cands, e => (e.weight == null ? 1 : e.weight) / (1 + (S.eventSeen[e.id] || 0) * 1.5));
      if (!def) return null;
      const slots = Y.resolveSlots(def.slots, base);
      if (slots) return { def, slots };
      cands.splice(cands.indexOf(def), 1);
    }
    return null;
  };

  /** Run a random event of a context. onEnd(result) always fires (also when no event qualifies). */
  Y.runEvent = function (context, extra, onEnd) {
    const pick = Y.pickEvent(context, extra);
    if (!pick) { if (onEnd) onEnd('none'); return false; }
    ST.S.eventSeen[pick.def.id] = (ST.S.eventSeen[pick.def.id] || 0) + 1;
    Y.start(pick.def, { slots: pick.slots, node: pick.def.start, planet: extra && extra.planet, poi: extra && extra.poi, contact: extra && extra.contact, onEnd });
    return true;
  };

  // ================================================================ runner
  Y.start = function (def, opts) {
    const run = {
      def, inst: opts.inst || null, slots: opts.slots || {}, twists: (opts.inst && opts.inst.twists) || {},
      planet: opts.planet || null, poi: opts.poi || null, contact: opts.contact || null, team: [], chips: [], steps: 0,
      onEnd: opts.onEnd || null, lastCheck: null, openTrade: false
    };
    if (run.inst) run.inst.busy = true;
    Y.active = run;
    Y.runs++;
    // First meeting with a generated species counts as first contact.
    const them = run.slots.them;
    if (them) ST.meetSpecies(them.id);
    ST.ui.setNavLocked(true);
    Y.goto(run, opts.node);
  };

  Y.goto = function (run, id) {
    if (Y.active !== run) return;
    const node = run.def.nodes[id];
    if (!node || ++run.steps > 300) { console.warn('[story] missing node or loop', run.def.id, id); return Y.finish(run, 'error'); }
    run.nodeId = id;
    if (node.effects) run.chips = run.chips.concat(Y.apply(node.effects, run));
    if (ST.checkGameOver()) return Y.finish(run, 'gameover');
    switch (node.type) {
      case 'branch': return Y.goto(run, Y.test(node.if, run) ? node.then : node.else);
      case 'random': { const b = ST.rng.weighted(node.branches, x => x.weight); return Y.goto(run, b.next); }
      case 'advance': if (!node.text) return Y.finish(run, 'advance', node); return render(run, node);
      case 'combat': return startCombat(run, node);
      case 'negotiation': return startNegotiation(run, node);
      case 'away_team': return renderTeam(run, node);
      default: return render(run, node);
    }
  };

  function paragraphs(text, run) {
    return Y.fill(text, run).split(/\n\s*\n/).map(p => '<p>' + U.esc(p.trim()).replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br>') + '</p>').join('');
  }
  function chipsHtml(chips) {
    if (!chips || !chips.length) return '';
    return '<div class="fx">' + chips.map(c => '<span class="chip ' + (c.good === true ? 'c-green' : c.good === false ? 'c-red' : 'c-peach') + '" style="background:var(--c)">' + U.esc(c.text) + '</span>').join('') + '</div>';
  }
  Y.chipsHtml = chipsHtml;
  function themeColor(run) {
    const d = run.def;
    if (d.kind === 'mission') return d.crisis ? '#ff6a5a' : '#cc99cc';
    return { travel: '#ff9c00', arrival: '#ffcc66', encounter: '#cc6666', away: '#ffcc99', anomaly: '#9999ff', derelict: '#b8a58a', hail: '#99ccff' }[d.context] || '#ff9c00';
  }
  function kicker(run) {
    const d = run.def;
    if (d.kind === 'mission') return (d.crisis ? 'PRIORITY ONE' : 'MISSION') + ' · ' + d.category.replace('_', ' ');
    return { travel: 'EN ROUTE', arrival: 'SENSOR CONTACT', encounter: 'ALERT', away: 'AWAY TEAM', anomaly: 'SCIENCE', derelict: 'SALVAGE', hail: 'COMMUNICATIONS' }[d.context] || 'LOG';
  }

  function checkLabel(ch, run) {
    const pool = checkPool(ch.check, run);
    const c = ST.crew.chance(ch.check.skill, ch.check.difficulty, pool);
    return ch.check.skill.toUpperCase() + ' ' + Math.round(c.chance * 100) + '%' + (c.officer ? ' · ' + c.officer.name : '');
  }
  function checkPool(check, run) {
    const useAway = check.team === 'away' || (check.team == null && run.team && run.team.length);
    if (useAway && run.team && run.team.length) return run.team.map(ST.crew.byId).filter(Boolean);
    return null;
  }

  function render(run, node) {
    const title = Y.fill(node.title || run.def.title || kicker(run), run);
    const img = Y.imageFor(node.image || run.def.image || (run.def.kind === 'event' ? '@location' : null), run);
    const color = themeColor(run);
    let result = '';
    if (run.lastCheck && run.lastCheck.fresh) {
      const lc = run.lastCheck;
      result = '<div class="result ' + (lc.ok ? 'ok' : 'no') + '">' + lc.skill.toUpperCase() + ' CHECK ' + (lc.ok ? 'SUCCEEDED' : 'FAILED') + ' · ' + Math.round(lc.chance * 100) + '%' + (lc.officer ? ' · ' + U.esc(lc.officer.name) : '') + '</div>';
      lc.fresh = false;
    }
    const chips = chipsHtml(run.chips); run.chips = [];
    let actions = '';
    if (node.type === 'scene' && node.choices) {
      const btns = [];
      node.choices.forEach((ch, i) => {
        const req = ch.requires ? Y.test(ch.requires, run) : true;
        if (!req && !Y.isResourceOnly(ch.requires)) return; // structural requirement not met: hide
        let afford = true, costTxt = '';
        if (ch.cost) {
          costTxt = Object.keys(ch.cost).map(k => ch.cost[k] + ' ' + k).join(', ');
          afford = Object.keys(ch.cost).every(k => ST.res.get(k) >= ch.cost[k]);
        }
        const enabled = req && afford;
        const nextNode = run.def.nodes[ch.next || ch.success];
        const style = ch.style || (ch.check ? ch.check.skill : (nextNode && nextNode.type === 'combat' ? 'fight' : 'neutral'));
        let tag = ch.check ? checkLabel(ch, run) : '';
        if (costTxt) tag = (tag ? tag + ' · ' : '') + 'COST ' + costTxt;
        let why = '';
        if (!req) why = 'Requires ' + Object.keys(ch.requires.min || {}).map(k => ch.requires.min[k] + ' ' + k).join(', ');
        else if (!afford) why = 'Not enough: ' + costTxt;
        btns.push('<button class="choice k-' + style + '" data-act="storyChoice" data-arg="' + i + '"' + (enabled ? '' : ' disabled') + '><span>' + U.esc(Y.fill(ch.label, run)) + '</span>' + (tag ? '<span class="ck">' + U.esc(tag) + '</span>' : '') + (why ? '<span class="why">' + U.esc(why) + '</span>' : '') + '</button>');
      });
      if (!btns.some(b => b.indexOf(' disabled') < 0)) btns.push('<button class="choice k-neutral" data-act="storyAbort"><span>Stand down. There is nothing more you can do here.</span></button>');
      actions = '<div class="choices">' + btns.join('') + '</div>';
    } else if (node.type === 'scene') {
      actions = '<div class="choices"><button class="choice k-neutral" data-act="storyNext"><span>Continue</span></button></div>';
    } else if (node.type === 'end') {
      const lbl = run.def.kind === 'mission' ? (node.result === 'success' ? 'Mission complete' : 'Close mission file') : 'Continue';
      actions = '<div class="choices"><button class="choice k-neutral" data-act="storyEnd"><span>' + lbl + '</span></button></div>';
    } else if (node.type === 'advance') {
      actions = '<div class="choices"><button class="choice k-neutral" data-act="storyAdvance"><span>Continue</span></button></div>';
    }
    const speaker = node.speaker ? '<div class="speaker">' + U.esc(Y.fill(node.speaker, run)) + '</div>' : '';
    const html = '<div class="dlg" style="--c:' + color + '" role="dialog" aria-label="' + U.esc(title) + '"><div class="dlg-rail"></div><div class="dlg-body">' +
      '<div class="dlg-top"><div class="t">' + U.esc(title) + '</div><div class="k">' + U.esc(kicker(run)) + ' · SD ' + ST.stardate() + '</div></div>' +
      '<div class="dlg-grid' + (img ? '' : ' noimg') + '">' +
      (img ? '<div>' + ST.art.html(img, { label: G.here().name, salt: run.def.id }) + '</div>' : '') +
      '<div>' + result + speaker + '<div class="prose">' + paragraphs(node.text || '', run) + '</div>' + chips + actions + '</div>' +
      '</div></div></div>';
    ST.ui.showOverlay(html);
  }

  function renderTeam(run, node) {
    const size = node.size || [1, 3];
    const rec = node.recommend || [];
    if (!run._teamSel) {
      // Pre-select the best available officer for each recommended skill.
      run._teamSel = [];
      const pool = ST.crew.available().filter(o => o.role !== 'captain');
      const want = rec.length ? rec : ['science', 'tactics', 'medicine'];
      want.forEach(s => {
        if (run._teamSel.length >= size[1]) return;
        const best = ST.crew.best(s, pool.filter(o => !run._teamSel.includes(o.id))).officer;
        if (best) run._teamSel.push(best.id);
      });
      while (run._teamSel.length < size[0]) {
        const o = pool.find(x => !run._teamSel.includes(x.id)) || ST.crew.available().find(x => !run._teamSel.includes(x.id));
        if (!o) break;
        run._teamSel.push(o.id);
      }
    }
    const avail = ST.crew.all();
    const title = Y.fill(node.title || run.def.title || 'Away team', run);
    const img = Y.imageFor(node.image || '@location', run);
    const members = avail.map(o => {
      const ok = o.status === 'ok' || o.status === 'injured';
      const on = run._teamSel.includes(o.id);
      const best = D.SKILLS.slice().sort((a, b) => ST.crew.skill(o, b) - ST.crew.skill(o, a)).slice(0, 2);
      return '<button class="m' + (on ? ' on' : '') + '" style="--c:' + ST.crew.roleColor(o) + '" data-act="teamToggle" data-arg="' + o.id + '"' + (ok ? '' : ' disabled') + '>' +
        '<div class="n">' + U.esc(ST.crew.display(o)) + '</div><div class="r">' + U.esc(ST.crew.roleTitle(o)) + (o.status !== 'ok' ? ' · ' + o.status.toUpperCase() : '') + '</div>' +
        '<div class="s">' + best.map(s => (rec.includes(s) ? '★ ' : '') + s.toUpperCase() + ' ' + ST.crew.skill(o, s)).join(' · ') + '</div></button>';
    }).join('');
    const n = run._teamSel.length;
    const html = '<div class="dlg" style="--c:#ffcc99"><div class="dlg-rail"></div><div class="dlg-body">' +
      '<div class="dlg-top"><div class="t">' + U.esc(title) + '</div><div class="k">AWAY TEAM · ' + size[0] + '–' + size[1] + ' OFFICERS</div></div>' +
      '<div class="dlg-grid">' + (img ? '<div>' + ST.art.html(img, { label: 'TRANSPORTER ROOM 2' }) + '</div>' : '') +
      '<div>' + chipsHtml(run.chips) + '<div class="prose">' + paragraphs(node.text || 'Assemble an away team.', run) + '</div>' +
      (rec.length ? '<p class="muted">Recommended skills: ' + rec.map(s => s.toUpperCase()).join(', ') + '. Checks on the surface use the best officer on the team. Officers can be hurt.</p>' : '') +
      '<div class="team">' + members + '</div>' +
      '<div class="choices" style="margin-top:12px"><button class="choice k-command" data-act="teamGo"' + (n >= size[0] && n <= size[1] ? '' : ' disabled') + '><span>Energise (' + n + ' selected)</span><span class="ck">TRANSPORT</span></button></div>' +
      '</div></div></div></div>';
    run._teamNode = node;
    ST.ui.showOverlay(html);
  }

  function startCombat(run, node) {
    const enemies = [];
    (node.enemies || []).forEach(spec => {
      let fid = spec.faction === 'them' ? (run.slots.them && run.slots.them.id) : factionIdFor(spec.faction, run);
      if (!fid) fid = 'orion';
      const count = spec.count || 1;
      for (let i = 0; i < count; i++) {
        let cls, name;
        if (spec.ship === 'contact' && run.contact && run.contact.faction === fid && i === 0) { cls = run.contact.ship; name = run.contact.name; }
        else if (D.ships[spec.ship]) cls = spec.ship;
        else cls = G.shipClassFor(fid, spec.ship === 'contact' ? 'medium' : spec.ship);
        enemies.push({ faction: fid, cls, name: name || G.shipName(fid), contactId: spec.ship === 'contact' && run.contact && i === 0 ? run.contact.id : null });
      }
    });
    ST.ui.hideOverlay();
    ST.combat.start({
      enemies, canFlee: node.canFlee !== false, canHail: node.canHail !== false,
      intro: node.text ? Y.fill(node.text, run) : null,
      onEnd: (outcome) => {
        // outcome: win | surrender | flee
        const target = outcome === 'flee' ? node.flee : outcome === 'surrender' ? (node.surrender || node.win) : node.win;
        if (ST.checkGameOver()) return Y.finish(run, 'gameover');
        Y.active = run;
        ST.ui.setNavLocked(true);
        Y.goto(run, target || node.win);
      }
    });
  }

  function startNegotiation(run, node) {
    const fid = node.party === 'them' ? (run.slots.them && run.slots.them.id) : factionIdFor(node.party, run);
    const slot = node.party === 'them' ? run.slots.them : (run.slots[String(node.party).replace(/[{}]/g, '')] || factionSlotValue(fid));
    ST.diplomacy.negotiate({
      faction: fid, slot, rounds: node.rounds || 6, difficulty: node.difficulty || 'moderate',
      topic: node.topic ? Y.fill(node.topic, run) : 'terms', intro: node.text ? Y.fill(node.text, run) : null,
      image: Y.imageFor(node.image, run), chips: run.chips.splice(0), run,
      onEnd: (won) => { Y.active = run; Y.goto(run, won ? node.win : node.lose); }
    });
  }

  // ---------------------------------------------------------------- actions (wired in ui.js)
  Y.choose = function (i) {
    const run = Y.active; if (!run) return;
    const node = run.def.nodes[run.nodeId];
    const ch = node && node.choices && node.choices[i];
    if (!ch) return;
    if (ch.requires && !Y.test(ch.requires, run)) { ST.audio.play('deny'); return; }
    if (ch.cost) {
      if (!Object.keys(ch.cost).every(k => ST.res.get(k) >= ch.cost[k])) { ST.audio.play('deny'); return; }
      const neg = {}; Object.keys(ch.cost).forEach(k => { neg[k] = -ch.cost[k]; });
      run.chips = run.chips.concat(Y.apply(neg, run));
    }
    if (ch.effects) run.chips = run.chips.concat(Y.apply(ch.effects, run));
    if (ST.checkGameOver()) return Y.finish(run, 'gameover');
    if (ch.check) {
      const r = ST.crew.roll(ch.check.skill, ch.check.difficulty, checkPool(ch.check, run));
      run.lastCheck = Object.assign({ skill: ch.check.skill, fresh: true }, r);
      ST.audio.play(r.ok ? 'success' : 'fail');
      return Y.goto(run, r.ok ? ch.success : ch.failure);
    }
    ST.audio.play('click');
    Y.goto(run, ch.next);
  };
  Y.next = function () { const run = Y.active; if (!run) return; const node = run.def.nodes[run.nodeId]; Y.goto(run, node.next); };
  Y.end = function () { const run = Y.active; if (!run) return; const node = run.def.nodes[run.nodeId]; Y.finish(run, node.result || 'done', node); };
  Y.advance = function () { const run = Y.active; if (!run) return; Y.finish(run, 'advance', run.def.nodes[run.nodeId]); };
  Y.abort = function () { const run = Y.active; if (!run) return; Y.finish(run, 'aborted'); };
  Y.teamToggle = function (id) {
    const run = Y.active; if (!run || !run._teamNode) return;
    const size = run._teamNode.size || [1, 3];
    const i = run._teamSel.indexOf(id);
    if (i >= 0) run._teamSel.splice(i, 1); else if (run._teamSel.length < size[1]) run._teamSel.push(id); else { ST.audio.play('deny'); return; }
    ST.audio.play('click');
    renderTeam(run, run._teamNode);
  };
  Y.teamGo = function () {
    const run = Y.active; if (!run || !run._teamNode) return;
    const node = run._teamNode;
    run.team = run._teamSel.slice(); run._teamSel = null; run._teamNode = null;
    ST.S.stats.away++;
    ST.audio.play('transporter');
    Y.goto(run, node.next);
  };

  Y.finish = function (run, result, node) {
    if (Y.active === run) Y.active = null;
    if (run.inst) run.inst.busy = false;
    ST.ui.hideOverlay();
    ST.ui.setNavLocked(false);
    try { if (run.onEnd) run.onEnd(result, run, node); } catch (e) { console.error(e); }
    if (run.openTrade && !ST.S.over) {
      const fid = run.slots.them ? run.slots.them.id : null;
      ST.ui.openTrade(fid);
    }
    if (ST.S.over) { ST.ui.endScreen(); return; }
    ST.ui.render();
    ST.save();
    if (!Y.active && !(ST.combat && ST.combat.active)) Y.pump();
  };

  // ---------------------------------------------------------------- queue
  /** Queue a function that may start a story run. It receives a `done` callback it must call if it does not start one. */
  Y.enqueue = function (fn) { Y._queue.push(fn); };
  Y.runs = 0;
  Y.pump = function () {
    if (Y.active || (ST.combat && ST.combat.active) || !ST.S || ST.S.over) return;
    if (ST.diplomacy && (ST.diplomacy.active || ST.diplomacy.tradeOpen)) return;
    const fn = Y._queue.shift();
    if (!fn) { if (Y._onIdle) { const f = Y._onIdle; Y._onIdle = null; f(); } return; }
    let started = false;
    try { started = fn(); } catch (e) { console.error(e); }
    if (!started) Y.pump();
  };
  Y.whenIdle = function (fn) { Y._onIdle = fn; Y.pump(); };
})();
