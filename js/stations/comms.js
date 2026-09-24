/* Communications: hail contacts and planets, Starfleet mission board, and
   the diplomatic relations board. */
(function () {
  'use strict';
  const ST = window.ST, D = ST.DATA, U = ST.util, G = ST.galaxy;
  const A = ST.actions, UI = ST.ui;

  function relLabel(v) { return v >= 60 ? 'Allied' : v >= 25 ? 'Friendly' : v > -25 ? 'Neutral' : v > -60 ? 'Unfriendly' : 'Hostile'; }
  UI.relLabel = relLabel;

  UI.station('comms', {
    label: 'Comms',
    render() {
      const S = ST.S, sys = G.here();
      ST.missions.refreshBoard(false);
      if (!S.missions.board.length) ST.missions.fillBoard();
      const busy = UI.busy();
      const contacts = S.contacts.map(c => {
        const f = ST.faction(c.faction);
        return '<div class="card" style="--c:' + (c.attitude === 'hostile' ? '#ff6a5a' : f.color) + '"><div class="row" style="justify-content:space-between"><div><h3>' + U.esc(c.name) + '</h3><div class="muted" style="font-size:15px">' + U.esc(G.shipClassName(c.faction, c.ship)) + ' · ' + c.attitude + '</div></div>' +
          '<button class="lc-btn c-sky" data-act="hailContact" data-arg="' + c.id + '"' + (busy ? ' disabled' : '') + '>Hail</button></div></div>';
      }).join('');
      const planets = sys.planets.map((p, i) => ({ p, i })).filter(o => o.p.species && !S.species[o.p.species].prewarp && sys.scanned).map(o => {
        const sp = S.species[o.p.species];
        return '<div class="card" style="--c:' + sp.color + '"><div class="row" style="justify-content:space-between"><div><h3>' + U.esc(o.p.name) + '</h3><div class="muted" style="font-size:15px">' + (sp.met ? U.esc(sp.name) : 'Unknown warp-capable civilisation') + '</div></div><button class="lc-btn c-sky" data-act="hailPlanet" data-arg="' + o.i + '"' + (busy ? ' disabled' : '') + '>Hail</button></div></div>';
      }).join('');
      const board = S.missions.board.map(m => {
        const def = ST.missions.def(m);
        const tgt = ST.missions.targetSystem(m);
        const giver = m.giver && m.giver !== 'starfleet' ? ST.faction(m.giver) : null;
        return '<div class="card" style="--c:var(--lilac)"><h3>' + U.esc(m.title) + '</h3>' +
          '<div class="row" style="gap:6px;margin-bottom:4px"><span class="chip o" style="--c:var(--lilac)">' + m.category.replace('_', ' ') + '</span>' + (giver ? '<span class="chip o" style="--c:' + giver.color + '">for the ' + U.esc(giver.adj) + '</span>' : '') + (m.deadline ? '<span class="chip o" style="--c:var(--tan)">' + m.deadline + ' days</span>' : '') + (tgt != null ? '<span class="chip o" style="--c:var(--peach)">' + U.esc(G.sys(tgt).name) + ' · ' + G.hops(S.location, tgt) + ' jumps</span>' : '') + '</div>' +
          '<div class="prose" style="font-size:17px"><p>' + U.esc(m.briefing) + '</p></div>' +
          '<div class="row"><span class="muted" style="font-size:15px">Reward: ' + rewardText(def.rewards) + '</span><button class="lc-btn sm c-lilac" style="margin-left:auto" data-act="missionAccept" data-arg="' + m.uid + '"' + (ST.missions.canAccept() ? '' : ' disabled') + '>Accept</button></div></div>';
      }).join('');
      const facIds = S.galaxy.majors.concat(['orion']).concat(Object.keys(S.species).filter(id => S.species[id].met));
      const rel = facIds.map(fid => {
        const f = ST.faction(fid), v = S.relations[fid] || 0;
        const left = v >= 0 ? 50 : 50 + v / 2, width = Math.abs(v) / 2;
        return '<div class="faction-row"><span style="color:' + f.color + '">' + U.esc(f.adj) + '</span><div class="rel"><i style="left:' + left + '%;width:' + width + '%;background:' + (v >= 0 ? '#99cc99' : '#ff6a5a') + '"></i></div><span class="num" style="text-align:right">' + relLabel(v) + ' ' + (v > 0 ? '+' : '') + v + '</span></div>';
      }).join('');
      return '<div class="cols"><div class="stack">' +
        '<div class="hdr" style="--c:var(--lilac)"><span class="cap"></span><span class="t">Starfleet Command</span><span class="fill"></span><span class="tag">' + S.missions.active.filter(m => !m.crisis).length + ' / 3 ACTIVE</span></div>' +
        (board || '<p class="muted">No new orders. Starfleet will send more in a few days.</p>') +
        '<p class="muted" style="font-size:15px">New orders arrive every few days and after each completed mission.</p>' +
        '</div><div class="stack">' +
        '<div class="hdr" style="--c:var(--sky)"><span class="cap"></span><span class="t">Hailing frequencies</span><span class="fill"></span><span class="end"></span></div>' +
        (contacts || planets ? '<div class="list">' + contacts + planets + '</div>' : '<p class="muted">Nobody to hail in this system.</p>') +
        '<div class="sub-h">Diplomatic relations</div><div class="stack" style="gap:8px">' + rel + '</div>' +
        '</div></div>';
    }
  });

  function rewardText(r) {
    if (!r) return 'renown';
    return Object.keys(r).filter(k => typeof r[k] === 'number').map(k => r[k] + ' ' + k).join(', ') || 'renown';
  }

  A.missionAccept = (uid) => { ST.missions.accept(uid); UI.render(); ST.story.pump(); ST.save(); };
  A.hailContact = function (id) {
    const S = ST.S, c = S.contacts.find(x => x.id === id);
    if (!c || UI.busy()) return;
    c.hailed = true;
    ST.audio.play('hail');
    ST.story.runEvent('hail', { them: c.faction, contact: c }, () => { UI.autoAlert(); });
  };
  A.hailPlanet = function (i) {
    const sys = G.here(), p = sys.planets[+i];
    if (!p || !p.species || UI.busy()) return;
    ST.audio.play('hail');
    const sp = ST.S.species[p.species];
    const ok = ST.story.runEvent('hail', { them: sp.id, planet: p }, null);
    if (!ok) UI.toast('No answer from ' + p.name, '#99ccff');
  };
})();
