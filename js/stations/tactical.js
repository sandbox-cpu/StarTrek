/* Tactical: combat console when at red alert, otherwise weapons status,
   power presets and contacts you can engage. */
(function () {
  'use strict';
  const ST = window.ST, D = ST.DATA, U = ST.util, G = ST.galaxy;
  const A = ST.actions, UI = ST.ui;
  const SYS = ['phasers', 'torpedoes', 'shields', 'engines', 'sensors'];
  const SYS_COLOR = { phasers: '#ff9c00', torpedoes: '#cc6666', shields: '#9999ff', engines: '#ffcc66', sensors: '#99ccff' };

  UI.powerRows = function () {
    const S = ST.S, st = ST.shipStats();
    return SYS.map(s => {
      const hard = s === 'sensors' ? st.sensorsMax : 4, cap = ST.combat.capFor(s), p = S.ship.power[s];
      let pips = '';
      for (let i = 1; i <= hard; i++) pips += '<button class="' + (i <= p ? (i <= cap ? 'on' : 'cap') : (i > cap ? 'cap' : '')) + '" data-act="pwrSet" data-arg="' + s + ':' + i + '" aria-label="' + s + ' power ' + i + '"></button>';
      const h = S.ship.systems[s];
      return '<div class="sysrow" style="--c:' + SYS_COLOR[s] + '"><span class="nm">' + s + '</span><div class="pw">' + pips + '</div><span class="num muted" style="font-size:13px">' + Math.round(h) + '%</span><div class="hp"><i class="' + (h < 25 ? 'c' : h < 60 ? 'w' : '') + '" style="width:' + h + '%"></i></div></div>';
    }).join('');
  };

  UI.station('tactical', {
    label: 'Tactical',
    render() {
      if (ST.combat.active) return ST.combat.html();
      const S = ST.S, st = ST.shipStats();
      const used = SYS.reduce((a, s) => a + S.ship.power[s], 0);
      const contacts = S.contacts.map(c => {
        const f = ST.faction(c.faction), d = D.ships[c.ship];
        return '<div class="card" style="--c:' + (c.attitude === 'hostile' ? '#ff6a5a' : f.color) + '"><h3>' + U.esc(c.name) + '</h3>' +
          '<div class="muted" style="font-size:15px">' + U.esc(G.shipClassName(c.faction, c.ship)) + ' · ' + U.esc(f.adj) + ' · ' + (d ? d.tier : '') + '</div>' +
          '<div class="row" style="margin-top:6px"><span class="chip" style="--c:' + (c.attitude === 'hostile' ? '#ff6a5a' : c.attitude === 'friendly' ? '#99cc99' : '#ffcc99') + '">' + c.attitude + '</span>' +
          '<button class="lc-btn sm c-sky" data-act="hailContact" data-arg="' + c.id + '">Hail</button>' +
          (c.faction !== 'federation' ? '<button class="lc-btn sm c-red" data-act="attackContact" data-arg="' + c.id + '">Open fire</button>' : '') + '</div></div>';
      }).join('');
      return '<div class="cols"><div class="stack">' +
        '<div class="hdr" style="--c:var(--red)"><span class="cap"></span><span class="t">Tactical status</span><span class="fill"></span><span class="tag">' + used + ' / ' + st.reactor + ' POWER</span></div>' +
        '<p class="muted" style="margin:0">Power set here carries into battle. Damaged systems cap how much power they can use.</p>' +
        UI.powerRows() +
        '<div class="sub-h">Armament</div><dl class="kv"><dt>Phasers</dt><dd>' + U.fmt1(st.phaserDmg) + ' damage per volley' + (S.ship.refits.includes('phaser2') ? ' · Type-X' : '') + '</dd>' +
        '<dt>Torpedoes</dt><dd>' + S.res.torpedoes + ' / ' + st.torpCap + ' · ' + Math.round(st.torpDmg) + ' damage' + (S.ship.refits.includes('quantum') ? ' · quantum' : ' · photon') + '</dd>' +
        '<dt>Shields</dt><dd>' + Math.round(S.ship.shields) + ' / ' + st.shieldMax + '</dd><dt>Hull</dt><dd>' + Math.round(S.ship.hull) + ' / ' + st.hullMax + '</dd>' +
        '<dt>Cloak detection</dt><dd>' + (st.cloakDetect ? 'Tachyon sensor suite installed' : 'None. Modulating shields briefly reveals cloaked ships.') + '</dd></dl>' +
        '</div><div class="stack">' +
        '<div class="hdr" style="--c:var(--peach)"><span class="cap"></span><span class="t">Contacts</span><span class="fill"></span><span class="end"></span></div>' +
        (contacts ? '<div class="list">' + contacts + '</div>' : '<p class="muted">No vessels on sensors.</p>') +
        '<div class="sub-h">Combat primer</div><div class="prose" style="font-size:17px"><p>Battles run in real time. <strong>Space</strong> pauses so you can shift power, change targets or trigger officer abilities. Phasers auto-fire when charged. Torpedoes hit hard but can miss agile ships. Target an enemy\'s weapons or engines to cripple it, then hail and demand surrender. If it goes badly, spool the warp drive and retreat.</p></div>' +
        '</div></div>';
    },
    mount() { if (ST.combat.active) ST.combat.updateUI(); }
  });

  A.pwrSet = (arg) => { const [s, n] = arg.split(':'); ST.combat.setPower(s, +n); ST.combat.clampPower(); UI.renderMain(); ST.save(); };
  A.attackContact = function (id) {
    const S = ST.S, c = S.contacts.find(x => x.id === id);
    if (!c || UI.busy()) return;
    const f = ST.faction(c.faction);
    if (c.attitude !== 'hostile' && !UI._confirmAttack) {
      UI._confirmAttack = id;
      UI.showOverlay('<div class="dlg" style="--c:var(--red)"><div class="dlg-rail"></div><div class="dlg-body"><div class="dlg-top"><div class="t">Open fire on the ' + U.esc(c.name) + '?</div><div class="k">RULES OF ENGAGEMENT</div></div><div style="padding-right:16px"><div class="prose"><p>The ' + U.esc(c.name) + ' is ' + c.attitude + '. Firing first will cost you standing with the ' + U.esc(f.name) + (f.pirate ? '' : ' and with Starfleet') + '.</p></div><div class="choices"><button class="choice k-fight" data-act="attackContactYes" data-arg="' + id + '"><span>Fire at will</span></button><button class="choice k-neutral" data-act="attackContactNo"><span>Belay that order</span></button></div></div></div></div>');
      return;
    }
    UI._confirmAttack = null;
    UI.hideOverlay();
    if (c.attitude !== 'hostile' && !f.pirate) { ST.story.apply({ relation: { [c.faction]: -15 }, renown: -3 }, null); }
    c.attitude = 'hostile';
    ST.combat.start({ enemies: [{ faction: c.faction, cls: c.ship, name: c.name, contactId: c.id }], canFlee: true, canHail: true, intro: 'You open fire on the ' + c.name + '.' });
  };
  A.attackContactYes = (id) => { UI._confirmAttack = null; A.attackContact.call(null, id); };
  A.attackContactNo = () => { UI._confirmAttack = null; UI.hideOverlay(); };
})();
