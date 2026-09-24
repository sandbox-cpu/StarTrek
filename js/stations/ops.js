/* Operations: crew roster, cargo, and station services when docked. */
(function () {
  'use strict';
  const ST = window.ST, D = ST.DATA, U = ST.util, G = ST.galaxy;
  const A = ST.actions, UI = ST.ui;

  function officerCard(o) {
    const col = ST.crew.roleColor(o);
    const skills = D.SKILLS.map(s => {
      const v = ST.crew.skill(o, s);
      let pips = ''; for (let i = 1; i <= 7; i++) pips += '<i class="' + (i <= v ? 'on' : '') + '"></i>';
      return '<div class="skillrow"><span>' + s + '</span><span class="pips" style="--c:' + D.SKILL_COLORS[s] + '">' + pips + '</span><b>' + v + '</b></div>';
    }).join('');
    const trait = o.trait ? D.TRAITS[o.trait] : null;
    const need = 40 + o.level * 30;
    const status = o.status === 'ok' ? '<span class="chip c-green">On duty</span>' : o.status === 'dead' ? '<span class="chip c-red">Killed in action</span>' : '<span class="chip c-tan">' + o.status + ' · ' + Math.ceil(o.heal) + 'd</span>';
    return '<div class="card officer" style="--c:' + col + ';opacity:' + (o.status === 'dead' ? 0.45 : 1) + '"><div class="row" style="justify-content:space-between"><div><h3>' + U.esc(ST.crew.display(o)) + '</h3><div class="muted" style="font-size:15px">' + U.esc(ST.crew.roleTitle(o)) + ' · ' + D.SPECIES[o.species].name + ' · level ' + o.level + '</div></div>' + status + '</div>' +
      skills + (trait ? '<div style="font-size:15px"><span class="hi">' + U.esc(trait.name) + ':</span> ' + U.esc(trait.desc) + '</div>' : '') +
      '<div class="meter" style="--c:' + col + ';height:5px"><i style="width:' + (o.xp / need * 100) + '%"></i></div></div>';
  }

  UI.station('ops', {
    label: 'Operations',
    render() {
      const S = ST.S, st = ST.shipStats(), sys = G.here();
      const station = G.station(sys);
      let services = '';
      if (S.docked && station) {
        const btn = (act, label, sub, dis) => '<button class="lc-btn c-lilac block" data-act="' + act + '"' + (dis ? ' disabled' : '') + '><span>' + label + '</span>' + (sub ? '<span class="sub">' + sub + '</span>' : '') + '</button>';
        const dmg = S.ship.hull < st.hullMax || Object.values(S.ship.systems).some(v => v < 100);
        const hurt = S.officers.some(o => o.status === 'injured' || o.status === 'critical');
        const dead = S.officers.filter(o => o.status === 'dead');
        if (station.type === 'starbase') {
          services = '<div class="stack" style="gap:6px">' +
            btn('svcRepair', 'Full repairs', 'free · 1 day', !dmg) +
            btn('svcResupply', 'Refuel and rearm', 'free', S.res.dilithium >= st.dilCap && S.res.torpedoes >= st.torpCap) +
            btn('svcCrew', 'Crew replacements', 'free', S.res.crew >= st.crewMax) +
            btn('svcSickbay', 'Starbase medical', 'heals officers · 1 day', !hurt) +
            btn('svcLeave', 'Shore leave', 'morale +25 · 2 days', S.res.morale >= 95) +
            (dead.length ? btn('svcOfficer', 'Request a replacement officer', 'for ' + ST.crew.roleTitle(dead[0]), false) : '') +
            btn('svcTrade', 'Quartermaster', 'buy and sell supplies', false) +
            '</div>';
        } else {
          const cost = Math.ceil((st.hullMax - S.ship.hull) * 1.5 + Object.values(S.ship.systems).reduce((a, v) => a + (100 - v), 0) * 0.3);
          services = '<div class="stack" style="gap:6px">' +
            btn('svcTrade', 'Trade', 'buy and sell supplies', false) +
            btn('svcPaidRepair', 'Paid repairs', cost + ' latinum · 1 day', !dmg || S.res.latinum < cost) +
            '</div>';
        }
        services = '<div class="hdr" style="--c:var(--lilac)"><span class="cap"></span><span class="t">' + U.esc(station.name) + '</span><span class="fill"></span><span class="tag">DOCKED</span></div>' + services +
          '<div class="row" style="margin-top:8px"><button class="lc-btn c-peach ghost" data-act="undock">Undock</button></div>';
      } else if (station) {
        services = '<div class="hdr" style="--c:var(--lilac)"><span class="cap"></span><span class="t">' + U.esc(station.name) + '</span><span class="fill"></span><span class="end"></span></div><button class="lc-btn c-lilac" data-act="dock">Request docking clearance</button>';
      } else {
        services = '<div class="hdr" style="--c:var(--lilac)"><span class="cap"></span><span class="t">Station services</span><span class="fill"></span><span class="end"></span></div><p class="muted">No station in this system. Starbases repair, refuel and resupply you for free.</p>';
      }
      const cargo = S.items.map(it => { const d = D.items[it] || { name: it, desc: '' }; return '<div class="card" style="--c:var(--peach)"><h3 style="font-size:18px">' + U.esc(d.name) + '</h3><div class="muted" style="font-size:15px">' + U.esc(d.desc) + '</div></div>'; }).join('');
      return '<div class="cols"><div class="stack">' +
        '<div class="hdr" style="--c:var(--lilac)"><span class="cap"></span><span class="t">Senior staff</span><span class="fill"></span><span class="tag">MORALE ' + Math.round(S.res.morale) + '</span></div>' +
        '<div class="cols even" style="gap:10px">' + S.officers.map(officerCard).join('') + '</div></div>' +
        '<div class="stack">' + services +
        '<div class="sub-h">Cargo and passengers</div>' + (cargo ? '<div class="list">' + cargo + '</div>' : '<p class="muted">Holds are empty.</p>') +
        '<div class="sub-h">Supplies</div><dl class="kv"><dt>Crew</dt><dd>' + S.res.crew + ' / ' + st.crewMax + '</dd><dt>Spare parts</dt><dd>' + S.res.spares + '</dd><dt>Latinum</dt><dd>' + S.res.latinum + ' bars</dd><dt>Torpedoes</dt><dd>' + S.res.torpedoes + ' / ' + st.torpCap + '</dd><dt>Dilithium</dt><dd>' + S.res.dilithium + ' / ' + st.dilCap + '</dd></dl>' +
        '</div></div>';
    }
  });

  function after(msg) { if (msg) { ST.log(msg); UI.toast(msg, '#cc99cc'); } ST.audio.play('select'); UI.render(); ST.story.pump(); ST.save(); }
  A.undock = () => { ST.S.docked = false; ST.audio.play('click'); UI.render(); ST.save(); };
  A.svcRepair = () => {
    const S = ST.S, st = ST.shipStats();
    S.ship.hull = st.hullMax; Object.keys(S.ship.systems).forEach(k => { S.ship.systems[k] = 100; }); S.ship.shields = st.shieldMax;
    ST.advanceTime(1); after('Starbase engineers completed full repairs.');
  };
  A.svcResupply = () => {
    const S = ST.S, st = ST.shipStats();
    S.res.dilithium = st.dilCap; S.res.torpedoes = st.torpCap; S.res.spares = Math.max(S.res.spares, 6);
    after('Refuelled and rearmed.');
  };
  A.svcCrew = () => { const S = ST.S; const n = ST.shipStats().crewMax - S.res.crew; S.res.crew += n; after(n + ' replacement crew reported aboard.'); };
  A.svcSickbay = () => { ST.crew.healAll(); ST.advanceTime(1); after('All officers released from starbase medical.'); };
  A.svcLeave = () => { ST.res.add('morale', 25); ST.advanceTime(2); after('The crew enjoyed shore leave.'); };
  A.svcOfficer = () => {
    const S = ST.S, dead = S.officers.find(o => o.status === 'dead');
    if (!dead) return;
    const role = D.ROLES.find(r => r.id === dead.role);
    const o = ST.makeOfficer(role, S.officers.length + 10);
    S.officers[S.officers.indexOf(dead)] = o;
    after(ST.crew.display(o) + ' reports aboard as ' + role.title + '.');
  };
  A.svcTrade = () => { const st = G.station(G.here()); ST.audio.play('click'); ST.diplomacy.trade(st && st.type !== 'starbase' ? st.faction : 'federation'); };
  A.svcPaidRepair = () => {
    const S = ST.S, st = ST.shipStats();
    const cost = Math.ceil((st.hullMax - S.ship.hull) * 1.5 + Object.values(S.ship.systems).reduce((a, v) => a + (100 - v), 0) * 0.3);
    if (S.res.latinum < cost) return;
    ST.res.add('latinum', -cost);
    S.ship.hull = st.hullMax; Object.keys(S.ship.systems).forEach(k => { S.ship.systems[k] = 100; });
    ST.advanceTime(1); after('Repairs completed for ' + cost + ' latinum.');
  };
})();
