/* Game state: creation, crew, resources, skill checks, time, save/load. */
(function () {
  'use strict';
  const ST = window.ST, D = ST.DATA, U = ST.util;
  const SAVE_KEY = 'frontier-command-save-v1';

  ST.S = null; // the live game state

  // ------------------------------------------------------------ new game
  ST.newGame = function (opts) {
    const seed = (opts.seed >>> 0) || ((Math.random() * 4294967295) >>> 0);
    ST.rng = new ST.RNG(seed);
    const R = ST.rng;
    const cls = D.playerClasses[opts.shipClass] || D.playerClasses.intrepid;
    const S = {
      version: 1, seed, difficulty: opts.difficulty || 'commander',
      day: 0, sdBase: R.int(47100, 48900) + R.int(0, 9) / 10,
      sector: R.pick(D.SECTOR_NAMES),
      captain: { name: (opts.captainName || R.pick(D.CAPTAIN_NAMES)).trim() },
      ship: {
        name: (opts.shipName || R.pick(D.SHIP_NAMES)).trim(),
        cls: cls.id, registry: cls.registryPrefix + R.int(1000, 9999),
        hull: cls.hull, shields: cls.shields,
        power: { phasers: 3, torpedoes: 1, shields: 3, engines: 2, sensors: 1 },
        systems: { phasers: 100, torpedoes: 100, shields: 100, engines: 100, sensors: 100 },
        refits: []
      },
      res: { dilithium: Math.round(cls.dilCap * 0.75), torpedoes: Math.round(cls.torpCap * 0.6), spares: 6, latinum: 80, crew: cls.crew, morale: 70, renown: 0 },
      officers: [],
      relations: {},
      species: {},
      flags: {},
      items: [],
      missions: { active: [], done: [], board: [], boardDay: -99, seq: 0 },
      eventSeen: {},
      log: [],
      location: null, orbit: null, docked: false,
      contacts: [],
      warp: 6,
      crisis: { triggered: false, id: null },
      stats: { jumps: 0, visited: 0, battles: 0, destroyed: 0, contacts: 0, away: 0, crewLost: 0, officersLost: 0, missionsWon: 0, missionsFailed: 0, ly: 0 },
      over: null
    };
    ST.S = S;
    // relations
    Object.values(D.factions).forEach(f => { S.relations[f.id] = R.int(f.startRel[0], f.startRel[1]); });
    // crew
    S.officers.push(makeCaptain(S.captain.name));
    D.ROLES.forEach((role, i) => S.officers.push(makeOfficer(role, i)));
    // galaxy
    ST.galaxy.generate(S);
    S.location = S.galaxy.home;
    ST.galaxy.visit(S.location, true);
    S.docked = false;
    ST.log('Took command of the U.S.S. ' + S.ship.name + ' (' + S.ship.registry + '), ' + cls.name + '.', 'good');
    ST.log('Assigned to patrol the ' + S.sector + '.');
    return S;
  };

  function nameFor(spKey) {
    const R = ST.rng, sp = D.SPECIES[spKey];
    if (sp.single) return R.pick(sp.single);
    const f = R.pick(sp.first), l = R.pick(sp.last);
    return sp.familyFirst ? l + ' ' + f : f + ' ' + l;
  }
  ST.randomName = nameFor;

  function makeCaptain(name) {
    return {
      id: 'captain', name, species: 'human', role: 'captain', rank: 5, level: 3, xp: 0,
      skills: { command: 4, tactics: 3, engineering: 2, science: 2, medicine: 1, diplomacy: 3 },
      trait: null, status: 'ok', heal: 0
    };
  }
  function makeOfficer(role, i) {
    const R = ST.rng;
    const spKeys = Object.keys(D.SPECIES);
    // Counselors lean Betazoid, science officers lean Vulcan, for flavour.
    let sp = R.pick(spKeys);
    if (role.id === 'cns' && R.chance(0.5)) sp = 'betazoid';
    if (role.id === 'sci' && R.chance(0.3)) sp = 'vulcan';
    const skills = {};
    D.SKILLS.forEach(s => { skills[s] = R.int(1, 2); });
    skills[role.skill] = R.int(3, 4);
    const second = R.pick(D.SKILLS.filter(s => s !== role.skill));
    skills[second] = R.int(2, 3);
    const trait = D.SPECIES[sp].trait || (R.chance(0.7) ? R.pick(D.GENERAL_TRAITS) : null);
    return {
      id: 'o' + i + '_' + R.int(100, 999), name: nameFor(sp), species: sp, role: role.id,
      rank: role.id === 'xo' ? 4 : R.int(1, 3), level: 1, xp: 0, skills, trait, status: 'ok', heal: 0
    };
  }
  ST.makeOfficer = makeOfficer;

  // ------------------------------------------------------------ ship stats (with refits)
  ST.shipStats = function () {
    const S = ST.S, cls = D.playerClasses[S.ship.cls], has = (r) => S.ship.refits.includes(r);
    return {
      cls,
      hullMax: cls.hull + (has('armor') ? 30 : 0),
      shieldMax: cls.shields + (has('shields2') ? 25 : 0),
      reactor: cls.reactor + (has('reactor') ? 2 : 0),
      torpCap: cls.torpCap + (has('magazine') ? 10 : 0),
      dilCap: cls.dilCap + (has('tanks') ? 15 : 0),
      crewMax: cls.crew,
      phaserDmg: cls.phaserDmg * (has('phaser2') ? 1.25 : 1),
      torpDmg: cls.torpDmg * (has('quantum') ? 1.4 : 1),
      shieldRegen: has('regen') ? 1.35 : 1,
      fuel: cls.fuel * (has('coils') ? 0.8 : 1),
      warp: cls.warp * (has('coils') ? 1.1 : 1),
      sensorsMax: cls.sensorsMax + (has('sensors') ? 1 : 0),
      cloakDetect: has('sensors'),
      dcTeams: 1 + (has('dc') ? 1 : 0),
      repair: has('dc') ? 1.25 : 1,
      evasion: cls.evasion
    };
  };

  // ------------------------------------------------------------ resources
  ST.res = {};
  ST.res.cap = function (k) {
    const st = ST.shipStats();
    return { hull: st.hullMax, shields: st.shieldMax, dilithium: st.dilCap, torpedoes: st.torpCap, crew: st.crewMax, morale: 100 }[k];
  };
  ST.res.get = function (k) {
    const S = ST.S;
    if (k === 'hull') return S.ship.hull;
    if (k === 'shields') return S.ship.shields;
    return S.res[k] || 0;
  };
  /** Adds (or subtracts) and clamps. Returns the actual delta applied. */
  ST.res.add = function (k, n) {
    const S = ST.S, cap = ST.res.cap(k);
    const before = ST.res.get(k);
    let v = before + n;
    if (cap != null) v = Math.min(v, cap);
    v = k === 'renown' ? Math.max(-50, v) : Math.max(0, v);
    v = Math.round(v * 10) / 10;
    if (k === 'hull') S.ship.hull = v; else if (k === 'shields') S.ship.shields = v; else S.res[k] = v;
    return v - before;
  };

  // ------------------------------------------------------------ crew
  const C = ST.crew = {};
  C.all = () => ST.S.officers.filter(o => o.status !== 'dead');
  C.available = () => ST.S.officers.filter(o => o.status === 'ok' || o.status === 'injured');
  C.byId = (id) => ST.S.officers.find(o => o.id === id);
  C.roleTitle = (o) => o.role === 'captain' ? 'Commanding Officer' : (D.ROLES.find(r => r.id === o.role) || {}).title || 'Officer';
  C.roleColor = (o) => o.role === 'captain' ? '#ffcc99' : (D.ROLES.find(r => r.id === o.role) || {}).color || '#ffcc99';
  C.rankShort = (o) => o.role === 'captain' ? 'Capt.' : D.RANK_SHORT[Math.min(o.rank, D.RANK_SHORT.length - 1)];
  C.display = (o) => o ? C.rankShort(o) + ' ' + o.name : 'the crew';
  C.skill = function (o, s) {
    if (!o || o.status === 'dead' || o.status === 'critical') return 0;
    let v = o.skills[s] || 0;
    const sp = D.SPECIES[o.species];
    if (sp && sp.bonus && sp.bonus[s]) v += sp.bonus[s];
    if (o.trait && D.TRAITS[o.trait] && D.TRAITS[o.trait].skill === s) v += 1;
    if (o.status === 'injured') v -= 1;
    return Math.max(0, v);
  };
  C.best = function (skill, pool) {
    pool = (pool || C.available()).filter(o => o.status === 'ok' || o.status === 'injured');
    let best = null, bv = -1;
    pool.forEach(o => { const v = C.skill(o, skill); if (v > bv) { bv = v; best = o; } });
    return { officer: best, value: Math.max(0, bv) };
  };
  C.hasTrait = function (trait, pool) {
    pool = pool || C.available();
    return pool.some(o => (o.status === 'ok' || o.status === 'injured') && o.trait === trait);
  };
  C.chance = function (skill, difficulty, pool) {
    const S = ST.S, b = C.best(skill, pool), d = D.DIFFICULTIES[difficulty] || D.DIFFICULTIES.moderate;
    const cls = D.playerClasses[S.ship.cls];
    let value = b.value + ((cls.bonus && cls.bonus[skill]) || 0);
    let p = d.base + (value - 3) * 0.08 + D.GAME_DIFFICULTY[S.difficulty].check;
    p += U.clamp((S.res.morale - 60) / 400, -0.1, 0.06);
    if (b.officer && b.officer.trait === 'lucky') p += 0.04;
    if (b.officer && b.officer.trait === 'warrior' && skill === 'tactics') p += 0.05;
    if (!b.officer) p = 0.05;
    return { chance: U.clamp(p, 0.05, 0.95), officer: b.officer, value };
  };
  C.roll = function (skill, difficulty, pool) {
    const c = C.chance(skill, difficulty, pool);
    const ok = ST.rng.next() < c.chance;
    if (c.officer) C.addXp(c.officer, ok ? 12 : 6);
    return Object.assign({ ok }, c);
  };
  C.addXp = function (o, n) {
    if (!o || o.status === 'dead') return;
    if (o.trait === 'joined') n = Math.round(n * 1.5);
    o.xp += n;
    const need = 40 + o.level * 30;
    if (o.xp >= need) {
      o.xp -= need; o.level += 1;
      const role = D.ROLES.find(r => r.id === o.role);
      const primary = role ? role.skill : 'command';
      const pickSkill = (o.skills[primary] < 7 && ST.rng.chance(0.6)) ? primary : ST.rng.pick(D.SKILLS.filter(s => o.skills[s] < 6));
      if (pickSkill) o.skills[pickSkill] += 1;
      if (o.role !== 'captain' && o.rank < 4 && o.level % 2 === 0) o.rank += 1;
      ST.log(C.display(o) + ' earned a commendation. ' + U.cap(pickSkill || 'experience') + ' improved.', 'good');
      if (ST.ui && ST.ui.toast) ST.ui.toast(o.name + ': ' + (pickSkill || 'skill') + ' +1', '#99cc99');
      ST.audio && ST.audio.play('levelUp');
    }
  };
  /** severity: injured | critical | killed. Returns a description. */
  C.injure = function (o, severity) {
    if (!o || o.status === 'dead') return '';
    if (o.role === 'captain' && severity === 'killed') severity = 'critical';
    if (severity === 'killed') {
      o.status = 'dead';
      ST.S.stats.officersLost++;
      ST.res.add('morale', -12);
      ST.log(C.display(o) + ' was killed in the line of duty.', 'warn');
      return C.display(o) + ' KILLED';
    }
    if (severity === 'critical' || (severity === 'injured' && o.status === 'injured')) {
      o.status = 'critical'; o.heal = 8;
      ST.log(C.display(o) + ' was critically injured.', 'warn');
      return C.display(o) + ' CRITICAL';
    }
    o.status = 'injured'; o.heal = 4;
    return C.display(o) + ' INJURED';
  };
  C.healAll = function () { ST.S.officers.forEach(o => { if (o.status === 'injured' || o.status === 'critical') { o.status = 'ok'; o.heal = 0; } }); };

  // ------------------------------------------------------------ time & log
  ST.stardate = function (day) { const S = ST.S; return U.fmt1(S.sdBase + (day == null ? S.day : day) * 2.74); };
  ST.log = function (text, kind) {
    const S = ST.S; if (!S) return;
    S.log.push({ day: S.day, text, kind: kind || '' });
    if (S.log.length > 250) S.log.splice(0, S.log.length - 250);
  };

  /** Advance the clock. Heals crew, ticks missions and board, and checks the crisis. */
  ST.advanceTime = function (days) {
    const S = ST.S;
    if (!days || days <= 0) return;
    const before = Math.floor(S.day);
    S.day = Math.round((S.day + days) * 100) / 100;
    const whole = Math.floor(S.day) - before;
    for (let i = 0; i < whole; i++) {
      const medic = C.best('medicine').value;
      S.officers.forEach(o => {
        if (o.status === 'injured' || o.status === 'critical') {
          o.heal -= 1 + (medic >= 5 ? 0.5 : 0);
          if (o.heal <= 0) {
            if (o.status === 'critical') { o.status = 'injured'; o.heal = 3; }
            else { o.status = 'ok'; o.heal = 0; ST.log(C.display(o) + ' returned to duty.'); }
          }
        }
      });
      // morale drifts toward 60
      if (S.res.morale > 62) S.res.morale -= 0.5; else if (S.res.morale < 58) S.res.morale += 0.5;
    }
    if (ST.missions) ST.missions.tick();
  };

  // ------------------------------------------------------------ save / load
  ST.save = function () {
    const S = ST.S;
    if (!S || S.over) return false;
    if (ST.story && ST.story.active) return false; // never save mid-scene
    if (ST.combat && ST.combat.active) return false;
    S.rngState = ST.rng.s;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); return true; } catch (e) { return false; }
  };
  ST.hasSave = function () { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } };
  ST.load = function () {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const S = JSON.parse(raw);
      if (!S || S.version !== 1) return null;
      ST.S = S;
      ST.rng = new ST.RNG(S.seed); ST.rng.s = S.rngState >>> 0;
      return S;
    } catch (e) { return null; }
  };
  ST.clearSave = function () { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } };
})();
