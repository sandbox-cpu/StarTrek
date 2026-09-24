/* LCARS shell: station switching, header/readouts, overlays, toasts,
   delegated actions and keyboard. Stations register via ST.ui.station(). */
(function () {
  'use strict';
  const ST = window.ST, D = ST.DATA, U = ST.util;
  const UI = ST.ui = { cur: 'bridge', locked: false, stations: {}, order: [] };
  const A = ST.actions = {};
  const $ = (id) => document.getElementById(id);

  UI.station = function (id, def) { UI.stations[id] = def; if (!UI.order.includes(id)) UI.order.push(id); };

  // ---------------------------------------------------------------- boot
  UI.boot = function () {
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    setInterval(tickDataGrid, 1400);
    window.addEventListener('resize', () => {
      if (!ST.S || ST.S.over || $('console').hidden) return;
      clearTimeout(UI._rs); UI._rs = setTimeout(() => { if (!(ST.combat && ST.combat.active)) UI.renderMain(); else { const c = $('tacCanvas'); if (c) c._fit = false; } }, 150);
    });
  };

  function buildSide() {
    const nav = $('sideNav');
    const colors = { bridge: 'var(--orange)', nav: 'var(--peach)', science: 'var(--blue)', tactical: 'var(--red)', engineering: 'var(--tan)', ops: 'var(--lilac)', comms: 'var(--sky)', log: 'var(--violet)' };
    nav.innerHTML = '<div class="side-cap"></div>' + UI.order.map((id, i) =>
      '<button class="nav-btn" id="nav_' + id + '" style="--c:' + (colors[id] || 'var(--peach)') + '" data-act="go" data-arg="' + id + '"><span class="num">' + String(i + 1).padStart(2, '0') + '-' + (100 + i * 37) + '</span><span class="badge" id="badge_' + id + '" hidden></span>' + UI.stations[id].label + '</button>'
    ).join('') + '<div class="side-fill"></div><div class="side-cap-bot"></div>';
  }

  UI.showConsole = function () {
    $('screen').hidden = true; $('screen').innerHTML = '';
    $('console').hidden = false;
    buildSide();
    UI.cur = 'bridge';
    UI.render();
  };

  // ---------------------------------------------------------------- navigation
  UI.go = function (id, force) {
    if (!UI.stations[id]) return;
    if (UI.locked && !force) { ST.audio.play('deny'); return; }
    UI.cur = id;
    UI.render();
    const m = $('main'); if (m) m.scrollTop = 0;
  };
  UI.setNavLocked = function (on) {
    UI.locked = !!on;
    document.querySelectorAll('.nav-btn').forEach(b => { b.disabled = UI.locked && !(ST.combat && ST.combat.active && b.id === 'nav_tactical'); });
  };
  UI.busy = function () { return !!(ST.story.active || (ST.combat && ST.combat.active) || (ST.diplomacy && (ST.diplomacy.active || ST.diplomacy.tradeOpen)) || (ST.travel && ST.travel.active)); };

  // ---------------------------------------------------------------- render
  UI.render = function () {
    if (!ST.S || $('console').hidden) return;
    UI.renderChrome();
    UI.renderMain();
  };
  UI.renderMain = function () {
    const st = UI.stations[UI.cur];
    if (ST.combat && ST.combat.active && UI.cur === 'tactical' && document.getElementById('combatRoot')) { ST.combat.updateUI(); return; }
    const main = $('main');
    try {
      main.innerHTML = st.render();
      if (st.mount) st.mount(main);
      ST.art.paintAll(main);
    } catch (e) {
      console.error(e);
      main.innerHTML = '<div class="prose"><p class="bad">Station display error: ' + U.esc(e.message) + '</p></div>';
    }
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.id === 'nav_' + UI.cur));
  };

  UI.renderChrome = function () {
    const S = ST.S; if (!S) return;
    const st = ST.shipStats();
    $('hdrShip').textContent = 'U.S.S. ' + S.ship.name;
    $('hdrStardate').textContent = 'STARDATE ' + ST.stardate();
    const alert = $('app').getAttribute('data-alert');
    $('hdrAlert').textContent = alert === 'red' ? 'RED ALERT' : alert === 'yellow' ? 'YELLOW ALERT' : 'CONDITION GREEN';
    $('lcarsCode').textContent = 'LCARS ' + S.ship.registry.replace(/[^0-9]/g, '').slice(-4) + '-' + String(Math.floor(S.day)).padStart(3, '0');
    const here = ST.galaxy.here();
    $('lcarsLoc').textContent = (here ? here.name.toUpperCase() : 'SECTOR');
    const ro = [
      ['Hull', Math.round(S.ship.hull), st.hullMax, '#ffcc99'],
      ['Shields', Math.round(S.ship.shields), st.shieldMax, '#9999ff'],
      ['Dilithium', Math.round(S.res.dilithium * 10) / 10, st.dilCap, '#cc99cc'],
      ['Torpedoes', S.res.torpedoes, st.torpCap, '#cc6666'],
      ['Spares', S.res.spares, null, '#ffcc66'],
      ['Latinum', S.res.latinum, null, '#ff9c00'],
      ['Crew', S.res.crew, st.crewMax, '#99cc99'],
      ['Morale', Math.round(S.res.morale), 100, '#99ccff'],
      ['Renown', S.res.renown, null, '#a57fd8']
    ];
    const gd = D.GAME_DIFFICULTY[S.difficulty];
    $('readouts').innerHTML = ro.map(r => {
      const pct = r[2] ? r[1] / r[2] : null;
      const cls = pct != null && ['Hull', 'Dilithium', 'Crew', 'Morale'].includes(r[0]) ? (pct < 0.2 ? ' crit' : pct < 0.4 ? ' warn' : '') : '';
      return '<div class="ro' + cls + '" style="--c:' + r[3] + '"><span class="l">' + r[0] + '</span><span class="v">' + r[1] + (r[0] === 'Renown' ? '<span style="font-size:13px;color:var(--dim)"> /' + gd.crisisRenown + '</span>' : '') + '</span>' + (pct != null ? '<span class="bar"><i style="width:' + U.clamp(pct * 100, 0, 100) + '%"></i></span>' : '') + '</div>';
    }).join('');
    // badges
    const setBadge = (id, n) => { const b = $('badge_' + id); if (!b) return; b.hidden = !n; b.textContent = n; };
    setBadge('log', S.missions.active.length);
    setBadge('comms', S.contacts.length);
    setBadge('ops', ST.crew.all().filter(o => o.status !== 'ok').length || 0);
    $('btnSound').textContent = ST.audio.enabled ? 'AUDIO ON' : 'AUDIO OFF';
  };

  UI.setAlert = function (level) {
    const app = $('app');
    const prev = app.getAttribute('data-alert');
    app.setAttribute('data-alert', level || 'none');
    if (level === 'yellow' && prev !== 'yellow') ST.audio.play('yellow');
    UI.renderChrome();
  };
  /** Yellow alert when hostiles are present and we are not in combat. */
  UI.autoAlert = function () {
    if (ST.combat && ST.combat.active) return;
    const hostile = ST.S.contacts.some(c => c.attitude === 'hostile');
    UI.setAlert(hostile ? 'yellow' : 'none');
  };

  // ---------------------------------------------------------------- overlay & toasts
  UI.showOverlay = function (html) {
    const o = $('overlay');
    o.innerHTML = html; o.hidden = false;
    ST.art.paintAll(o);
    const b = o.querySelector('.dlg-body'); if (b) b.scrollTop = 0;
    const first = o.querySelector('button:not([disabled])'); if (first) try { first.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  };
  UI.hideOverlay = function () { const o = $('overlay'); o.hidden = true; o.innerHTML = ''; };
  UI.toast = function (text, color) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = text;
    if (color) t.style.setProperty('--c', color);
    $('toasts').appendChild(t);
    setTimeout(() => t.remove(), 4000);
    while ($('toasts').children.length > 5) $('toasts').firstChild.remove();
  };
  UI.openTrade = function (fid) { ST.diplomacy.trade(fid); };

  // ---------------------------------------------------------------- end screen
  ST.checkGameOver = function () {
    const S = ST.S;
    if (!S) return false;
    if (S.over) return true;
    if (S.ship.hull <= 0) S.over = { win: false, reason: 'destroyed' };
    else if (S.res.crew <= 0) S.over = { win: false, reason: 'crew' };
    return !!S.over;
  };
  UI.endScreen = function () {
    const S = ST.S;
    ST.clearSave();
    if (ST.combat) ST.combat.active = null;
    ST.story.active = null; ST.story._queue = [];
    if (ST.travel) ST.travel.active = null;
    UI.hideOverlay();
    UI.setAlert(S.over && S.over.win ? 'none' : 'red');
    const win = S.over && S.over.win;
    const reason = {
      destroyed: 'The ' + 'U.S.S. ' + S.ship.name + ' was destroyed with all hands.',
      crew: 'With too few crew left to operate her, the ' + S.ship.name + ' is towed home, her mission ended.',
      crisis: win ? 'You resolved the crisis: ' + (S.over.title || '') + '. The sector is safe, for now.' : 'The crisis overwhelmed the sector: ' + (S.over.title || '') + '.'
    }[S.over ? S.over.reason : 'destroyed'];
    const st = S.stats;
    const score = Math.round(S.res.renown * 10 + st.missionsWon * 50 + st.visited * 5 + st.contacts * 40 + (win ? 500 : 0) - st.officersLost * 30);
    const rows = [['Stardate', ST.stardate()], ['Days in command', Math.floor(S.day)], ['Renown', S.res.renown], ['Missions completed', st.missionsWon], ['Missions failed', st.missionsFailed], ['Systems visited', st.visited], ['First contacts', st.contacts], ['Engagements won', st.battles], ['Ships destroyed', st.destroyed], ['Crew lost', st.crewLost], ['Officers lost', st.officersLost], ['Galaxy seed', S.seed]];
    $('console').hidden = true;
    const sc = $('screen'); sc.hidden = false;
    sc.innerHTML = '<div class="title-wrap"><div class="title-frame">' +
      '<div class="tf-el1" style="background:' + (win ? 'var(--orange)' : 'var(--red)') + '"></div>' +
      '<div class="tf-top"><div class="brand"><h1 style="color:' + (win ? 'var(--orange)' : '#ff6a5a') + '">' + (win ? 'Mission accomplished' : 'End of the mission') + '</h1><div class="by">FINAL LOG · U.S.S. ' + U.esc(S.ship.name.toUpperCase()) + '</div></div><div class="c-bar"><span class="seg s-elbow" style="background:' + (win ? 'var(--orange)' : 'var(--red)') + '"></span><span class="seg s3"></span><span class="seg s4"></span></div></div>' +
      '<div class="tf-side"><span class="grow" style="--c:var(--peach)"></span><span style="--c:var(--blue)">' + score + '</span></div>' +
      '<div class="tf-main"><div class="endcard"><div class="prose"><p>' + U.esc(reason) + '</p><p>Captain ' + U.esc(S.captain.name) + ', ' + (win ? 'Starfleet Command extends its highest commendation.' : 'Starfleet will remember your crew.') + '</p></div>' +
      '<div class="sub-h">Service record · score ' + score + '</div><dl class="kv">' + rows.map(r => '<dt>' + r[0] + '</dt><dd class="num">' + U.esc(String(r[1])) + '</dd>').join('') + '</dl>' +
      '<div class="menu" style="margin-top:22px"><button class="lc-btn lg c-orange" data-act="titleNew">New commission</button><button class="lc-btn lg c-lilac" data-act="titleReplay" data-arg="' + S.seed + '">Replay this galaxy</button></div></div></div>' +
      '<div class="tf-el2"></div><div class="tf-bot"><div class="c-bar bot"><span class="seg s-elbow" style="background:var(--lilac)"></span><span class="seg s2"></span></div></div>' +
      '</div></div>';
  };

  // ---------------------------------------------------------------- decorative data grid
  function tickDataGrid() {
    const g = $('dataGrid');
    if (!g || $('console').hidden) return;
    const cols = [];
    for (let c = 0; c < 9; c++) {
      const cells = [];
      for (let r = 0; r < 4; r++) { const len = [2, 3, 4, 4, 5][Math.floor(Math.random() * 5)]; cells.push('<span>' + String(Math.floor(Math.random() * Math.pow(10, len))).padStart(len, '0') + '</span>'); }
      cols.push('<div class="col">' + cells.join('') + '</div>');
    }
    g.innerHTML = cols.join('');
  }
  UI.tickDataGrid = tickDataGrid;

  // ---------------------------------------------------------------- events
  function onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const act = el.getAttribute('data-act'), arg = el.getAttribute('data-arg');
    const fn = A[act];
    if (!fn) { console.warn('No action', act); return; }
    e.preventDefault();
    try { fn(arg, el, e); } catch (err) { console.error(err); UI.toast('Error: ' + err.message, '#cc6666'); }
  }
  function onKey(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'Space' && ST.combat && ST.combat.active && !ST.combat.active.menu && $('overlay').hidden) { e.preventDefault(); ST.combat.togglePause(); return; }
    if (!ST.S || $('console').hidden || UI.locked) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= UI.order.length && $('overlay').hidden) { A.go(UI.order[n - 1]); }
  }

  // ---------------------------------------------------------------- shared actions
  A.go = (id) => { if (UI.locked) { ST.audio.play('deny'); return; } ST.audio.play('click'); UI.go(id); };
  A.toggleSound = () => { ST.audio.setEnabled(!ST.audio.enabled); ST.audio.play('click'); UI.renderChrome(); };
  A.menu = () => {
    if (UI.busy()) { ST.audio.play('deny'); return; }
    ST.audio.play('click');
    const S = ST.S;
    UI.showOverlay('<div class="dlg" style="--c:var(--orange)"><div class="dlg-rail"></div><div class="dlg-body"><div class="dlg-top"><div class="t">Main menu</div><div class="k">GALAXY SEED ' + S.seed + '</div></div>' +
      '<div style="padding-right:16px"><div class="prose"><p>Your progress saves automatically after every action.</p></div><div class="choices">' +
      '<button class="choice k-neutral" data-act="menuClose"><span>Return to the bridge</span></button>' +
      '<button class="choice k-science" data-act="menuHelp"><span>How to play</span></button>' +
      '<button class="choice k-command" data-act="menuTitle"><span>Save and exit to the title screen</span></button>' +
      '<button class="choice k-tactics" data-act="menuAbandon"><span>Abandon this command (deletes the save)</span></button>' +
      '</div></div></div></div>');
  };
  A.menuClose = () => { ST.audio.play('click'); UI.hideOverlay(); };
  A.menuHelp = () => { ST.audio.play('click'); UI.showOverlay('<div class="dlg" style="--c:var(--blue)"><div class="dlg-rail"></div><div class="dlg-body"><div class="dlg-top"><div class="t">How to play</div><div class="k">LCARS TRAINING MODULE</div></div><div style="padding-right:16px">' + ST.main.howtoHtml() + '<div class="choices"><button class="choice k-neutral" data-act="menuClose"><span>Close</span></button></div></div></div></div>'); };
  A.menuTitle = () => { ST.save(); UI.hideOverlay(); ST.main.title(); };
  A.menuAbandon = () => {
    UI.showOverlay('<div class="dlg" style="--c:var(--red)"><div class="dlg-rail"></div><div class="dlg-body"><div class="dlg-top"><div class="t">Abandon command?</div><div class="k">CONFIRM</div></div><div style="padding-right:16px"><div class="prose"><p>This deletes your saved game. It cannot be undone.</p></div><div class="choices"><button class="choice k-tactics" data-act="menuAbandonYes"><span>Yes, delete the save</span></button><button class="choice k-neutral" data-act="menuClose"><span>Keep playing</span></button></div></div></div></div>');
  };
  A.menuAbandonYes = () => { ST.clearSave(); ST.S = null; UI.hideOverlay(); ST.main.title(); };

  // story
  A.storyChoice = (i) => ST.story.choose(+i);
  A.storyNext = () => { ST.audio.play('click'); ST.story.next(); };
  A.storyEnd = () => { ST.audio.play('click'); ST.story.end(); };
  A.storyAdvance = () => { ST.audio.play('click'); ST.story.advance(); };
  A.storyAbort = () => { ST.audio.play('click'); ST.story.abort(); };
  A.teamToggle = (id) => ST.story.teamToggle(id);
  A.teamGo = () => ST.story.teamGo();
  // diplomacy
  A.negoPlay = (i) => ST.diplomacy.play(+i);
  A.negoWalk = () => ST.diplomacy.walk();
  A.negoClose = () => { ST.audio.play('click'); ST.diplomacy.close(); };
  A.tradeBuy = (a) => ST.diplomacy.buy(a);
  A.tradeSell = (a) => ST.diplomacy.sell(a);
  A.tradeClose = () => { ST.audio.play('click'); ST.diplomacy.closeTrade(); ST.story.pump(); };
  // combat
  A.cbPower = (a) => ST.combat.powerFromArg(a);
  A.cbRepair = (s) => ST.combat.toggleRepair(s);
  A.cbAbility = (k) => ST.combat.ability(k);
  A.cbFire = (w) => { if (w === 'phasers') ST.combat.firePhasers(); else ST.combat.fireTorpedo(); };
  A.cbAuto = (w) => ST.combat.toggleAuto(w);
  A.cbTarget = (i) => ST.combat.setTarget(+i);
  A.cbSub = (s) => ST.combat.setSub(s);
  A.cbPause = () => ST.combat.togglePause();
  A.cbHail = () => ST.combat.hail();
  A.cbHailDo = (w) => ST.combat.hailDo(w);
  A.cbRetreat = () => ST.combat.retreat();
  A.cbClose = () => { ST.audio.play('click'); ST.combat.close(); };
})();
