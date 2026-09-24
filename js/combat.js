/* =========================================================================
   Real-time-with-pause ship combat (Space pauses).
   Player allocates reactor power, picks targets and subsystems, fires
   phasers/torpedoes, uses officer abilities, hails, or spools the warp
   drive to escape.
   ========================================================================= */
(function () {
  'use strict';
  const ST = window.ST, D = ST.DATA, U = ST.util, G = ST.galaxy;
  const CB = ST.combat = { active: null };
  const SYS = ['phasers', 'torpedoes', 'shields', 'engines', 'sensors'];
  const SYS_LABEL = { phasers: 'Phasers', torpedoes: 'Torpedoes', shields: 'Shields', engines: 'Engines', sensors: 'Sensors' };
  const SYS_COLOR = { phasers: '#ff9c00', torpedoes: '#cc6666', shields: '#9999ff', engines: '#ffcc66', sensors: '#99ccff' };
  const ABIL = {
    evasive: { name: 'Evasive pattern', skill: 'command', cd: 25, dur: 8, desc: 'Big evasion boost for 8s' },
    attack: { name: 'Attack pattern', skill: 'tactics', cd: 30, dur: 10, desc: '+20% damage, +accuracy for 10s' },
    reroute: { name: 'Reroute power', skill: 'engineering', cd: 40, dur: 12, desc: '+3 reactor for 12s. Risky' },
    modulate: { name: 'Modulate shields', skill: 'science', cd: 35, dur: 0, desc: 'Restore shields, reveal cloaks, reset Borg adaptation' }
  };

  // ---------------------------------------------------------------- setup
  CB.start = function (opts) {
    const S = ST.S, gd = D.GAME_DIFFICULTY[S.difficulty];
    opts.enemies.forEach(e => ST.meetSpecies(e.faction));
    const enemies = opts.enemies.map((e, i) => {
      const def = D.ships[e.cls] || D.ships.orion_raider;
      const hp = Math.round(def.hull * gd.enemyHp), sh = Math.round(def.shields * gd.enemyHp);
      return {
        i, faction: e.faction, cls: e.cls, def, name: e.name || G.shipName(e.faction), className: G.shipClassName(e.faction, e.cls),
        hull: hp, hullMax: hp, shields: sh, shieldMax: sh, regen: def.regen || 0, evasion: def.evasion || 0,
        weapons: def.weapons.map(w => Object.assign({}, w, { t: Math.random() * w.cd * 0.6 })),
        systems: { weapons: 100, engines: 100, shields: 100 }, status: 'active',
        cloak: !!def.cloak, cloaked: !!def.cloak, cloakT: 0, reveal: 0, adapt: { phaser: 0, torpedo: 0 },
        armor: def.armor ? (S.flags.doomsday_weak ? 0.1 : def.armor) : 0,
        hullRegen: def.hullRegen || 0, fleeTried: false, flash: 0, contactId: e.contactId || null
      };
    });
    // Story flags can weaken the two crisis bosses (see content/missions/crisis.js).
    enemies.forEach(e => {
      if (e.cls === 'borg_cube' && S.flags.borg_weak) {
        e.shields = e.shieldMax = 0; e.hull = e.hullMax = Math.round(e.hullMax * 0.45); e.hullRegen = 0;
        e.weapons.forEach(w => { w.dmg *= 0.55; });
      }
      if (e.cls === 'doomsday' && S.flags.doomsday_weak) { e.hull = e.hullMax = Math.round(e.hullMax * 0.4); }
    });
    const B = CB.active = {
      opts, enemies, time: 0, paused: true, started: false, target: 0, sub: 'hull',
      phaser: 0.4, torp: 0.2, auto: { phasers: true, torpedoes: false },
      abil: { evasive: { cd: 0, t: 0 }, attack: { cd: 0, t: 0 }, reroute: { cd: 0, t: 0 }, modulate: { cd: 0, t: 0 } },
      repair: [], warp: null, hailCd: 0, fx: [], log: [], result: null, hitsTaken: 0, crewLost: 0,
      last: performance.now(), ui: 0
    };
    S.ship.shields = Math.min(S.ship.shields, ST.shipStats().shieldMax);
    clampPower();
    addLog('Red alert. ' + enemies.length + ' hostile' + (enemies.length > 1 ? ' vessels' : ' vessel') + ': ' + enemies.map(e => e.name).join(', ') + '.');
    if (opts.intro) addLog(opts.intro);
    ST.ui.setAlert('red');
    ST.audio.play('alert');
    ST.ui.go('tactical', true);
    requestAnimationFrame(loop);
  };

  function addLog(t) { const B = CB.active; if (!B) return; B.log.unshift(t); if (B.log.length > 7) B.log.length = 7; }
  function skillOf(s) { return ST.crew.best(s).value; }
  function stats() { return ST.shipStats(); }
  function reactor() { const B = CB.active; return stats().reactor + (B && B.abil.reroute.t > 0 ? 3 : 0); }
  function capFor(sys) {
    const st = stats(), h = ST.S.ship.systems[sys];
    const hard = sys === 'sensors' ? st.sensorsMax : 4;
    return Math.min(hard, Math.ceil(h / 25));
  }
  function eff(sys) { return Math.min(ST.S.ship.power[sys], capFor(sys)); }
  function used() { return SYS.reduce((a, s) => a + ST.S.ship.power[s], 0); }
  function clampPower() {
    const P = ST.S.ship.power, max = reactor();
    SYS.forEach(s => { const hard = s === 'sensors' ? stats().sensorsMax : 4; if (P[s] > hard) P[s] = hard; });
    let over = used() - max;
    const order = ['sensors', 'torpedoes', 'engines', 'phasers', 'shields'];
    while (over > 0) { const s = order.find(k => P[k] > 0); if (!s) break; P[s]--; over--; }
  }
  CB.clampPower = clampPower;
  CB.reactor = reactor;
  CB.capFor = capFor;
  function playerEvasion() { const B = CB.active; return stats().evasion + eff('engines') * 0.055 + (B.abil.evasive.t > 0 ? 0.25 + skillOf('command') * 0.02 : 0); }

  // ---------------------------------------------------------------- loop
  function loop(now) {
    const B = CB.active;
    if (!B) return;
    let dt = Math.min(0.1, (now - B.last) / 1000);
    B.last = now;
    if (!B.paused && !B.result) step(dt);
    if (CB.active !== B) return;
    stepFx(B.paused ? 0 : dt);
    if (CB.active !== B) return;
    draw();
    B.ui += dt;
    if (B.ui > 0.1 || B.paused) { B.ui = 0; CB.updateUI(); }
    requestAnimationFrame(loop);
  }

  function step(dt) {
    const B = CB.active, S = ST.S, st = stats();
    B.time += dt;
    // abilities
    Object.keys(B.abil).forEach(k => { const a = B.abil[k]; if (a.cd > 0) a.cd = Math.max(0, a.cd - dt); if (a.t > 0) { a.t = Math.max(0, a.t - dt); if (a.t === 0 && k === 'reroute') clampPower(); } });
    if (B.hailCd > 0) B.hailCd -= dt;
    // shields
    if (S.ship.systems.shields > 0) S.ship.shields = Math.min(st.shieldMax, S.ship.shields + eff('shields') * 1.3 * st.shieldRegen * dt);
    // damage control
    const teams = st.dcTeams;
    let rep = B.repair.slice(0, teams);
    if (!rep.length) { const worst = SYS.filter(s => S.ship.systems[s] < 100).sort((a, b) => S.ship.systems[a] - S.ship.systems[b])[0]; if (worst) rep = [worst]; }
    const eng = ST.crew.best('engineering');
    const rate = (2 + eng.value * 0.7) * st.repair * (eng.officer && eng.officer.trait === 'miracle_worker' ? 1.3 : 1);
    rep.forEach(s => { S.ship.systems[s] = Math.min(100, S.ship.systems[s] + rate * dt); });
    B.repair = B.repair.filter(s => S.ship.systems[s] < 100);
    // weapons
    const tgt = currentTarget();
    if (eff('phasers') > 0) B.phaser = Math.min(1, B.phaser + dt * eff('phasers') * 0.16);
    if (eff('torpedoes') > 0 && S.res.torpedoes > 0) B.torp = Math.min(1, B.torp + dt * eff('torpedoes') * 0.09);
    if (tgt && targetable(tgt)) {
      if (B.phaser >= 1 && B.auto.phasers) CB.firePhasers();
      if (B.torp >= 1 && B.auto.torpedoes) CB.fireTorpedo();
    }
    // warp spool
    if (B.warp) {
      if (eff('engines') <= 0) { B.warp = null; addLog('Warp drive offline. Escape aborted.'); ST.audio.play('deny'); }
      else { B.warp.t += dt * (0.6 + eff('engines') * 0.25); if (B.warp.t >= B.warp.need) return endBattle('flee'); }
    }
    // enemies
    B.enemies.forEach(e => enemyStep(e, dt));
    checkEnd();
  }

  function currentTarget() {
    const B = CB.active;
    let t = B.enemies[B.target];
    if (!t || t.status !== 'active') { t = B.enemies.find(e => e.status === 'active'); if (t) B.target = t.i; }
    return t;
  }
  function targetable(e) {
    if (!e || e.status !== 'active') return false;
    if (!e.cloaked) return true;
    return e.reveal > 0 || (stats().cloakDetect && eff('sensors') >= 2);
  }

  function enemyStep(e, dt) {
    if (e.status !== 'active') return;
    const B = CB.active, gd = D.GAME_DIFFICULTY[ST.S.difficulty];
    if (e.reveal > 0) e.reveal -= dt;
    if (e.shieldMax > 0 && e.systems.shields > 0) e.shields = Math.min(e.shieldMax, e.shields + e.regen * (e.systems.shields / 100) * dt);
    if (e.hullRegen) e.hull = Math.min(e.hullMax, e.hull + e.hullRegen * dt);
    if (e.flash > 0) e.flash -= dt;
    // cloak cycle
    if (e.cloak) {
      e.cloakT -= dt;
      if (!e.cloaked && e.cloakT <= 0 && e.systems.engines > 30) { e.cloaked = true; addLog(e.name + ' cloaks.'); }
    }
    // flee when beaten
    if (!e.fleeTried && e.def.flee && e.hull < e.hullMax * 0.3 && e.systems.engines > 25) {
      e.fleeTried = true;
      if (Math.random() < e.def.flee * 2) { e.status = 'fled'; addLog(e.name + ' breaks off and warps away.'); burst(e, '#ffcc66', 10); return; }
    }
    if (e.systems.weapons <= 0) return;
    const rate = 0.25 + 0.75 * (e.systems.weapons / 100);
    e.weapons.forEach(w => {
      w.t += dt * rate * (e.cloaked ? 0.6 : 1);
      if (w.t < w.cd) return;
      if (e.cloaked) { e.cloaked = false; e.cloakT = 5; addLog(e.name + ' decloaks and opens fire!'); }
      w.t = 0;
      const ev = playerEvasion();
      const hitP = w.type === 'torpedo' ? 0.78 - ev * 1.3 : 0.86 - ev;
      const dmg = w.dmg * gd.enemyDmg * (0.85 + Math.random() * 0.3);
      const sys = w.target || (e.def.prefer && e.def.prefer !== 'hull' && SYS.includes(e.def.prefer) ? e.def.prefer : (e.def.prefer === 'weapons' ? (Math.random() < 0.5 ? 'phasers' : 'torpedoes') : null));
      if (w.type === 'torpedo') {
        B.fx.push({ k: 'torp', from: e, to: 'player', t: 0, dur: 1.0, hit: Math.random() < hitP, dmg, sys, col: '#ff6a3a' });
        ST.audio.play('torpedo');
      } else {
        const hit = Math.random() < hitP;
        B.fx.push({ k: 'beam', from: e, to: 'player', t: 0, dur: 0.35, col: factionColor(e.faction), miss: !hit });
        ST.audio.play('disruptor');
        if (hit) hitPlayer(dmg, 'beam', sys, e); else floater('player', 'MISS', '#99ccff');
      }
    });
  }
  function factionColor(fid) { const f = ST.faction(fid); return f ? f.color : '#ff6a5a'; }

  // ---------------------------------------------------------------- damage
  function hitPlayer(dmg, type, sys, e) {
    const B = CB.active, S = ST.S, st = stats();
    let rem = dmg;
    if (S.ship.shields > 0) {
      const ab = Math.min(S.ship.shields, rem);
      S.ship.shields -= ab; rem -= ab;
      if (S.ship.shields < st.shieldMax * 0.2) rem += dmg * 0.2;
      ST.audio.play(rem > 0 ? 'hit' : 'shieldHit');
    } else ST.audio.play('hit');
    B.shieldFlash = 0.3;
    if (rem > 0) {
      if (type === 'torpedo') rem *= 1.2;
      S.ship.hull = Math.max(0, Math.round((S.ship.hull - rem) * 10) / 10);
      B.hitsTaken++;
      B.shake = 0.25;
      const target = sys && Math.random() < 0.6 ? sys : (Math.random() < 0.3 ? ST.rng.pick(SYS) : null);
      if (target) { S.ship.systems[target] = Math.max(0, S.ship.systems[target] - rem * 1.6); if (S.ship.systems[target] < 25) addLog(SYS_LABEL[target] + ' critical!'); }
      if (rem > 8 && Math.random() < 0.25) { const n = ST.rng.int(1, 3); ST.res.add('crew', -n); S.stats.crewLost += n; B.crewLost += n; addLog('Casualties on deck ' + ST.rng.int(3, 14) + '. ' + n + ' crew lost.'); }
      if (rem > 10 && Math.random() < 0.04) { const o = ST.rng.pick(ST.crew.available().filter(x => x.role !== 'captain')); if (o) addLog(ST.crew.injure(o, 'injured') + ': console explosion.'); }
      floater('player', '−' + Math.round(rem), '#ff6a5a');
      clampPower();
      if (S.ship.hull <= 0) { S.over = { win: false, reason: 'destroyed' }; endBattle('destroyed'); }
    } else floater('player', 'SHIELDS', '#9999ff');
  }

  function hitEnemy(e, dmg, type) {
    const B = CB.active;
    if (e.status !== 'active') return;
    if (e.def.adaptive) { const r = e.adapt[type] || 0; dmg *= (1 - r); e.adapt[type] = Math.min(0.6, r + 0.07); if (r > 0.3 && Math.random() < 0.25) addLog('The Borg are adapting to our ' + (type === 'phaser' ? 'phasers' : 'torpedoes') + '.'); }
    if (e.armor) dmg *= (1 - e.armor);
    let rem = dmg;
    if (e.shields > 0) { const ab = Math.min(e.shields, rem); e.shields -= ab; rem -= ab; }
    e.flash = 0.25;
    if (rem > 0) {
      if (type === 'torpedo') rem *= 1.4;
      if (B.sub !== 'hull' && targetable(e) && eff('sensors') >= 1) {
        e.systems[B.sub] = Math.max(0, e.systems[B.sub] - rem * 2.2);
        e.hull -= rem * 0.6;
        if (e.systems[B.sub] === 0 && !e['_d' + B.sub]) { e['_d' + B.sub] = true; addLog(e.name + ': ' + B.sub + ' disabled.'); }
      } else {
        e.hull -= rem;
        if (Math.random() < 0.2) { const k = ST.rng.pick(['weapons', 'engines', 'shields']); e.systems[k] = Math.max(0, e.systems[k] - rem); }
      }
      floater(e, '−' + Math.round(rem), '#ffcc66');
    } else floater(e, Math.round(dmg) + '', '#9999ff');
    if (e.hull <= 0) destroy(e);
  }

  function destroy(e) {
    const B = CB.active, S = ST.S;
    e.hull = 0; e.status = 'destroyed';
    S.stats.destroyed++;
    ST.audio.play('explosion');
    burst(e, '#ffb060', 60);
    addLog(e.name + ' destroyed.');
    const f = ST.faction(e.faction);
    if (f && !f.pirate && !['borg', 'ancient'].includes(e.faction)) { S.relations[e.faction] = U.clamp((S.relations[e.faction] || 0) - 6, -100, 100); }
    const sal = e.def.salvage || [1, 3];
    B.salvage = B.salvage || { spares: 0, latinum: 0 };
    B.salvage.spares += ST.rng.int(sal[0], sal[1]);
    if (f && (f.pirate || e.faction === 'ferengi')) B.salvage.latinum += ST.rng.int(8, 30);
  }

  // ---------------------------------------------------------------- player actions
  CB.firePhasers = function () {
    const B = CB.active; if (!B || B.result) return;
    const e = currentTarget();
    if (B.phaser < 1 || !e) return;
    if (!targetable(e)) { floater(e, 'NO LOCK', '#99ccff'); return; }
    B.phaser = 0;
    const st = stats();
    const atk = B.abil.attack.t > 0;
    const acc = U.clamp(0.82 + eff('sensors') * 0.03 + (atk ? 0.12 + skillOf('tactics') * 0.01 : 0) - e.evasion * (e.systems.engines / 100) - (e.cloaked ? 0.3 : 0), 0.15, 0.97);
    const hit = Math.random() < acc;
    B.fx.push({ k: 'beam', from: 'player', to: e, t: 0, dur: 0.45, col: '#ff9c00', miss: !hit, w: 3 });
    ST.audio.play('phaser');
    if (hit) hitEnemy(e, st.phaserDmg * (1 + 0.08 * (eff('phasers') - 2)) * (atk ? 1.2 : 1) * (0.85 + Math.random() * 0.3), 'phaser');
    else floater(e, 'MISS', '#99ccff');
  };
  CB.fireTorpedo = function () {
    const B = CB.active, S = ST.S; if (!B || B.result) return;
    const e = currentTarget();
    if (B.torp < 1 || !e || S.res.torpedoes <= 0) return;
    if (!targetable(e)) { floater(e, 'NO LOCK', '#99ccff'); return; }
    B.torp = 0; S.res.torpedoes -= 1;
    const acc = U.clamp(0.8 + eff('sensors') * 0.03 + (B.abil.attack.t > 0 ? 0.08 : 0) - e.evasion * 1.3 * (e.systems.engines / 100), 0.15, 0.95);
    B.fx.push({ k: 'torp', from: 'player', to: e, t: 0, dur: 0.9, hit: Math.random() < acc, dmg: stats().torpDmg * (0.9 + Math.random() * 0.2) * (B.abil.attack.t > 0 ? 1.2 : 1), col: ST.S.ship.refits.includes('quantum') ? '#8fb8ff' : '#ff7a3a' });
    ST.audio.play('torpedo');
  };
  CB.setPower = function (sys, n) {
    const B = CB.active, P = ST.S.ship.power;
    n = Math.max(0, Math.min(n, sys === 'sensors' ? stats().sensorsMax : 4));
    if (P[sys] === n) n = n - 1 < 0 ? 0 : n - 1; // clicking the top pip toggles it off
    const others = used() - P[sys];
    const max = B ? reactor() : stats().reactor;
    if (others + n > max) {
      // pull from other systems (lowest priority first) to make room
      let need = others + n - max;
      const order = ['sensors', 'torpedoes', 'engines', 'phasers', 'shields'].filter(s => s !== sys);
      for (const s of order) { while (need > 0 && P[s] > 0) { P[s]--; need--; } }
    }
    P[sys] = n;
    ST.audio.play('click');
    if (B) CB.updateUI();
  };
  CB.toggleRepair = function (sys) {
    const B = CB.active; if (!B) return;
    const i = B.repair.indexOf(sys);
    if (i >= 0) B.repair.splice(i, 1); else { B.repair.unshift(sys); B.repair = B.repair.slice(0, stats().dcTeams); }
    ST.audio.play('click'); CB.updateUI();
  };
  CB.setTarget = function (i) { const B = CB.active; if (!B || !B.enemies[i] || B.enemies[i].status !== 'active') return; B.target = i; ST.audio.play('select'); CB.updateUI(); };
  CB.setSub = function (s) { const B = CB.active; if (!B) return; B.sub = s; ST.audio.play('click'); CB.updateUI(); };
  CB.toggleAuto = function (w) { const B = CB.active; if (!B) return; B.auto[w] = !B.auto[w]; ST.audio.play('click'); CB.updateUI(); };
  CB.togglePause = function () {
    const B = CB.active; if (!B || B.result || B.menu) return;
    B.paused = !B.paused; B.started = true; B.last = performance.now();
    ST.audio.play('click'); CB.updateUI();
  };
  CB.ability = function (k) {
    const B = CB.active, S = ST.S; if (!B || B.result) return;
    const a = B.abil[k], def = ABIL[k];
    if (a.cd > 0) { ST.audio.play('deny'); return; }
    a.cd = def.cd; a.t = def.dur;
    const sk = skillOf(def.skill), who = ST.crew.best(def.skill).officer;
    if (who) ST.crew.addXp(who, 3);
    if (k === 'evasive') addLog((who ? who.name : 'Helm') + ': evasive pattern engaged.');
    if (k === 'attack') addLog((who ? who.name : 'Tactical') + ': attack pattern, firing solutions locked.');
    if (k === 'reroute') {
      addLog((who ? who.name : 'Engineering') + ': rerouting auxiliary power to the grid.');
      if (Math.random() < Math.max(0.05, 0.28 - sk * 0.03)) { const s = ST.rng.pick(SYS); S.ship.systems[s] = Math.max(0, S.ship.systems[s] - 18); addLog('Power surge! ' + SYS_LABEL[s] + ' damaged.'); ST.audio.play('hit'); }
    }
    if (k === 'modulate') {
      S.ship.shields = Math.min(stats().shieldMax, S.ship.shields + 15 + sk * 4);
      B.enemies.forEach(e => { e.adapt = { phaser: 0, torpedo: 0 }; if (e.cloaked) e.reveal = 6; });
      addLog((who ? who.name : 'Science') + ': shield harmonics remodulated. Tachyon sweep active.');
    }
    ST.audio.play('select'); CB.updateUI();
  };
  CB.retreat = function () {
    const B = CB.active, S = ST.S; if (!B || B.result) return;
    if (!B.opts.canFlee) { ST.ui.toast('We cannot leave. Not this time.', '#cc6666'); ST.audio.play('deny'); return; }
    if (B.warp) { B.warp = null; addLog('Warp spool cancelled.'); CB.updateUI(); return; }
    if (eff('engines') <= 0) { ST.ui.toast('Engines offline. Restore power to engines to escape.', '#cc6666'); ST.audio.play('deny'); return; }
    if (S.res.dilithium < 1) { ST.ui.toast('No dilithium for the warp drive.', '#cc6666'); ST.audio.play('deny'); return; }
    B.warp = { t: 0, need: 7 };
    addLog('Spooling warp drive. Hold them off!');
    ST.audio.play('select'); CB.updateUI();
  };

  // ---------------------------------------------------------------- hail menu
  CB.hail = function () {
    const B = CB.active; if (!B || B.result) return;
    if (!B.opts.canHail) { ST.ui.toast('They are not answering hails.', '#cc6666'); return; }
    if (B.hailCd > 0) { ST.ui.toast('No response. Try again in ' + Math.ceil(B.hailCd) + 's.', '#cc6666'); ST.audio.play('deny'); return; }
    B.menu = true; B.paused = true;
    ST.audio.play('hail');
    const e = currentTarget(); if (!e) return;
    const f = ST.faction(e.faction);
    const pct = e.hull / e.hullMax;
    const surDiff = pct < 0.35 ? 'moderate' : pct < 0.6 ? 'hard' : 'extreme';
    const rel = ST.S.relations[e.faction] || 0;
    const ceaseDiff = rel > -20 ? 'moderate' : 'hard';
    const bribe = 30 + B.enemies.filter(x => x.status === 'active').length * 15;
    const c1 = ST.crew.chance('command', surDiff), c2 = ST.crew.chance('diplomacy', ceaseDiff), c3 = ST.crew.chance('diplomacy', 'easy');
    const mute = f && f.negotiable === false;
    const opts = [];
    if (!mute) {
      opts.push('<button class="choice k-command" data-act="cbHailDo" data-arg="surrender"><span>Demand the ' + U.esc(e.name) + ' stand down and surrender</span><span class="ck">COMMAND ' + Math.round(c1.chance * 100) + '%</span></button>');
      opts.push('<button class="choice k-diplomacy" data-act="cbHailDo" data-arg="ceasefire"><span>Propose a ceasefire</span><span class="ck">DIPLOMACY ' + Math.round(c2.chance * 100) + '%</span></button>');
      if (f.bribable) opts.push('<button class="choice k-diplomacy" data-act="cbHailDo" data-arg="bribe"' + (ST.S.res.latinum >= bribe ? '' : ' disabled') + '><span>Offer latinum to break off the attack</span><span class="ck">DIPLOMACY ' + Math.round(c3.chance * 100) + '% · COST ' + bribe + ' LATINUM</span></button>');
    }
    opts.push('<button class="choice k-neutral" data-act="cbHailDo" data-arg="close"><span>' + (mute ? 'Close the channel' : 'Close the channel and return to battle') + '</span></button>');
    const line = mute ? '"' + (f.hailFlavor || 'Static.') + '"' : (f.hailFlavor || '');
    B.bribeCost = bribe; B.diffs = { surDiff, ceaseDiff };
    ST.ui.showOverlay('<div class="dlg" style="--c:#99ccff"><div class="dlg-rail"></div><div class="dlg-body"><div class="dlg-top"><div class="t">Hailing ' + U.esc(e.name) + '</div><div class="k">CHANNEL OPEN · BATTLE PAUSED</div></div>' +
      '<div class="dlg-grid"><div>' + ST.art.html(f.portrait || f.ship, { label: e.className, color: f.color }) + '</div><div><div class="prose"><p>' + U.esc(line) + '</p><p>Their hull is at ' + Math.round(pct * 100) + '%.</p></div><div class="choices">' + opts.join('') + '</div></div></div></div></div>');
  };
  CB.hailDo = function (what) {
    const B = CB.active; if (!B) return;
    ST.ui.hideOverlay(); B.menu = false;
    if (what === 'close') { CB.updateUI(); return; }
    const e = currentTarget(); if (!e) return;
    const f = ST.faction(e.faction);
    if (what === 'surrender') {
      const r = ST.crew.roll('command', B.diffs.surDiff);
      if (e.faction === 'klingon' && e.hull / e.hullMax > 0.15) { addLog(e.name + ': "Today is a good day to die!"'); B.hailCd = 15; ST.audio.play('fail'); }
      else if (r.ok) { e.status = 'surrendered'; addLog(e.name + ' powers down weapons and surrenders.'); ST.res.add('renown', 2); ST.audio.play('success'); }
      else { addLog(e.name + ' refuses to surrender.'); B.hailCd = 15; ST.audio.play('fail'); }
    } else if (what === 'ceasefire') {
      const r = ST.crew.roll('diplomacy', B.diffs.ceaseDiff);
      if (r.ok) { B.enemies.forEach(x => { if (x.status === 'active' && x.faction === e.faction) x.status = 'ceasefire'; }); addLog('The ' + f.adj + ' commander agrees to a ceasefire.'); ST.audio.play('success'); }
      else { addLog('Ceasefire rejected.'); B.hailCd = 15; ST.audio.play('fail'); }
    } else if (what === 'bribe') {
      if (ST.S.res.latinum < B.bribeCost) return;
      ST.res.add('latinum', -B.bribeCost);
      const r = ST.crew.roll('diplomacy', 'easy');
      if (r.ok) { B.enemies.forEach(x => { if (x.status === 'active' && x.faction === e.faction) x.status = 'ceasefire'; }); addLog('The latinum changes hands. They break off.'); ST.audio.play('success'); }
      else { addLog('They take the latinum and keep shooting.'); B.hailCd = 20; ST.audio.play('fail'); }
    }
    checkEnd();
    CB.updateUI();
  };

  function checkEnd() {
    const B = CB.active; if (!B || B.result) return;
    if (B.enemies.every(e => e.status !== 'active')) {
      const destroyed = B.enemies.some(e => e.status === 'destroyed');
      const calm = B.enemies.some(e => e.status === 'surrendered' || e.status === 'ceasefire');
      endBattle(!destroyed && calm ? 'surrender' : 'win');
    }
  }

  function endBattle(outcome) {
    const B = CB.active, S = ST.S;
    if (!B || B.result) return;
    B.result = outcome; B.paused = true;
    ST.ui.setAlert('none');
    const chips = [];
    if (outcome === 'win' || outcome === 'surrender') {
      S.stats.battles++;
      if (B.salvage) {
        if (B.salvage.spares) { ST.res.add('spares', B.salvage.spares); chips.push({ text: 'Spares +' + B.salvage.spares, good: true }); }
        if (B.salvage.latinum) { ST.res.add('latinum', B.salvage.latinum); chips.push({ text: 'Latinum +' + B.salvage.latinum, good: true }); }
      }
      const r = B.enemies.length * (outcome === 'surrender' ? 3 : 2);
      ST.res.add('renown', r); chips.push({ text: 'Renown +' + r, good: true });
      ST.crew.addXp(ST.crew.best('tactics').officer, 15);
      ST.log('Engagement won against ' + B.enemies.map(e => e.name).join(', ') + '.', 'combat');
    } else if (outcome === 'flee') {
      ST.res.add('dilithium', -1);
      chips.push({ text: 'Dilithium −1', good: false });
      ST.log('Withdrew from combat under fire.', 'combat');
      ST.audio.play('warp');
    }
    if (B.crewLost) chips.push({ text: 'Crew lost ' + B.crewLost, good: false });
    // update contacts in the system
    const gone = B.enemies.filter(e => e.status !== 'active' && e.contactId).map(e => e.contactId);
    S.contacts = S.contacts.filter(c => !gone.includes(c.id));
    if (outcome === 'flee' && S.prevLocation != null && S.prevLocation !== S.location) {
      S.location = S.prevLocation; S.contacts = []; S.orbit = null;
      chips.push({ text: 'Retreated to ' + G.here().name, good: null });
    }
    if (outcome === 'destroyed') { CB.active = null; ST.ui.endScreen(); return; }
    const title = { win: 'Victory', surrender: 'Enemy stands down', flee: 'Escaped' }[outcome];
    const text = { win: 'All hostile vessels neutralised. Damage control teams report in.', surrender: 'The guns fall silent. Starfleet will note your restraint.', flee: 'The warp field snaps into place and the battle falls away behind you.' }[outcome];
    CB.updateUI();
    ST.ui.showOverlay('<div class="dlg" style="--c:' + (outcome === 'flee' ? '#ffcc66' : '#99cc99') + '"><div class="dlg-rail"></div><div class="dlg-body"><div class="dlg-top"><div class="t">' + title + '</div><div class="k">ENGAGEMENT · ' + Math.round(B.time) + 's</div></div>' +
      '<div style="padding-right:16px"><div class="prose"><p>' + text + '</p><p>Hull ' + Math.round(S.ship.hull) + ' / ' + stats().hullMax + '. ' + (B.hitsTaken ? B.hitsTaken + ' hull hits taken.' : 'No hull breaches.') + '</p></div>' + ST.story.chipsHtml(chips) +
      '<div class="choices"><button class="choice k-neutral" data-act="cbClose"><span>Stand down from red alert</span></button></div></div></div></div>');
  }
  CB.close = function () {
    const B = CB.active; if (!B) return;
    CB.active = null;
    ST.ui.hideOverlay();
    const outcome = B.result;
    ST.save();
    if (B.opts.onEnd) B.opts.onEnd(outcome);
    else { ST.ui.setNavLocked(false); ST.ui.render(); ST.story.pump(); }
  };

  // ---------------------------------------------------------------- fx & drawing
  function floater(who, text, col) { const B = CB.active; if (B) B.fx.push({ k: 'float', who, text, col, t: 0, dur: 1.2, dx: (Math.random() - 0.5) * 30 }); }
  function burst(e, col, n) { const B = CB.active; if (!B) return; for (let i = 0; i < n; i++) B.fx.push({ k: 'spark', who: e, a: Math.random() * Math.PI * 2, v: 20 + Math.random() * 90, t: 0, dur: 0.8 + Math.random() * 0.9, col }); }
  function stepFx(dt) {
    const B = CB.active;
    B.fx.forEach(f => { f.t += dt; });
    B.fx.filter(f => f.k === 'torp' && f.t >= f.dur && !f.done).forEach(f => {
      f.done = true;
      if (f.to === 'player') { if (f.hit) hitPlayer(f.dmg, 'torpedo', f.sys, f.from); else floater('player', 'MISS', '#99ccff'); }
      else if (f.hit) { hitEnemy(f.to, f.dmg, 'torpedo'); burst(f.to, '#ff9c40', 12); } else floater(f.to, 'MISS', '#99ccff');
      checkEnd();
    });
    B.fx = B.fx.filter(f => f.t < f.dur);
    if (B.shake > 0) B.shake -= dt;
    if (B.shieldFlash > 0) B.shieldFlash -= dt;
  }

  let bg = null;
  function layout(w, h) {
    const B = CB.active;
    const P = { x: w * 0.2, y: h * 0.52 };
    const act = B.enemies;
    act.forEach((e, i) => { const n = act.length; e.x = w * 0.76 + (n > 1 ? (i % 2) * w * 0.07 : 0); e.y = h * (n === 1 ? 0.5 : 0.2 + (i / (n - 1)) * 0.62); });
    return P;
  }
  function pos(who, P) { return who === 'player' ? P : { x: who.x, y: who.y }; }

  function draw() {
    const B = CB.active;
    const c = document.getElementById('tacCanvas');
    if (!c || !B) return;
    if (!c._fit || c._w !== c.clientWidth) { const f = ST.art.fit(c, 800, 400); c._fit = true; c._w = c.clientWidth; c._ctx = f.x; c._W = f.w; c._H = f.h; bg = null; }
    const x = c._ctx, w = c._W, h = c._H;
    if (!bg) {
      bg = document.createElement('canvas'); bg.width = c.width; bg.height = c.height;
      const bx = bg.getContext('2d'); bx.setTransform(c.width / w, 0, 0, c.height / h, 0, 0);
      bx.fillStyle = '#000'; bx.fillRect(0, 0, w, h);
      ST.art.stars(bx, w, h, new ST.RNG(7), 180);
      bx.strokeStyle = 'rgba(153,153,255,.08)'; bx.lineWidth = 1;
      for (let gx = 0; gx < w; gx += 40) { bx.beginPath(); bx.moveTo(gx, 0); bx.lineTo(gx, h); bx.stroke(); }
      for (let gy = 0; gy < h; gy += 40) { bx.beginPath(); bx.moveTo(0, gy); bx.lineTo(w, gy); bx.stroke(); }
    }
    x.save();
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.drawImage(bg, 0, 0);
    x.restore();
    const dpr = c.width / w;
    x.save();
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (B.shake > 0) x.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    const P = layout(w, h);
    const S = ST.S, st = stats();
    const sc = Math.min(w / 900, h / 420);
    // player
    ST.art.drawShip(x, P.x, P.y, 1.1 * sc, 'player', '#9999ff', 0, { glow: true });
    const sp = S.ship.shields / st.shieldMax;
    if (sp > 0.02) {
      x.strokeStyle = 'rgba(153,153,255,' + (0.15 + sp * 0.35 + (B.shieldFlash > 0 ? 0.4 : 0)).toFixed(2) + ')';
      x.lineWidth = 2 + (B.shieldFlash > 0 ? 3 : 0);
      x.beginPath(); x.ellipse(P.x + 10 * sc, P.y, 95 * sc, 62 * sc, 0, 0, Math.PI * 2); x.stroke();
    }
    if (B.abil.evasive.t > 0) { x.fillStyle = 'rgba(255,204,102,.8)'; x.font = '600 12px Antonio, sans-serif'; x.fillText('EVASIVE', P.x - 30, P.y + 76 * sc); }
    // enemies
    const tgt = B.enemies[B.target];
    B.enemies.forEach(e => {
      if (e.status === 'destroyed' || e.status === 'fled') return;
      const f = ST.faction(e.faction);
      const kind = e.faction === 'borg' ? 'borg' : e.faction === 'ancient' ? 'doomsday' : f && f.species ? 'unknown' : e.faction;
      const alpha = e.cloaked ? (e.reveal > 0 || (st.cloakDetect && eff('sensors') >= 2) ? 0.35 : 0.08) : 1;
      x.globalAlpha = alpha;
      const s = (e.def.tier === 'boss' ? 1.8 : e.def.tier === 'heavy' ? 1.2 : e.def.tier === 'medium' ? 1 : 0.8) * sc * (B.enemies.length > 2 ? 0.8 : 1);
      ST.art.drawShip(x, e.x, e.y, s, kind, e.flash > 0 ? '#ffffff' : (f ? f.color : '#ff6a5a'), Math.PI, { glow: e.flash > 0 });
      if (e.shields > 0 && e.shieldMax > 0) { x.strokeStyle = ST.art.hexA(f ? f.color : '#ff6a5a', 0.12 + 0.35 * e.shields / e.shieldMax); x.lineWidth = 2; x.beginPath(); x.ellipse(e.x, e.y, 70 * s, 50 * s, 0, 0, Math.PI * 2); x.stroke(); }
      x.globalAlpha = 1;
      if (e.status === 'surrendered' || e.status === 'ceasefire') { x.fillStyle = '#99cc99'; x.font = '600 13px Antonio, sans-serif'; x.textAlign = 'center'; x.fillText(e.status === 'ceasefire' ? 'CEASEFIRE' : 'SURRENDERED', e.x, e.y + 60 * s); x.textAlign = 'left'; }
      if (e === tgt && e.status === 'active') {
        const r = 64 * s, t = (performance.now() / 600) % 1;
        x.strokeStyle = 'rgba(255,243,224,' + (0.6 + 0.4 * Math.sin(t * Math.PI * 2)).toFixed(2) + ')'; x.lineWidth = 2;
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { x.beginPath(); x.moveTo(e.x + sx * r, e.y + sy * r * 0.7 - sy * 12); x.lineTo(e.x + sx * r, e.y + sy * r * 0.7); x.lineTo(e.x + sx * r - sx * 12, e.y + sy * r * 0.7); x.stroke(); });
      }
    });
    // beams / torpedoes / sparks / floaters
    B.fx.forEach(f => {
      if (f.k === 'beam') {
        const a = pos(f.from, P), b = pos(f.to, P);
        const bx = f.miss ? b.x + (Math.random() - 0.5) * 60 : b.x, by = f.miss ? b.y + 40 : b.y;
        x.strokeStyle = f.col; x.globalAlpha = 1 - f.t / f.dur; x.lineWidth = f.w || 2.5; x.shadowColor = f.col; x.shadowBlur = 12;
        x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(bx, by); x.stroke();
        x.shadowBlur = 0; x.globalAlpha = 1;
      } else if (f.k === 'torp') {
        const a = pos(f.from, P), b = pos(f.to, P), t = Math.min(1, f.t / f.dur);
        const tx = a.x + (b.x - a.x) * t, ty = a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * -20;
        const g = x.createRadialGradient(tx, ty, 0, tx, ty, 10);
        g.addColorStop(0, '#fff'); g.addColorStop(0.3, f.col); g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g; x.beginPath(); x.arc(tx, ty, 10, 0, Math.PI * 2); x.fill();
      } else if (f.k === 'spark') {
        const p = pos(f.who, P), d = f.v * f.t;
        x.fillStyle = f.col; x.globalAlpha = 1 - f.t / f.dur;
        x.fillRect(p.x + Math.cos(f.a) * d, p.y + Math.sin(f.a) * d, 2.5, 2.5); x.globalAlpha = 1;
      } else if (f.k === 'float') {
        const p = pos(f.who, P);
        x.fillStyle = f.col; x.globalAlpha = 1 - f.t / f.dur; x.font = '600 18px Antonio, sans-serif'; x.textAlign = 'center';
        x.fillText(f.text, p.x + f.dx, p.y - 50 - f.t * 30); x.textAlign = 'left'; x.globalAlpha = 1;
      }
    });
    if (B.paused && !B.result) {
      x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#ffcc66'; x.font = '600 ' + Math.round(22 * Math.max(0.7, sc)) + 'px Antonio, sans-serif'; x.textAlign = 'center';
      const narrow = w < 560;
      x.fillText(B.started ? (narrow ? 'PAUSED' : 'PAUSED · PRESS SPACE OR RESUME') : (narrow ? 'BATTLE STATIONS · PRESS ENGAGE' : 'BATTLE STATIONS · SET POWER, THEN PRESS SPACE OR ENGAGE'), w / 2, h * 0.12);
      x.textAlign = 'left';
    }
    x.restore();
  }

  // ---------------------------------------------------------------- UI
  CB.html = function () {
    const rows = SYS.map(s => '<div class="sysrow" style="--c:' + SYS_COLOR[s] + '"><span class="nm">' + SYS_LABEL[s] + '</span><div class="pw" id="pw_' + s + '"></div><button class="lc-btn sm dc c-peach" id="dc_' + s + '" data-act="cbRepair" data-arg="' + s + '" title="Assign damage control">DC</button><div class="hp"><i id="hp_' + s + '"></i></div></div>').join('');
    const abil = Object.keys(ABIL).map(k => '<button class="lc-btn sm block ability c-' + ({ evasive: 'orange', attack: 'red', reroute: 'tan', modulate: 'blue' }[k]) + '" id="ab_' + k + '" data-act="cbAbility" data-arg="' + k + '" title="' + ABIL[k].desc + '"><span>' + ABIL[k].name + '</span><span class="sub" id="abt_' + k + '"></span><span class="cd" id="abc_' + k + '"></span></button>').join('');
    return '<div class="combat" id="combatRoot">' +
      '<div class="stack">' +
      '<div class="hdr" style="--c:var(--orange)"><span class="cap"></span><span class="t">Power</span><span class="fill"></span><span class="tag" id="cbReactor">—</span></div>' + rows +
      '<div class="sub-h">Ship</div>' +
      '<div class="stack" style="gap:6px"><div class="row" style="justify-content:space-between"><span class="muted">HULL</span><span class="num" id="cbHullT"></span></div><div class="meter" style="--c:var(--peach)"><i id="cbHull"></i></div>' +
      '<div class="row" style="justify-content:space-between"><span class="muted">SHIELDS</span><span class="num" id="cbShT"></span></div><div class="meter" style="--c:var(--blue)"><i id="cbSh"></i></div>' +
      '<div class="row" style="justify-content:space-between"><span class="muted">EVASION</span><span class="num" id="cbEv"></span></div></div>' +
      '<div class="sub-h">Officers</div><div class="stack" style="gap:6px">' + abil + '</div>' +
      '</div>' +
      '<div class="mid"><div class="canvas-wrap tac-wrap"><canvas id="tacCanvas"></canvas></div>' +
      '<div class="cols even" style="gap:12px">' +
      '<div class="stack" style="gap:6px"><div class="wpn" style="--c:var(--orange)"><div class="charge"><i id="chPh"></i></div><button class="lc-btn sm c-orange" data-act="cbFire" data-arg="phasers">Fire phasers</button></div><button class="lc-btn sm ghost c-orange" id="autoPh" data-act="cbAuto" data-arg="phasers">Auto-fire</button></div>' +
      '<div class="stack" style="gap:6px"><div class="wpn" style="--c:var(--red)"><div class="charge"><i id="chTp"></i></div><button class="lc-btn sm c-red" data-act="cbFire" data-arg="torpedoes">Torpedo <span id="tpN"></span></button></div><button class="lc-btn sm ghost c-red" id="autoTp" data-act="cbAuto" data-arg="torpedoes">Auto-fire</button></div>' +
      '</div>' +
      '<div class="row"><button class="lc-btn c-tan" id="cbPause" data-act="cbPause">Engage</button><button class="lc-btn c-sky" data-act="cbHail">Hail</button><button class="lc-btn c-lilac" id="cbWarp" data-act="cbRetreat">Retreat</button><div class="charge" style="flex:1;min-width:80px;--c:var(--lilac)"><i id="chWarp"></i></div></div>' +
      '<div class="log" id="cbLog" style="font-size:16px"></div></div>' +
      '<div class="stack"><div class="hdr" style="--c:var(--red)"><span class="cap"></span><span class="t">Targets</span><span class="fill"></span><span class="end"></span></div><div class="list" id="cbTargets"></div>' +
      '<div class="sub-h">Target subsystem</div><div class="subtgt" id="cbSub">' + ['hull', 'weapons', 'engines', 'shields'].map(s => '<button class="lc-btn sm c-peach" data-act="cbSub" data-arg="' + s + '">' + s + '</button>').join('') + '</div>' +
      '<p class="muted" style="font-size:14px;margin:6px 0 0">Subsystem strikes need sensor power. Space pauses. Torpedoes hit hulls hard but can be dodged.</p></div>' +
      '</div>';
  };

  CB.updateUI = function () {
    const B = CB.active, S = ST.S;
    if (!B || !document.getElementById('combatRoot')) return;
    const $ = (id) => document.getElementById(id);
    const st = stats();
    $('cbReactor').textContent = used() + ' / ' + reactor() + ' POWER';
    SYS.forEach(s => {
      const cap = capFor(s), hard = s === 'sensors' ? st.sensorsMax : 4, p = S.ship.power[s];
      const el = $('pw_' + s);
      let html = '';
      for (let i = 1; i <= hard; i++) html += '<button class="' + (i <= p ? (i <= cap ? 'on' : 'cap') : (i > cap ? 'cap' : '')) + '" data-act="cbPower" data-arg="' + s + ':' + i + '" aria-label="' + s + ' power ' + i + '"></button>';
      if (el._h !== html) { el.innerHTML = html; el._h = html; }
      const hpv = S.ship.systems[s];
      const bar = $('hp_' + s); bar.style.width = hpv + '%'; bar.className = hpv < 25 ? 'c' : hpv < 60 ? 'w' : '';
      const dc = $('dc_' + s); dc.classList.toggle('on', B.repair.includes(s)); dc.style.visibility = hpv < 100 ? 'visible' : 'hidden';
    });
    $('cbHull').style.width = (S.ship.hull / st.hullMax * 100) + '%'; $('cbHullT').textContent = Math.round(S.ship.hull) + ' / ' + st.hullMax;
    $('cbSh').style.width = (S.ship.shields / st.shieldMax * 100) + '%'; $('cbShT').textContent = Math.round(S.ship.shields) + ' / ' + st.shieldMax;
    $('cbEv').textContent = Math.round(playerEvasion() * 100) + '%';
    Object.keys(ABIL).forEach(k => {
      const a = B.abil[k], btn = $('ab_' + k);
      btn.disabled = a.cd > 0 || !!B.result;
      $('abt_' + k).textContent = a.t > 0 ? 'ACTIVE ' + Math.ceil(a.t) + 's' : a.cd > 0 ? Math.ceil(a.cd) + 's' : ABIL[k].skill.toUpperCase() + ' ' + skillOf(ABIL[k].skill);
      $('abc_' + k).style.width = (a.cd / ABIL[k].cd * 100) + '%';
    });
    $('chPh').style.width = (B.phaser * 100) + '%';
    $('chTp').style.width = (B.torp * 100) + '%';
    $('tpN').textContent = '(' + S.res.torpedoes + ')';
    $('autoPh').style.background = B.auto.phasers ? 'var(--c)' : 'transparent'; $('autoPh').style.color = B.auto.phasers ? '#000' : 'var(--c)';
    $('autoTp').style.background = B.auto.torpedoes ? 'var(--c)' : 'transparent'; $('autoTp').style.color = B.auto.torpedoes ? '#000' : 'var(--c)';
    $('cbPause').textContent = !B.started ? 'Engage' : B.paused ? 'Resume' : 'Pause';
    $('cbWarp').textContent = B.warp ? 'Cancel warp' : 'Retreat';
    $('chWarp').style.width = B.warp ? (B.warp.t / B.warp.need * 100) + '%' : '0%';
    const logHtml = B.log.map(t => '<div>' + U.esc(t) + '</div>').join('');
    if ($('cbLog')._h !== logHtml) { $('cbLog').innerHTML = logHtml; $('cbLog')._h = logHtml; }
    const tg = B.enemies.map(e => {
      const f = ST.faction(e.faction);
      const st2 = e.status === 'active' ? (e.cloaked ? (targetable(e) ? 'CLOAKED · TRACKING' : 'CLOAKED') : 'ACTIVE') : e.status.toUpperCase();
      const sysb = ['weapons', 'engines', 'shields'].map(k => '<span class="chip ' + (e.systems[k] < 30 ? 'c-red' : 'o') + '" style="font-size:11px">' + k.slice(0, 3) + ' ' + Math.round(e.systems[k]) + '</span>').join(' ');
      return '<div class="card enemy' + (e.i === B.target && e.status === 'active' ? ' tgt' : '') + '" style="--c:' + (f ? f.color : '#cc6666') + ';opacity:' + (e.status === 'active' ? 1 : 0.45) + '" data-act="cbTarget" data-arg="' + e.i + '">' +
        '<h3>' + U.esc(e.name) + '</h3><div class="muted" style="font-size:14px">' + U.esc(e.className) + ' · ' + st2 + '</div>' +
        '<div class="meter" style="--c:var(--peach);margin-top:6px"><i style="width:' + (e.hull / e.hullMax * 100) + '%"></i></div>' +
        (e.shieldMax ? '<div class="meter" style="--c:var(--blue);margin-top:3px;height:6px"><i style="width:' + (e.shields / e.shieldMax * 100) + '%"></i></div>' : '') +
        '<div style="margin-top:5px">' + sysb + '</div></div>';
    }).join('');
    if ($('cbTargets')._h !== tg) { $('cbTargets').innerHTML = tg; $('cbTargets')._h = tg; }
    $('cbSub').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.getAttribute('data-arg') === B.sub));
    ST.ui.renderChrome();
  };

  CB.powerFromArg = function (arg) { const [s, n] = arg.split(':'); CB.setPower(s, +n); };
})();
