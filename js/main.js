/* Boot, title screen, new-game setup, help text and the opening briefing. */
(function () {
  'use strict';
  const ST = window.ST, D = ST.DATA, U = ST.util;
  const A = ST.actions, UI = ST.ui;
  const M = ST.main = {};
  const $ = (id) => document.getElementById(id);
  const setup = { shipClass: 'intrepid', difficulty: 'commander' };

  function frame(inner, opts) {
    opts = opts || {};
    return '<div class="title-wrap"><div class="title-frame">' +
      '<div class="tf-el1"></div>' +
      '<div class="tf-top"><div class="brand"><h1>Frontier Command</h1><div class="by">LCARS starship operations<br>' + (opts.sub || 'Access 47-' + (1000 + Math.floor(Math.random() * 8999))) + '</div></div>' +
      '<div class="c-bar"><span class="seg s-elbow" style="background:var(--orange)"></span><span class="seg s2" style="background:var(--peach)"></span><span class="seg s3" style="background:var(--blue)"></span><span class="seg s4" style="background:var(--lilac)"></span></div></div>' +
      '<div class="tf-side"><span style="--c:var(--peach)">01-4721</span><span style="--c:var(--lilac)">02-1701</span><span style="--c:var(--blue)" class="grow">03-2364</span><span style="--c:var(--tan)">04-0047</span></div>' +
      '<div class="tf-main">' + inner + '</div>' +
      '<div class="tf-el2"></div>' +
      '<div class="tf-bot"><div class="c-bar bot"><span class="seg s-elbow" style="background:var(--lilac)"></span><span class="seg s2" style="background:var(--tan)"></span><span class="seg s3" style="background:var(--red)"></span></div>' +
      '<div class="foot">Unofficial fan-made game. Star Trek and LCARS are trademarks of CBS Studios and Paramount. This project is not affiliated with or endorsed by them.</div></div>' +
      '</div></div>';
  }
  function showScreen(html) {
    $('console').hidden = true;
    const sc = $('screen'); sc.hidden = false; sc.innerHTML = html; sc.scrollTop = 0;
    ST.art.paintAll(sc);
    $('app').setAttribute('data-alert', 'none');
  }

  M.title = function () {
    const hasSave = ST.hasSave();
    const hero = '<div class="hero">' + '<canvas data-proc="ship_player" data-seed="7"></canvas>' +
      (ST.art.resolve('ship_player').url ? '<img src="' + ST.art.resolve('ship_player').url + '" alt="" onerror="this.remove()">' : '') +
      '<div class="over"><p>The frontier is uncharted, the powers along it are restless, and Starfleet has given you one ship to hold it together. Explore, make first contact, keep the peace when you can and fight when you must.</p></div></div>';
    showScreen(frame(hero +
      '<div class="menu">' +
      (hasSave ? '<button class="lc-btn lg c-orange" data-act="titleContinue">Continue command</button>' : '') +
      '<button class="lc-btn lg ' + (hasSave ? 'c-peach' : 'c-orange') + '" data-act="titleNew">New commission</button>' +
      '<button class="lc-btn lg c-blue" data-act="titleHelp">How to play</button>' +
      '<button class="lc-btn lg c-lilac" data-act="toggleSoundTitle" id="titleSound">' + (ST.audio.enabled ? 'Audio on' : 'Audio off') + '</button>' +
      '</div>'));
  };

  M.newGameForm = function (seed) {
    const opts = (obj, key) => Object.keys(obj).map(k => {
      const o = obj[k];
      const col = key === 'shipClass' ? o.color : ({ ensign: '#99cc99', commander: '#ff9c00', admiral: '#cc6666' }[k]);
      const body = key === 'shipClass' ? '<b>' + o.name + '</b><span class="muted">' + o.role + '</span><br>' + U.esc(o.desc) + '<br><span class="muted" style="font-size:14px">Hull ' + o.hull + ' · Shields ' + o.shields + ' · Reactor ' + o.reactor + ' · Crew ' + o.crew + '</span>' : '<b>' + o.label + '</b>' + U.esc(o.desc);
      return '<button class="opt' + (setup[key] === k ? ' on' : '') + '" style="--c:' + col + '" data-act="setupPick" data-arg="' + key + ':' + k + '">' + body + '</button>';
    }).join('');
    const R = new ST.RNG(Date.now());
    showScreen(frame(
      '<div class="hdr" style="--c:var(--orange)"><span class="cap"></span><span class="t">New commission</span><span class="fill"></span><span class="end"></span></div>' +
      '<div class="form"><div class="field"><label for="fCaptain">Captain</label><input id="fCaptain" maxlength="28" value="' + U.esc(R.pick(D.CAPTAIN_NAMES)) + '"></div>' +
      '<div class="field"><label for="fShip">Ship name · U.S.S.</label><input id="fShip" maxlength="22" value="' + U.esc(R.pick(D.SHIP_NAMES)) + '"></div></div>' +
      '<div class="sub-h">Starship class</div><div class="opts">' + opts(D.playerClasses, 'shipClass') + '</div>' +
      '<div class="sub-h">Difficulty</div><div class="opts">' + opts(D.GAME_DIFFICULTY, 'difficulty') + '</div>' +
      '<div class="form" style="margin-top:14px"><div class="field"><label for="fSeed">Galaxy seed (leave blank for a random sector)</label><input id="fSeed" inputmode="numeric" maxlength="10" value="' + (seed ? U.esc(String(seed)) : '') + '"></div></div>' +
      '<div class="menu" style="margin-top:18px"><button class="lc-btn lg c-orange" data-act="setupGo">Engage</button><button class="lc-btn lg c-peach ghost" data-act="setupBack">Back</button></div>',
      { sub: 'Personnel file · command assignment' }));
  };

  M.howtoHtml = function () {
    const sec = [
      ['The console', 'Stations run down the left: Bridge, Navigation, Science, Tactical, Engineering, Operations, Comms and the Mission log. Press 1 to 8 to switch. Readouts along the bottom show hull, shields, dilithium, torpedoes, spares, latinum, crew, morale and renown.'],
      ['Travel', 'Open Navigation, pick a charted system and press Engage. Higher warp is faster but burns more dilithium. Anything can happen between systems. Visiting a system charts its neighbours.'],
      ['Explore', 'In Science, run a full system scan, then scan planets for dilithium, ruins and life. Enter orbit to mine or to send an away team. Anomalies, derelicts and nebulae can be investigated too.'],
      ['Skill checks', 'Every risky choice shows its odds and which officer will make the attempt. Away-team checks use only the officers you sent. Injured officers are weaker; critically injured ones sit out until they heal. Officers gain experience and improve.'],
      ['Diplomacy', 'Hail ships and inhabited worlds from Comms. Formal talks are a negotiation: each round the envoy raises a concern, and you answer with an approach. Match what they value to build agreement. Offend them and tension rises. A counsellor who is an empath reveals their values.'],
      ['Combat', 'Battles run in real time. Space pauses. Split reactor power between phasers, torpedoes, shields, engines and sensors. Click an enemy to target it and choose a subsystem. Officer abilities have cooldowns. Hail to demand surrender or a ceasefire. Retreat by spooling the warp drive.'],
      ['Missions', 'Starfleet posts new orders in Comms every few days. You can hold three at once. Many have deadlines and twists. Completing them earns renown, and enough renown brings the sector crisis. Resolve it and you win.'],
      ['Supplies', 'Federation starbases repair, refuel, rearm and heal you for free. Trading posts sell supplies and refits for latinum. Spare parts patch hull and systems anywhere. If you run dry, you can call for a tow.']
    ];
    return '<div class="howto">' + sec.map(s => '<h3>' + s[0] + '</h3><p>' + s[1] + '</p>').join('') + '</div>';
  };

  // ---------------------------------------------------------------- start
  M.start = function (opts) {
    ST.newGame(opts);
    ST.missions.refreshBoard(true);
    UI.showConsole();
    UI.tickDataGrid();
    ST.save();
    briefing();
  };
  function briefing() {
    const S = ST.S;
    const f = S.galaxy.majors.map(id => D.factions[id].name);
    const home = ST.galaxy.sys(S.galaxy.home);
    const species = Object.keys(S.species).length;
    const def = {
      kind: 'event', id: '_briefing', context: 'hail', title: 'Orders from Starfleet Command', start: 'a',
      nodes: {
        a: {
          type: 'scene', image: 'portrait_admiral', speaker: 'Vice Admiral Nakamura · Starfleet Command',
          text: '"Welcome to the ' + S.sector + ', {captain}. The {ship} is the only Starfleet vessel assigned to this frontier, so the job is yours alone.\n\nOur starbase at ' + home.name + ' is your home port. Beyond it you will find the ' + (f.length > 1 ? f.slice(0, -1).join(', ') + ' and the ' + f[f.length - 1] : f[0]) + '. Treat them carefully. Orion raiders prey on the unclaimed systems, and long-range sensors suggest ' + (species > 1 ? species + ' civilisations' : 'a civilisation') + ' we have never met.\n\nI will send orders as they come in. Build a reputation out here. Something is stirring in this sector, and when it arrives I want a captain on the scene that people trust."',
          choices: [{ label: '"Understood, Admiral. We won\'t let you down."', next: 'b' }, { label: '"Any advice for a new frontier captain?"', next: 'c' }]
        },
        c: {
          type: 'scene', image: 'portrait_admiral', speaker: 'Vice Admiral Nakamura',
          text: '"Keep your dilithium topped up. Scan before you beam down. Listen to your counsellor, and never fire first unless you mean it. Starbases will patch you up for free. Everyone else will want latinum."',
          next: 'b'
        },
        b: { type: 'end', text: 'The channel closes. Your first orders are waiting in Comms.' }
      }
    };
    ST.story.start(def, { node: 'a', onEnd: () => { UI.go('comms'); UI.toast('Choose your first orders', '#cc99cc'); } });
  }

  // ---------------------------------------------------------------- actions
  A.titleNew = () => { ST.audio.play('click'); M.newGameForm(); };
  A.titleReplay = (seed) => { ST.audio.play('click'); M.newGameForm(seed); };
  A.titleHelp = () => { ST.audio.play('click'); showScreen(frame('<div class="hdr" style="--c:var(--blue)"><span class="cap"></span><span class="t">How to play</span><span class="fill"></span><span class="end"></span></div>' + M.howtoHtml() + '<div class="menu"><button class="lc-btn lg c-peach" data-act="setupBack">Back</button></div>')); };
  A.titleContinue = () => {
    const S = ST.load();
    if (!S) { UI.toast('Saved game could not be loaded', '#cc6666'); M.title(); return; }
    ST.audio.play('select');
    UI.showConsole();
    UI.tickDataGrid();
    UI.autoAlert();
    UI.toast('Welcome back, Captain', '#ff9c00');
  };
  A.toggleSoundTitle = () => { ST.audio.setEnabled(!ST.audio.enabled); ST.audio.play('click'); const b = $('titleSound'); if (b) b.textContent = ST.audio.enabled ? 'Audio on' : 'Audio off'; };
  A.setupPick = (arg) => {
    const [k, v] = arg.split(':'); setup[k] = v;
    ST.audio.play('select');
    document.querySelectorAll('.opt[data-arg^="' + k + ':"]').forEach(b => b.classList.toggle('on', b.getAttribute('data-arg') === arg));
  };
  A.setupBack = () => { ST.audio.play('click'); M.title(); };
  A.setupGo = () => {
    const seedRaw = ($('fSeed').value || '').replace(/[^0-9]/g, '');
    ST.audio.play('warp');
    M.start({
      captainName: $('fCaptain').value || '', shipName: $('fShip').value || '',
      shipClass: setup.shipClass, difficulty: setup.difficulty, seed: seedRaw ? (+seedRaw >>> 0) : 0
    });
  };

  // ---------------------------------------------------------------- boot
  function boot() {
    const res = ST.content.finalize();
    if (res.errors.length) console.warn('[content] ' + res.errors.length + ' error(s):\n' + res.errors.join('\n'));
    if (res.warnings.length) console.info('[content] ' + res.warnings.length + ' warning(s):\n' + res.warnings.join('\n'));
    UI.boot();
    M.title();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
