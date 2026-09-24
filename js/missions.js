/* Mission lifecycle: board offers, accept, stage triggers, deadlines, rewards,
   and the sector crisis that ends the campaign. */
(function () {
  'use strict';
  const ST = window.ST, D = ST.DATA, U = ST.util, G = ST.galaxy, Y = ST.story;
  const M = ST.missions = {};
  const MAX_ACTIVE = 3, BOARD_SIZE = 3, BOARD_DAYS = 6;

  M.def = (inst) => ST.content.missions[inst.id];
  M.stage = (inst) => { const d = M.def(inst); return d && d.stages[inst.stage]; };

  M.generateOffer = function (def) {
    const S = ST.S;
    if (!def || def.crisis) return null;
    if (!Y.test(def.requires, { slots: {}, twists: {} })) return null;
    const slots = Y.resolveSlots(def.slots);
    if (!slots) return null;
    const twists = {};
    (def.twists || []).forEach(t => { if (ST.rng.chance(t.chance)) twists[t.id] = true; });
    const inst = {
      uid: 'm' + (++S.missions.seq), id: def.id, category: def.category, giver: def.giver || 'starfleet',
      slots, twists, stage: 0, status: 'offered', busy: false, crisis: !!def.crisis,
      deadline: def.deadline ? ST.rng.int(def.deadline[0], def.deadline[1]) : null, deadlineDay: null
    };
    const run = { slots, twists };
    inst.title = Y.fill(def.title, run);
    inst.briefing = Y.fill(def.briefing, run);
    return inst;
  };

  function pickDefs(exclude) {
    const S = ST.S, counts = S.missions.count || (S.missions.count = {});
    return Object.values(ST.content.missions).filter(d => !d.crisis && !exclude.includes(d.id));
  }

  M.refreshBoard = function (force) {
    const S = ST.S;
    if (!force && S.day - S.missions.boardDay < BOARD_DAYS && S.missions.board.length) return;
    S.missions.board = [];
    S.missions.boardDay = S.day;
    M.fillBoard();
  };
  M.fillBoard = function () {
    const S = ST.S, counts = S.missions.count || (S.missions.count = {});
    let guard = 0;
    while (S.missions.board.length < BOARD_SIZE && guard++ < 20) {
      const exclude = S.missions.active.map(m => m.id).concat(S.missions.board.map(m => m.id));
      const defs = pickDefs(exclude);
      if (!defs.length) break;
      const def = ST.rng.weighted(defs, d => (d.weight == null ? 1 : d.weight) / (1 + (counts[d.id] || 0) * 0.8));
      const inst = M.generateOffer(def);
      if (inst) S.missions.board.push(inst);
    }
  };

  M.canAccept = () => ST.S.missions.active.filter(m => !m.crisis).length < MAX_ACTIVE;

  M.accept = function (uid, silent) {
    const S = ST.S;
    const i = S.missions.board.findIndex(m => m.uid === uid);
    if (i < 0) return null;
    if (!M.canAccept()) { ST.ui.toast('Too many active missions', '#cc6666'); ST.audio.play('deny'); return null; }
    const inst = S.missions.board.splice(i, 1)[0];
    activate(inst, silent);
    return inst;
  };

  function activate(inst, silent) {
    const S = ST.S, def = M.def(inst);
    inst.status = 'active';
    inst.acceptedDay = S.day;
    inst.deadlineDay = inst.deadline ? S.day + inst.deadline : null;
    S.missions.active.push(inst);
    Object.keys(def.slots || {}).forEach(k => { const v = inst.slots[k]; if (v && v.type === 'system' && def.slots[k].reveal !== false) G.sys(v.id).known = true; });
    if (def.onAccept) {
      const chips = Y.apply(def.onAccept, { slots: inst.slots, twists: inst.twists, inst });
      inst.accItems = (def.onAccept.items && def.onAccept.items.add) || [];
      if (!silent && chips.length) ST.ui.toast(chips.map(c => c.text).join(' · '), '#cc99cc');
    }
    ST.log('New orders: ' + inst.title + '.', 'mission');
    if (!silent) { ST.ui.toast('Mission accepted: ' + inst.title, '#cc99cc'); ST.audio.play('select'); }
    M.onStageStart(inst);
  }

  /** Start a mission straight away (from an effect or the crisis). */
  M.startDirect = function (id) {
    const def = ST.content.missions[id];
    if (!def) return null;
    const S = ST.S;
    if (S.missions.active.some(m => m.id === id)) return null;
    const saved = def.crisis; def.crisis = false; // allow generateOffer to run for crisis defs
    const inst = M.generateOffer(def);
    def.crisis = saved;
    if (!inst) return null;
    inst.crisis = !!def.crisis;
    activate(inst, true);
    return inst;
  };

  M.onStageStart = function (inst) {
    const st = M.stage(inst);
    if (!st) return;
    if (st.trigger.on === 'immediate') { Y.enqueue(() => runStage(inst)); Y.pump(); return; }
    if (st.trigger.on === 'arrive' && inst.slots[st.trigger.slot] && inst.slots[st.trigger.slot].id === ST.S.location && !ST.travel.active) {
      Y.enqueue(() => runStage(inst)); Y.pump();
    }
  };

  function runStage(inst) {
    if (inst.status !== 'active' || inst.busy) return false;
    const def = M.def(inst), st = M.stage(inst);
    if (!def || !st) return false;
    Y.start(def, { inst, slots: inst.slots, node: st.node, onEnd: (result, run, node) => onRunEnd(inst, result, node) });
    return true;
  }

  function onRunEnd(inst, result, node) {
    const def = M.def(inst);
    if (result === 'advance') {
      let idx = inst.stage + 1;
      if (node && node.stage) idx = def.stages.findIndex(s => s.id === node.stage);
      if (idx < 0 || idx >= def.stages.length) return M.complete(inst, 'success');
      inst.stage = idx;
      ST.log(inst.title + ': ' + Y.fill(def.stages[idx].objective, { slots: inst.slots }) + '.', 'mission');
      ST.ui.toast('Objective: ' + Y.fill(def.stages[idx].objective, { slots: inst.slots }), '#cc99cc');
      M.onStageStart(inst);
    } else if (result === 'success' || result === 'failure') {
      M.complete(inst, result);
    }
  }

  /** Fire stage triggers for an event at a system. type: arrive | scan | dock */
  M.trigger = function (type, systemId) {
    let any = false;
    ST.S.missions.active.slice().forEach(inst => {
      const st = M.stage(inst);
      if (!st || st.trigger.on !== type || inst.busy) return;
      const slot = inst.slots[st.trigger.slot];
      if (slot && slot.id === systemId) { Y.enqueue(() => runStage(inst)); any = true; }
    });
    return any;
  };

  M.complete = function (inst, result, why) {
    const S = ST.S, def = M.def(inst);
    S.missions.active = S.missions.active.filter(m => m !== inst);
    inst.status = result;
    inst.doneDay = S.day;
    S.missions.done.unshift(inst);
    if (S.missions.done.length > 40) S.missions.done.length = 40;
    const counts = S.missions.count || (S.missions.count = {});
    counts[inst.id] = (counts[inst.id] || 0) + 1;
    const run = { slots: inst.slots, twists: inst.twists, inst };
    let chips = [];
    if (result === 'success') {
      chips = Y.apply(def.rewards || { renown: 8 }, run);
      if (inst.giver && inst.giver !== 'starfleet') chips = chips.concat(Y.apply({ relation: { [inst.giver]: 8 } }, run));
      S.stats.missionsWon++;
      ST.log('Mission accomplished: ' + inst.title + '.', 'good');
      ST.audio.play('success');
    } else {
      chips = Y.apply(def.penalties || { renown: -4 }, run);
      S.stats.missionsFailed++;
      ST.log('Mission ' + (result === 'expired' ? 'expired' : 'failed') + ': ' + inst.title + '.', 'warn');
      ST.audio.play('fail');
    }
    (inst.accItems || []).forEach(it => { const i = S.items.indexOf(it); if (i >= 0) S.items.splice(i, 1); });
    ST.ui.toast((result === 'success' ? 'Mission complete: ' : result === 'expired' ? 'Mission expired: ' : 'Mission failed: ') + inst.title + (chips.length ? ' · ' + chips.map(c => c.text).join(' · ') : ''), result === 'success' ? '#99cc99' : '#cc6666');
    if (inst.crisis) {
      S.over = result === 'success' ? { win: true, reason: 'crisis', title: inst.title } : { win: false, reason: 'crisis', title: inst.title };
      return;
    }
    M.fillBoard();
    M.checkCrisis();
  };

  M.tick = function () {
    const S = ST.S;
    S.missions.active.slice().forEach(inst => {
      if (inst.busy || inst.deadlineDay == null) return;
      if (S.day > inst.deadlineDay) M.complete(inst, 'expired');
    });
    if (S.day - S.missions.boardDay >= BOARD_DAYS) M.refreshBoard(true);
    M.checkCrisis();
  };

  M.checkCrisis = function () {
    const S = ST.S;
    if (S.crisis.triggered || S.over) return;
    const gd = D.GAME_DIFFICULTY[S.difficulty];
    if (S.res.renown < gd.crisisRenown && S.day < gd.crisisDay) return;
    const defs = ST.rng.shuffle(Object.values(ST.content.missions).filter(d => d.crisis));
    for (const def of defs) {
      const inst = M.startDirect(def.id);
      if (inst) {
        S.crisis.triggered = true; S.crisis.id = def.id; S.crisis.uid = inst.uid;
        ST.log('PRIORITY ONE: ' + inst.title, 'warn');
        return;
      }
    }
  };

  M.objective = function (inst) {
    const st = M.stage(inst);
    if (!st) return '';
    return Y.fill(st.objective, { slots: inst.slots, twists: inst.twists });
  };
  M.targetSystem = function (inst) {
    const st = M.stage(inst);
    if (!st || !st.trigger.slot) return null;
    const v = inst.slots[st.trigger.slot];
    return v ? v.id : null;
  };
  /** True if an active mission is waiting for a sensor scan of this system. */
  M.wantsScan = function (sysId) {
    return ST.S.missions.active.some(m => { const st = M.stage(m); const v = st && st.trigger.slot && m.slots[st.trigger.slot]; return st && st.trigger.on === 'scan' && v && v.id === sysId && !m.busy; });
  };
  M.daysLeft = function (inst) { return inst.deadlineDay == null ? null : Math.max(0, inst.deadlineDay - ST.S.day); };
})();
