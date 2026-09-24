/* =========================================================================
   Content schema + validator + registry.
   Missions and events are plain data objects registered with
   ST.content.register({...}). This file defines the full vocabulary the
   engine understands and rejects anything it does not. It runs in the
   browser and under Node (tools/validate-content.mjs).
   Human-readable spec: docs/MISSION_AUTHORING.md
   ========================================================================= */
(function (root) {
  'use strict';
  const ST = root.ST;
  const D = ST.DATA;

  const V = ST.schema = {};
  V.KINDS = ['mission', 'event'];
  V.CATEGORIES = ['survey', 'first_contact', 'rescue', 'delivery', 'escort', 'patrol', 'investigate', 'recover', 'hunt', 'mediate', 'archaeology', 'medical', 'trade', 'crisis'];
  V.CONTEXTS = ['travel', 'arrival', 'encounter', 'away', 'anomaly', 'derelict', 'hail'];
  V.NODE_TYPES = ['scene', 'end', 'advance', 'branch', 'random', 'combat', 'negotiation', 'away_team'];
  V.TRIGGERS = ['arrive', 'scan', 'dock', 'immediate'];
  V.SLOT_TYPES = ['system', 'faction', 'species', 'planet', 'officer', 'number', 'text', 'name'];
  V.RESOURCES = ['hull', 'shields', 'dilithium', 'torpedoes', 'spares', 'latinum', 'crew', 'morale', 'renown'];
  V.NUM_EFFECTS = V.RESOURCES.concat(['time', 'xp', 'repair']);
  V.EFFECT_KEYS = V.NUM_EFFECTS.concat(['relation', 'injure', 'damage', 'items', 'setFlags', 'clearFlags', 'reveal', 'startMission', 'log', 'contact', 'openTrade', 'heal']);
  V.SYSTEMS = ['phasers', 'torpedoes', 'shields', 'engines', 'sensors'];
  V.SEVERITIES = ['injured', 'critical', 'killed'];
  V.INJURE_WHO = ['random', 'away', 'bridge', 'captain'].concat(D.SKILLS);
  V.TIERS = ['light', 'medium', 'heavy', 'boss', 'contact'];
  V.CONDITION_KEYS = ['flag', 'notFlag', 'item', 'notItem', 'min', 'relationAtLeast', 'relationBelow', 'twist', 'notTwist', 'trait', 'skillAtLeast', 'locationFaction', 'locationHas', 'factionIs', 'planet', 'day', 'chance', 'any', 'not', 'renownAtLeast', 'missionActive', 'shipClass', 'poi'];
  V.POI_TYPES = Object.keys(D.pois);
  V.FEATURES = ['dilithium', 'ruins', 'habitable', 'life', 'station', 'pulsar', 'blackhole', 'star:collapsed'];
  V.LOCATION_FACTIONS = ['none', 'major', 'foreign'].concat(Object.keys(D.factions));
  V.SLOT_PROPS = {
    system: ['', 'planet', 'faction', 'star'],
    faction: ['', 'name', 'adj', 'plural', 'leader', 'ship', 'title', 'short', 'vessel'],
    species: ['', 'name', 'adj', 'plural', 'leader', 'ship', 'title', 'short', 'look', 'vessel'],
    planet: ['', 'class', 'kind', 'system'],
    officer: ['', 'name', 'rank', 'role'],
    number: [''], text: [''], name: ['']
  };
  V.BUILTINS = {
    ship: [''], captain: ['', 'name'], stardate: [''], system: [''], sector: [''], shipclass: [''],
    officer: D.SKILLS.concat(D.ROLES.map(r => r.id), ['random']),
    away: ['leader', 'any'],
    them: V.SLOT_PROPS.faction.concat(['look'])
  };

  // ---------------------------------------------------------------- registry
  const C = ST.content = { missions: {}, events: {}, items: {}, errors: [], warnings: [], order: [] };

  C.register = function (def) {
    const res = V.validate(def);
    const id = def && def.id ? def.id : '(no id)';
    res.errors.forEach(e => C.errors.push(id + ': ' + e));
    res.warnings.forEach(w => C.warnings.push(id + ': ' + w));
    if (res.errors.length) {
      if (typeof console !== 'undefined') console.warn('[content] skipped "' + id + '":\n  ' + res.errors.join('\n  '));
      return false;
    }
    if (def.items) Object.keys(def.items).forEach(k => { D.items[k] = D.items[k] || def.items[k]; });
    const bucket = def.kind === 'mission' ? C.missions : C.events;
    if (bucket[def.id]) C.warnings.push(def.id + ': duplicate id, later definition wins');
    bucket[def.id] = def;
    C.order.push(def.id);
    return true;
  };

  /** Cross-reference checks that need every pack loaded. */
  C.finalize = function () {
    const all = Object.values(C.missions).concat(Object.values(C.events));
    all.forEach(def => {
      walk(def, (v, path) => {
        if (path.endsWith('.startMission') && typeof v === 'string' && !C.missions[v]) C.warnings.push(def.id + ': startMission "' + v + '" not found');
      });
    });
    return { errors: C.errors.slice(), warnings: C.warnings.slice() };
  };

  function walk(o, fn, path) {
    path = path || '';
    if (Array.isArray(o)) o.forEach((v, i) => walk(v, fn, path + '[' + i + ']'));
    else if (o && typeof o === 'object') Object.keys(o).forEach(k => { fn(o[k], path + '.' + k); walk(o[k], fn, path + '.' + k); });
  }

  // ---------------------------------------------------------------- validator
  V.validate = function (def) {
    const E = [], W = [];
    const err = (m) => E.push(m), warn = (m) => W.push(m);
    if (!def || typeof def !== 'object') { err('definition must be an object'); return { errors: E, warnings: W }; }
    if (!V.KINDS.includes(def.kind)) err('kind must be one of ' + V.KINDS.join(', '));
    if (typeof def.id !== 'string' || !/^[a-z0-9_]+$/.test(def.id)) err('id must be lowercase letters, digits and underscores');
    if (!def.nodes || typeof def.nodes !== 'object' || !Object.keys(def.nodes).length) { err('nodes must be a non-empty object'); return { errors: E, warnings: W }; }
    if (def.weight != null && (typeof def.weight !== 'number' || def.weight < 0)) err('weight must be a number >= 0');
    if (def.items) {
      if (!ST.util.isObj(def.items)) err('items must be an object of { id: { name, desc } }');
      else Object.keys(def.items).forEach(k => { const it = def.items[k]; if (!it || typeof it.name !== 'string') err('items.' + k + ' needs a name'); });
    }
    const itemIds = new Set(Object.keys(D.items).concat(def.items ? Object.keys(def.items) : []));

    // slots
    const slots = def.slots || {};
    if (def.slots != null && !ST.util.isObj(def.slots)) err('slots must be an object');
    const slotTypes = {};
    const ctx0err = err;
    Object.keys(slots).forEach(name => {
      const s = slots[name];
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) err('slot name "' + name + '" must start with a letter');
      if (V.BUILTINS[name]) err('slot name "' + name + '" is reserved');
      if (!s || !V.SLOT_TYPES.includes(s.type)) { err('slots.' + name + '.type must be one of ' + V.SLOT_TYPES.join(', ')); return; }
      slotTypes[name] = s.type;
      if (s.type === 'faction' && s.oneOf) (Array.isArray(s.oneOf) ? s.oneOf : [s.oneOf]).forEach(f => { if (!D.factions[f]) err('slots.' + name + '.oneOf: unknown faction "' + f + '"'); });
      if (s.type === 'faction' && s.prefer && !['hostile', 'friendly', 'random'].includes(s.prefer)) err('slots.' + name + '.prefer must be hostile, friendly or random');
      if (s.type === 'system') {
        if (s.faction && !(['none', 'federation', 'foreign', 'any'].includes(s.faction) || D.factions[s.faction] || (typeof s.faction === 'string' && s.faction[0] === '{'))) err('slots.' + name + '.faction invalid');
        if (s.has) String(s.has).split('|').forEach(h => {
          h = h.trim();
          if (h.startsWith('planet:')) { h.slice(7).split(',').forEach(c => { if (!D.planets[c.trim()]) err('slots.' + name + '.has: unknown planet class "' + c + '"'); }); }
          else if (!(V.POI_TYPES.includes(h) || V.FEATURES.includes(h))) err('slots.' + name + '.has: unknown feature "' + h + '"');
        });
        ['minJumps', 'maxJumps'].forEach(k => { if (s[k] != null && typeof s[k] !== 'number') err('slots.' + name + '.' + k + ' must be a number'); });
      }
      if (s.type === 'system' && s.homeOf != null) {
        const ref = slots[s.homeOf];
        if (!ref || !['faction', 'species'].includes(ref.type) || Object.keys(slots).indexOf(s.homeOf) > Object.keys(slots).indexOf(name)) ctx0err('slots.' + name + '.homeOf must name a faction or species slot declared before it');
      }
      if (s.type === 'planet' && (!s.system || !slots[s.system] || slots[s.system].type !== 'system')) err('slots.' + name + '.system must name a system slot');
      if (s.type === 'planet' && s.class) (Array.isArray(s.class) ? s.class : [s.class]).forEach(c => { if (!D.planets[c]) err('slots.' + name + '.class: unknown "' + c + '"'); });
      if (s.type === 'officer' && !D.SKILLS.includes(s.skill)) err('slots.' + name + '.skill must be a skill');
      if (s.type === 'number' && (typeof s.min !== 'number' || typeof s.max !== 'number')) err('slots.' + name + ' needs numeric min and max');
      if (s.type === 'text' && (!Array.isArray(s.options) || !s.options.length)) err('slots.' + name + '.options must be a non-empty array');
    });
    if (def.kind === 'event' && ['hail', 'encounter'].includes(def.context)) slotTypes.them = 'faction';

    const ctx = { def, E, W, err, warn, slotTypes, itemIds, nodes: def.nodes };

    // top-level by kind
    if (def.kind === 'mission') {
      reqStr(ctx, def.title, 'title');
      reqStr(ctx, def.briefing, 'briefing');
      if (!V.CATEGORIES.includes(def.category)) err('category must be one of ' + V.CATEGORIES.join(', '));
      if (def.giver && def.giver !== 'starfleet' && !D.factions[def.giver]) err('giver must be "starfleet" or a faction id');
      if (def.deadline != null && !(Array.isArray(def.deadline) && def.deadline.length === 2 && def.deadline.every(n => typeof n === 'number' && n > 0))) err('deadline must be [minDays, maxDays] or null');
      if (def.rewards) checkEffects(ctx, def.rewards, 'rewards');
      if (def.penalties) checkEffects(ctx, def.penalties, 'penalties');
      if (def.onAccept) checkEffects(ctx, def.onAccept, 'onAccept');
      if (def.image) checkImage(ctx, def.image, 'image');
      if (def.twists != null) {
        if (!Array.isArray(def.twists)) err('twists must be an array');
        else def.twists.forEach((t, i) => {
          if (!t || typeof t.id !== 'string') err('twists[' + i + '].id required');
          if (typeof t.chance !== 'number' || t.chance < 0 || t.chance > 1) err('twists[' + i + '].chance must be 0..1');
        });
      }
      if (def.requires) checkCond(ctx, def.requires, 'requires');
      if (!Array.isArray(def.stages) || !def.stages.length) err('stages must be a non-empty array');
      else {
        const ids = new Set();
        def.stages.forEach((st, i) => {
          const p = 'stages[' + i + ']';
          if (!st || typeof st.id !== 'string') { err(p + '.id required'); return; }
          if (ids.has(st.id)) err(p + ': duplicate stage id "' + st.id + '"');
          ids.add(st.id);
          reqStr(ctx, st.objective, p + '.objective');
          if (!st.trigger || !V.TRIGGERS.includes(st.trigger.on)) err(p + '.trigger.on must be one of ' + V.TRIGGERS.join(', '));
          else if (st.trigger.on !== 'immediate') {
            if (!st.trigger.slot || slotTypes[st.trigger.slot] !== 'system') err(p + '.trigger.slot must name a system slot');
          }
          if (!def.nodes[st.node]) err(p + '.node "' + st.node + '" does not exist');
        });
        ctx.stageIds = ids;
      }
      if (def.crisis && def.category !== 'crisis') warn('crisis missions should use category "crisis"');
    } else if (def.kind === 'event') {
      if (!V.CONTEXTS.includes(def.context)) err('context must be one of ' + V.CONTEXTS.join(', '));
      if (!def.nodes[def.start]) err('start node "' + def.start + '" does not exist');
      if (def.requires) checkCond(ctx, def.requires, 'requires');
      if (def.title != null) reqStr(ctx, def.title, 'title');
    }

    // nodes
    Object.keys(def.nodes).forEach(id => checkNode(ctx, id, def.nodes[id]));

    // reachability + terminals
    const starts = def.kind === 'mission' ? (def.stages || []).map(s => s.node) : [def.start];
    const seen = new Set();
    const stack = starts.filter(Boolean).slice();
    while (stack.length) {
      const id = stack.pop();
      if (seen.has(id) || !def.nodes[id]) continue;
      seen.add(id);
      nextIds(def.nodes[id]).forEach(n => stack.push(n));
    }
    Object.keys(def.nodes).forEach(id => { if (!seen.has(id)) warn('node "' + id + '" is never reached'); });
    if (def.kind === 'mission') {
      const hasWin = Object.values(def.nodes).some(n => n.type === 'end' && n.result === 'success');
      if (!hasWin) err('mission needs at least one end node with result "success"');
    }
    // every reachable node must be able to reach a terminal (no dead loops)
    const canEnd = {};
    const terminal = (n) => n && (n.type === 'end' || n.type === 'advance');
    let changed = true;
    Object.keys(def.nodes).forEach(id => { canEnd[id] = terminal(def.nodes[id]); });
    while (changed) {
      changed = false;
      Object.keys(def.nodes).forEach(id => {
        if (canEnd[id]) return;
        if (nextIds(def.nodes[id]).some(n => canEnd[n])) { canEnd[id] = true; changed = true; }
      });
    }
    seen.forEach(id => { if (!canEnd[id]) err('node "' + id + '" can never reach an end or advance node'); });

    return { errors: E, warnings: W };
  };

  function nextIds(n) {
    if (!n) return [];
    const out = [];
    ['next', 'then', 'else', 'win', 'lose', 'flee', 'surrender'].forEach(k => { if (typeof n[k] === 'string') out.push(n[k]); });
    (n.choices || []).forEach(c => { if (!c) return; ['next', 'success', 'failure'].forEach(k => { if (typeof c[k] === 'string') out.push(c[k]); }); });
    (n.branches || []).forEach(b => { if (b && typeof b.next === 'string') out.push(b.next); });
    return out;
  }
  V.nextIds = nextIds;

  function reqStr(ctx, v, p) {
    if (typeof v !== 'string' || !v.trim()) { ctx.err(p + ' must be a non-empty string'); return; }
    checkText(ctx, v, p);
  }
  function optStr(ctx, v, p) { if (v != null) reqStr(ctx, v, p); }
  function checkText(ctx, s, p) {
    const re = /\{([a-zA-Z_][a-zA-Z0-9_]*)(?:\.([a-zA-Z_]+))?\}/g;
    let m;
    while ((m = re.exec(s))) {
      const name = m[1], prop = m[2] || '';
      if (V.BUILTINS[name] && !(name === 'them' && !ctx.slotTypes.them)) {
        const allowed = V.BUILTINS[name];
        if (name === 'officer' || name === 'away') { if (!allowed.includes(prop)) ctx.err(p + ': {' + name + '.' + prop + '} is not valid (use one of ' + allowed.join(', ') + ')'); }
        else if (!allowed.includes(prop)) ctx.err(p + ': {' + m[0].slice(1, -1) + '} unknown property');
        continue;
      }
      const t = ctx.slotTypes[name];
      if (!t) { ctx.err(p + ': placeholder {' + name + '} does not match a slot or built-in'); continue; }
      if (!V.SLOT_PROPS[t].includes(prop)) ctx.err(p + ': {' + name + '.' + prop + '} — ' + t + ' slots support ' + V.SLOT_PROPS[t].map(x => x || '(none)').join(', '));
    }
  }
  function checkImage(ctx, img, p) {
    if (typeof img !== 'string') { ctx.err(p + ' must be a string'); return; }
    if (img === '@location' || img === '@ship') return;
    const m = /^\{([a-zA-Z_][a-zA-Z0-9_]*)(?:\.(portrait|ship))?\}$/.exec(img);
    if (m) {
      const t = m[1] === 'them' ? 'faction' : ctx.slotTypes[m[1]];
      if (!t) ctx.err(p + ': image slot {' + m[1] + '} not found');
      else if (!['faction', 'species', 'system', 'planet'].includes(t)) ctx.err(p + ': image slot must be a faction, species, system or planet slot');
      return;
    }
    if (!(ST.ART && (ST.ART[img] || (ST.ART_ALIAS && ST.ART_ALIAS[img])))) ctx.err(p + ': unknown image key "' + img + '" (see assets/manifest.js)');
  }
  /** Keys of relation maps may be a faction id, a slot name, "them" or "{slot}". */
  function factionKey(f) {
    if (D.factions[f] || f[0] === '{') return f;
    return '{' + f + '}';
  }
  function refNode(ctx, id, p) { if (typeof id !== 'string' || !ctx.nodes[id]) ctx.err(p + ' references missing node "' + id + '"'); }
  function factionRef(ctx, f, p) {
    if (typeof f !== 'string') { ctx.err(p + ' must be a string'); return; }
    const m = /^\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/.exec(f);
    if (m) { const t = m[1] === 'them' ? ctx.slotTypes.them : ctx.slotTypes[m[1]]; if (t !== 'faction' && t !== 'species') ctx.err(p + ': {' + m[1] + '} must be a faction or species slot'); return; }
    if (f === 'them') { if (!ctx.slotTypes.them) ctx.err(p + ': "them" only exists in hail/encounter events'); return; }
    if (!D.factions[f]) ctx.err(p + ': unknown faction "' + f + '"');
  }

  function checkNode(ctx, id, n) {
    const p = 'nodes.' + id;
    if (!n || typeof n !== 'object') { ctx.err(p + ' must be an object'); return; }
    if (!V.NODE_TYPES.includes(n.type)) { ctx.err(p + '.type must be one of ' + V.NODE_TYPES.join(', ')); return; }
    optStr(ctx, n.text, p + '.text');
    optStr(ctx, n.title, p + '.title');
    optStr(ctx, n.speaker, p + '.speaker');
    if (n.image) checkImage(ctx, n.image, p + '.image');
    if (n.effects) checkEffects(ctx, n.effects, p + '.effects');
    switch (n.type) {
      case 'scene':
        if (n.choices != null) {
          if (!Array.isArray(n.choices) || !n.choices.length) ctx.err(p + '.choices must be a non-empty array');
          else n.choices.forEach((c, i) => checkChoice(ctx, c, p + '.choices[' + i + ']'));
        } else if (n.next != null) refNode(ctx, n.next, p + '.next');
        else ctx.err(p + ': scene needs choices or next');
        if (typeof n.text !== 'string') ctx.err(p + ': scene needs text');
        break;
      case 'end':
        if (ctx.def.kind === 'mission' && !['success', 'failure'].includes(n.result)) ctx.err(p + '.result must be "success" or "failure"');
        break;
      case 'advance':
        if (ctx.def.kind !== 'mission') ctx.err(p + ': advance nodes only work in missions');
        if (n.stage != null && ctx.stageIds && !ctx.stageIds.has(n.stage)) ctx.err(p + '.stage "' + n.stage + '" is not a stage id');
        break;
      case 'branch':
        if (!n.if) ctx.err(p + '.if (condition) required'); else checkCond(ctx, n.if, p + '.if');
        refNode(ctx, n.then, p + '.then'); refNode(ctx, n.else, p + '.else');
        break;
      case 'random':
        if (!Array.isArray(n.branches) || !n.branches.length) ctx.err(p + '.branches must be a non-empty array');
        else n.branches.forEach((b, i) => { if (typeof b.weight !== 'number' || b.weight < 0) ctx.err(p + '.branches[' + i + '].weight must be >= 0'); refNode(ctx, b.next, p + '.branches[' + i + '].next'); });
        break;
      case 'combat':
        if (!Array.isArray(n.enemies) || !n.enemies.length) ctx.err(p + '.enemies must be a non-empty array');
        else n.enemies.forEach((e, i) => {
          const q = p + '.enemies[' + i + ']';
          factionRef(ctx, e.faction, q + '.faction');
          if (typeof e.ship !== 'string') ctx.err(q + '.ship required (light, medium, heavy, boss, contact or a ship id)');
          else if (!V.TIERS.includes(e.ship) && !D.ships[e.ship]) ctx.err(q + '.ship: unknown ship "' + e.ship + '"');
          if (e.count != null && (typeof e.count !== 'number' || e.count < 1 || e.count > 4)) ctx.err(q + '.count must be 1..4');
        });
        refNode(ctx, n.win, p + '.win');
        if (n.flee != null) refNode(ctx, n.flee, p + '.flee'); else if (n.canFlee !== false) ctx.err(p + '.flee required unless canFlee is false');
        if (n.surrender != null) refNode(ctx, n.surrender, p + '.surrender');
        break;
      case 'negotiation':
        factionRef(ctx, n.party, p + '.party');
        if (n.rounds != null && (typeof n.rounds !== 'number' || n.rounds < 3 || n.rounds > 10)) ctx.err(p + '.rounds must be 3..10');
        if (n.difficulty != null && !D.DIFFICULTIES[n.difficulty]) ctx.err(p + '.difficulty must be one of ' + Object.keys(D.DIFFICULTIES).join(', '));
        optStr(ctx, n.topic, p + '.topic');
        refNode(ctx, n.win, p + '.win'); refNode(ctx, n.lose, p + '.lose');
        break;
      case 'away_team':
        if (n.size != null && !(Array.isArray(n.size) && n.size.length === 2 && n.size[0] >= 1 && n.size[1] <= 4 && n.size[0] <= n.size[1])) ctx.err(p + '.size must be [min, max] within 1..4');
        if (n.recommend) (Array.isArray(n.recommend) ? n.recommend : []).forEach(s => { if (!D.SKILLS.includes(s)) ctx.err(p + '.recommend: unknown skill "' + s + '"'); });
        refNode(ctx, n.next, p + '.next');
        break;
    }
  }

  function checkChoice(ctx, c, p) {
    if (!c || typeof c !== 'object') { ctx.err(p + ' must be an object'); return; }
    reqStr(ctx, c.label, p + '.label');
    if (c.requires) checkCond(ctx, c.requires, p + '.requires');
    if (c.cost) {
      checkEffects(ctx, c.cost, p + '.cost');
      Object.keys(c.cost).forEach(k => { if (!V.RESOURCES.includes(k)) ctx.err(p + '.cost can only use resources (' + V.RESOURCES.join(', ') + ')'); else if (c.cost[k] <= 0) ctx.err(p + '.cost.' + k + ' must be a positive amount (it is subtracted)'); });
    }
    if (c.effects) checkEffects(ctx, c.effects, p + '.effects');
    if (c.check) {
      if (!D.SKILLS.includes(c.check.skill)) ctx.err(p + '.check.skill must be one of ' + D.SKILLS.join(', '));
      if (!D.DIFFICULTIES[c.check.difficulty]) ctx.err(p + '.check.difficulty must be one of ' + Object.keys(D.DIFFICULTIES).join(', '));
      if (c.check.team != null && !['away', 'bridge'].includes(c.check.team)) ctx.err(p + '.check.team must be "away" or "bridge"');
      refNode(ctx, c.success, p + '.success'); refNode(ctx, c.failure, p + '.failure');
      if (c.next != null) ctx.err(p + ': use success/failure (not next) with a check');
    } else {
      refNode(ctx, c.next, p + '.next');
    }
    if (c.style != null && !['fight', 'neutral', 'diplomacy', 'command', 'tactics', 'engineering', 'science', 'medicine'].includes(c.style)) ctx.err(p + '.style invalid');
  }

  function checkEffects(ctx, fx, p) {
    if (!ST.util.isObj(fx)) { ctx.err(p + ' must be an object'); return; }
    Object.keys(fx).forEach(k => {
      const v = fx[k], q = p + '.' + k;
      if (!V.EFFECT_KEYS.includes(k)) { ctx.err(q + ': unknown effect (allowed: ' + V.EFFECT_KEYS.join(', ') + ')'); return; }
      if (V.NUM_EFFECTS.includes(k)) { if (typeof v !== 'number' || !isFinite(v)) ctx.err(q + ' must be a number'); return; }
      switch (k) {
        case 'relation':
          if (!ST.util.isObj(v)) { ctx.err(q + ' must be { faction: amount }'); break; }
          Object.keys(v).forEach(f => { factionRef(ctx, factionKey(f), q + '.' + f); if (typeof v[f] !== 'number') ctx.err(q + '.' + f + ' must be a number'); });
          break;
        case 'injure':
          if (!ST.util.isObj(v)) { ctx.err(q + ' must be { who, count, severity }'); break; }
          if (!V.INJURE_WHO.includes(v.who)) ctx.err(q + '.who must be one of ' + V.INJURE_WHO.join(', '));
          if (v.count != null && (typeof v.count !== 'number' || v.count < 1)) ctx.err(q + '.count must be >= 1');
          if (v.severity != null && !V.SEVERITIES.includes(v.severity)) ctx.err(q + '.severity must be one of ' + V.SEVERITIES.join(', '));
          break;
        case 'damage':
          if (!ST.util.isObj(v)) { ctx.err(q + ' must be { system, amount }'); break; }
          if (!(V.SYSTEMS.includes(v.system) || v.system === 'random')) ctx.err(q + '.system must be one of ' + V.SYSTEMS.join(', ') + ', random');
          if (typeof v.amount !== 'number' || v.amount <= 0) ctx.err(q + '.amount must be a positive number');
          break;
        case 'items':
          if (!ST.util.isObj(v)) { ctx.err(q + ' must be { add: [], remove: [] }'); break; }
          ['add', 'remove'].forEach(a => { if (v[a] != null) { if (!Array.isArray(v[a])) ctx.err(q + '.' + a + ' must be an array'); else v[a].forEach(it => { if (!ctx.itemIds.has(it)) ctx.err(q + '.' + a + ': unknown item "' + it + '" (define it in the top-level "items" field)'); }); } });
          break;
        case 'setFlags': case 'clearFlags':
          if (!Array.isArray(v) || !v.every(x => typeof x === 'string')) ctx.err(q + ' must be an array of strings');
          break;
        case 'reveal':
          if (!(v === 'nearby' || ctx.slotTypes[v] === 'system')) ctx.err(q + ' must be "nearby" or a system slot name');
          break;
        case 'startMission': case 'log':
          if (typeof v !== 'string') ctx.err(q + ' must be a string'); else if (k === 'log') checkText(ctx, v, q);
          break;
        case 'contact':
          if (!['leave', 'hostile', 'neutral', 'friendly'].includes(v)) ctx.err(q + ' must be leave, hostile, neutral or friendly');
          break;
        case 'openTrade':
          if (typeof v !== 'boolean') ctx.err(q + ' must be true or false');
          break;
        case 'heal':
          if (v !== 'all' && v !== 'away') ctx.err(q + ' must be "all" or "away"');
          break;
      }
    });
  }

  function checkCond(ctx, c, p) {
    if (!ST.util.isObj(c)) { ctx.err(p + ' must be an object'); return; }
    Object.keys(c).forEach(k => {
      const v = c[k], q = p + '.' + k;
      if (!V.CONDITION_KEYS.includes(k)) { ctx.err(q + ': unknown condition (allowed: ' + V.CONDITION_KEYS.join(', ') + ')'); return; }
      switch (k) {
        case 'flag': case 'notFlag':
          if (!(typeof v === 'string' || (Array.isArray(v) && v.every(x => typeof x === 'string')))) ctx.err(q + ' must be a string or array of strings');
          break;
        case 'item': case 'notItem':
          if (!ctx.itemIds.has(v)) ctx.err(q + ': unknown item "' + v + '"');
          break;
        case 'min':
          if (!ST.util.isObj(v)) ctx.err(q + ' must be { resource: amount }');
          else Object.keys(v).forEach(r => { if (!V.RESOURCES.includes(r)) ctx.err(q + '.' + r + ': not a resource'); });
          break;
        case 'relationAtLeast': case 'relationBelow':
          if (!ST.util.isObj(v)) ctx.err(q + ' must be { faction: value }');
          else Object.keys(v).forEach(f => factionRef(ctx, factionKey(f), q + '.' + f));
          break;
        case 'twist': case 'notTwist':
          if (typeof v !== 'string') ctx.err(q + ' must be a twist id');
          else if (ctx.def.kind === 'mission' && !(ctx.def.twists || []).some(t => t.id === v)) ctx.err(q + ': twist "' + v + '" is not declared in twists');
          break;
        case 'trait':
          if (!D.TRAITS[v]) ctx.err(q + ': unknown trait "' + v + '" (' + Object.keys(D.TRAITS).join(', ') + ')');
          break;
        case 'skillAtLeast':
          if (!ST.util.isObj(v)) ctx.err(q + ' must be { skill: value }');
          else Object.keys(v).forEach(s => { if (!D.SKILLS.includes(s)) ctx.err(q + '.' + s + ': not a skill'); });
          break;
        case 'locationFaction':
          (Array.isArray(v) ? v : [v]).forEach(f => { if (!V.LOCATION_FACTIONS.includes(f)) ctx.err(q + ': "' + f + '" invalid'); });
          break;
        case 'locationHas':
          (Array.isArray(v) ? v : [v]).forEach(f => { if (!(V.POI_TYPES.includes(f) || V.FEATURES.includes(f))) ctx.err(q + ': "' + f + '" invalid'); });
          break;
        case 'factionIs':
          if (!ST.util.isObj(v) || !Array.isArray(v.oneOf)) { ctx.err(q + ' must be { slot, oneOf: [...] }'); break; }
          if (!(v.slot === 'them' ? ctx.slotTypes.them : ctx.slotTypes[v.slot])) ctx.err(q + '.slot "' + v.slot + '" not found');
          v.oneOf.forEach(f => { if (!D.factions[f] && f !== 'species') ctx.err(q + '.oneOf: unknown faction "' + f + '"'); });
          break;
        case 'planet':
          if (!ST.util.isObj(v)) { ctx.err(q + ' must be an object'); break; }
          if (ctx.def.context !== 'away') ctx.warn(q + ': planet conditions only apply in "away" events');
          Object.keys(v).forEach(pk => {
            if (!['class', 'life', 'ruins', 'dilithium', 'colony'].includes(pk)) ctx.err(q + '.' + pk + ' unknown (class, life, ruins, dilithium, colony)');
          });
          if (v.class) (Array.isArray(v.class) ? v.class : [v.class]).forEach(cl => { if (!D.planets[cl]) ctx.err(q + '.class: unknown "' + cl + '"'); });
          if (v.life) (Array.isArray(v.life) ? v.life : [v.life]).forEach(l => { if (!D.LIFE_LABELS[l]) ctx.err(q + '.life: unknown "' + l + '"'); });
          break;
        case 'day':
          if (!ST.util.isObj(v)) ctx.err(q + ' must be { min, max }');
          break;
        case 'chance':
          if (typeof v !== 'number' || v < 0 || v > 1) ctx.err(q + ' must be 0..1');
          break;
        case 'any':
          if (!Array.isArray(v)) ctx.err(q + ' must be an array of conditions'); else v.forEach((cc, i) => checkCond(ctx, cc, q + '[' + i + ']'));
          break;
        case 'not':
          checkCond(ctx, v, q);
          break;
        case 'renownAtLeast':
          if (typeof v !== 'number') ctx.err(q + ' must be a number');
          break;
        case 'missionActive':
          if (typeof v !== 'string') ctx.err(q + ' must be a mission id');
          break;
        case 'shipClass':
          (Array.isArray(v) ? v : [v]).forEach(s => { if (!D.playerClasses[s]) ctx.err(q + ': unknown ship class "' + s + '"'); });
          break;
        case 'poi':
          if (!ST.util.isObj(v)) { ctx.err(q + ' must be { type, kind }'); break; }
          if (!['anomaly', 'derelict'].includes(ctx.def.context)) ctx.warn(q + ': poi conditions only apply in "anomaly" and "derelict" events');
          if (v.type) (Array.isArray(v.type) ? v.type : [v.type]).forEach(t => { if (!V.POI_TYPES.includes(t)) ctx.err(q + '.type: unknown "' + t + '"'); });
          if (v.kind) (Array.isArray(v.kind) ? v.kind : [v.kind]).forEach(k => { if (!D.ANOMALY_KINDS.some(a => a.id === k)) ctx.err(q + '.kind: unknown "' + k + '" (' + D.ANOMALY_KINDS.map(a => a.id).join(', ') + ')'); });
          break;
      }
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
