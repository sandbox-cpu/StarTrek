/* Mission log: active missions, campaign progress, completed missions,
   the full captain's log and the service record. */
(function () {
  'use strict';
  const ST = window.ST, D = ST.DATA, U = ST.util, G = ST.galaxy;
  const UI = ST.ui;

  UI.station('log', {
    label: 'Mission log',
    render() {
      const S = ST.S, gd = D.GAME_DIFFICULTY[S.difficulty];
      const active = S.missions.active.map(m => {
        const tgt = ST.missions.targetSystem(m), dl = ST.missions.daysLeft(m);
        const def = ST.missions.def(m);
        return '<div class="card" style="--c:' + (m.crisis ? '#ff6a5a' : 'var(--lilac)') + '"><h3>' + U.esc(m.title) + '</h3>' +
          '<div class="row" style="gap:6px;margin-bottom:6px"><span class="chip o" style="--c:var(--lilac)">' + m.category.replace('_', ' ') + '</span><span class="chip o" style="--c:var(--peach)">stage ' + (m.stage + 1) + ' of ' + def.stages.length + '</span>' + (dl != null ? '<span class="chip ' + (dl <= 2 ? 'c-red' : 'o') + '" style="--c:var(--tan)">' + U.fmt1(dl) + ' days left</span>' : '') + '</div>' +
          '<div style="font-size:19px;color:var(--orange)">▸ ' + U.esc(ST.missions.objective(m)) + '</div>' +
          '<div class="prose" style="font-size:16px;margin-top:6px"><p>' + U.esc(m.briefing) + '</p></div>' +
          (tgt != null ? '<div class="row"><span class="muted">' + (tgt === S.location ? 'You are in the target system.' : U.esc(G.sys(tgt).name) + ' · ' + G.hops(S.location, tgt) + ' jumps') + '</span>' + (tgt !== S.location ? '<button class="lc-btn sm c-peach" style="margin-left:auto" data-act="navTo" data-arg="' + tgt + '">Plot course</button>' : '') + '</div>' : '') +
          '</div>';
      }).join('');
      const done = S.missions.done.slice(0, 12).map(m => '<div class="e"><span class="d">' + ST.stardate(m.doneDay) + '</span><span class="t" style="color:' + (m.status === 'success' ? '#99cc99' : '#ff8a7a') + '">' + U.esc(m.title) + ' · ' + m.status + '</span></div>').join('');
      const log = S.log.slice().reverse().map(e => '<div class="e k-' + (e.kind || '') + '"><span class="d">' + ST.stardate(e.day) + '</span><span class="t">' + U.esc(e.text) + '</span></div>').join('');
      const st = S.stats;
      const progress = S.crisis.triggered ? '<p class="bad">The sector crisis is under way. Resolve it to complete your command.</p>' :
        '<p class="muted" style="margin:0 0 6px">Starfleet will call on you for a sector-wide crisis once your renown reaches ' + gd.crisisRenown + ', or by stardate ' + ST.stardate(gd.crisisDay) + ' at the latest.</p>' +
        '<div class="meter" style="--c:var(--violet)"><i style="width:' + U.clamp(S.res.renown / gd.crisisRenown * 100, 0, 100) + '%"></i></div>' +
        '<div class="meter" style="--c:var(--tan);margin-top:4px;height:6px"><i style="width:' + U.clamp(S.day / gd.crisisDay * 100, 0, 100) + '%"></i></div>';
      return '<div class="cols"><div class="stack">' +
        '<div class="hdr" style="--c:var(--violet)"><span class="cap"></span><span class="t">Active missions</span><span class="fill"></span><span class="tag">' + S.missions.active.length + '</span></div>' +
        (active ? '<div class="list">' + active + '</div>' : '<p class="muted">No active missions. Open Comms to accept orders.</p>') +
        '<div class="sub-h">Campaign</div>' + progress +
        '<div class="sub-h">Completed</div><div class="log">' + (done || '<span class="muted">None yet.</span>') + '</div>' +
        '</div><div class="stack">' +
        '<div class="hdr" style="--c:var(--peach)"><span class="cap"></span><span class="t">Service record</span><span class="fill"></span><span class="end"></span></div>' +
        '<dl class="kv"><dt>Captain</dt><dd>' + U.esc(S.captain.name) + '</dd><dt>Sector</dt><dd>' + U.esc(S.sector) + '</dd><dt>Difficulty</dt><dd>' + gd.label + '</dd><dt>Days</dt><dd>' + Math.floor(S.day) + '</dd>' +
        '<dt>Missions</dt><dd>' + st.missionsWon + ' won · ' + st.missionsFailed + ' failed</dd><dt>Systems visited</dt><dd>' + st.visited + ' of ' + S.galaxy.systems.length + '</dd><dt>First contacts</dt><dd>' + st.contacts + '</dd>' +
        '<dt>Battles</dt><dd>' + st.battles + ' won · ' + st.destroyed + ' ships destroyed</dd><dt>Distance</dt><dd>' + U.fmt1(st.ly) + ' ly</dd><dt>Losses</dt><dd>' + st.crewLost + ' crew · ' + st.officersLost + ' officers</dd><dt>Seed</dt><dd>' + S.seed + '</dd></dl>' +
        '<div class="sub-h">Captain\'s log</div><div class="log" style="max-height:520px;overflow:auto">' + log + '</div>' +
        '</div></div>';
    }
  });
})();
