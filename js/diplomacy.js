/* Diplomacy: the negotiation minigame and trading. */
(function () {
  'use strict';
  const ST = window.ST, D = ST.DATA, U = ST.util;
  const Dp = ST.diplomacy = { active: null };
  const DIFF_TENSION = { trivial: -12, easy: -6, moderate: 0, hard: 10, extreme: 20 };

  // ================================================================ negotiation
  Dp.negotiate = function (opts) {
    const S = ST.S, f = ST.faction(opts.faction);
    ST.meetSpecies(opts.faction);
    const values = Object.assign({}, (f && f.values) || {});
    const rel = S.relations[opts.faction] || 0;
    const N = {
      opts, f, values, slot: opts.slot || {},
      rounds: opts.rounds || 6, round: 1, goal: 100,
      agreement: Math.max(0, Math.round(rel / 5)),
      tension: U.clamp(18 + Math.max(0, -rel) / 3 + (DIFF_TENSION[opts.difficulty] || 0), 5, 70),
      revealed: {}, lines: [], hand: [], concern: null, done: null, chips: opts.chips || []
    };
    const empath = ST.crew.available().find(o => o.trait === 'empath');
    if (empath) { D.VALUES.forEach(v => { N.revealed[v] = Math.sign(values[v] || 0); }); N.lines.push(ST.crew.display(empath) + ' senses their priorities and quietly briefs you.'); }
    if (!f || f.negotiable === false || !D.VALUES.some(v => values[v] > 0)) {
      N.done = 'lose'; N.lines.push('There is no one to negotiate with. The channel carries only static and threats.');
    } else newRound(N);
    Dp.active = N;
    ST.ui.setNavLocked(true);
    ST.audio.play('hail');
    render(N);
  };

  function newRound(N) {
    const R = ST.rng, vals = N.values;
    const pos = D.VALUES.filter(v => vals[v] > 0);
    N.concern = R.weighted(pos, v => Math.pow(vals[v], 1.6));
    N.quote = R.pick(D.concerns[N.concern]);
    const pool = D.approaches.slice();
    let hand = R.shuffle(pool).slice(0, 4);
    if (!hand.some(a => (a.v[N.concern] || 0) > 0)) {
      const rel = R.pick(pool.filter(a => (a.v[N.concern] || 0) > 0 && !hand.includes(a)));
      if (rel) hand[R.int(0, 3)] = rel;
    }
    N.hand = hand;
  }

  Dp.play = function (idx) {
    const N = Dp.active; if (!N || N.done) return;
    const a = N.hand[idx]; if (!a) return;
    if (a.cost && !Object.keys(a.cost).every(k => ST.res.get(k) >= a.cost[k])) { ST.audio.play('deny'); return; }
    if (a.cost) { const neg = {}; Object.keys(a.cost).forEach(k => { neg[k] = -a.cost[k]; }); N.chips = N.chips.concat(ST.story.apply(neg, N.opts.run)); }
    const roll = ST.crew.roll(a.skill, N.opts.difficulty || 'moderate');
    let raw = 0;
    Object.keys(a.v).forEach(v => { raw += a.v[v] * (N.values[v] || 0); });
    const bonus = (a.v[N.concern] || 0) > 0 ? a.v[N.concern] * (N.values[N.concern] || 0) : 0;
    const score = raw + bonus;
    if (roll.ok) { N.agreement += Math.max(0, score) * 6 + (score > 0 ? 6 : 0); N.tension += Math.max(0, -score) * 7; }
    else { N.agreement += Math.max(0, score) * 2.5; N.tension += Math.max(0, -score) * 9 + 10; }
    N.tension += 4;
    N.agreement = Math.round(N.agreement); N.tension = Math.round(N.tension);
    Object.keys(a.v).forEach(v => { N.revealed[v] = Math.sign(N.values[v] || 0); });
    const who = N.slot.leader || (N.f.adj + ' envoy');
    const react = score >= 3 ? ST.rng.pick(D.reactions.good) : score <= -1 ? ST.rng.pick(D.reactions.bad) : ST.rng.pick(D.reactions.flat);
    N.lines = [(roll.ok ? '' : (roll.officer ? roll.officer.name : 'You') + ' fumbles the delivery. ') + who + ' ' + react];
    N.last = { ok: roll.ok, chance: roll.chance, skill: a.skill, officer: roll.officer };
    ST.audio.play(score >= 3 && roll.ok ? 'success' : score <= -1 || !roll.ok ? 'fail' : 'click');
    N.round++;
    if (N.agreement >= N.goal) N.done = 'win';
    else if (N.tension >= 100) N.done = 'lose';
    else if (N.round > N.rounds) N.done = N.agreement >= N.goal * 0.7 ? 'win' : 'lose';
    else newRound(N);
    if (N.done) finishTalks(N);
    render(N);
  };
  Dp.walk = function () { const N = Dp.active; if (!N || N.done) return; N.done = 'lose'; N.lines = ['You end the talks. The channel closes without ceremony.']; finishTalks(N); render(N); };

  function finishTalks(N) {
    const fid = N.opts.faction;
    if (fid && fid !== 'federation' && ST.faction(fid) && ST.faction(fid).negotiable !== false) {
      N.chips = N.chips.concat(ST.story.apply({ relation: { [fid]: N.done === 'win' ? 6 : -4 } }, N.opts.run));
    }
    ST.crew.addXp(ST.crew.best('diplomacy').officer, N.done === 'win' ? 20 : 8);
  }
  Dp.close = function () {
    const N = Dp.active; if (!N) return;
    Dp.active = null;
    ST.ui.hideOverlay();
    const won = N.done === 'win';
    if (N.opts.run) N.opts.run.chips = (N.opts.run.chips || []).concat(N.chips);
    if (N.opts.onEnd) N.opts.onEnd(won);
    else { ST.ui.setNavLocked(false); ST.ui.render(); }
  };

  function meter(label, val, max, color) {
    return '<div><div class="row" style="justify-content:space-between"><span class="muted">' + label + '</span><span class="num" style="color:' + color + '">' + Math.min(val, max) + ' / ' + max + '</span></div><div class="meter" style="--c:' + color + '"><i style="width:' + U.clamp(val / max * 100, 0, 100) + '%"></i></div></div>';
  }
  function render(N) {
    const f = N.f || { name: 'Unknown', adj: 'Unknown', color: '#cc99cc' };
    const img = (f.portrait || f.ship || 'nebula');
    const vals = D.VALUES.map(v => {
      const r = N.revealed[v];
      const sym = r == null ? '?' : r > 0 ? '+' : r < 0 ? '−' : '·';
      return '<span class="chip ' + (r == null ? 'o' : '') + '" style="--c:' + D.VALUE_COLORS[v] + '">' + D.VALUE_LABELS[v] + ' ' + sym + '</span>';
    }).join('');
    let body;
    if (N.done) {
      body = '<div class="result ' + (N.done === 'win' ? 'ok' : 'no') + '">' + (N.done === 'win' ? 'AGREEMENT REACHED' : 'TALKS COLLAPSED') + '</div>' +
        '<div class="prose"><p>' + U.esc(N.lines.join(' ')) + '</p><p>' + (N.done === 'win' ? 'Terms on ' + U.esc(N.opts.topic || 'the matter') + ' are recorded and transmitted to Starfleet.' : 'The ' + U.esc(f.adj) + ' delegation withdraws.') + '</p></div>' +
        ST.story.chipsHtml(N.chips) +
        '<div class="choices"><button class="choice k-neutral" data-act="negoClose"><span>Continue</span></button></div>';
    } else {
      const cards = N.hand.map((a, i) => {
        const c = ST.crew.chance(a.skill, N.opts.difficulty || 'moderate');
        const afford = !a.cost || Object.keys(a.cost).every(k => ST.res.get(k) >= a.cost[k]);
        const tags = Object.keys(a.v).filter(v => a.v[v] > 0).map(v => '<span class="chip" style="--c:' + D.VALUE_COLORS[v] + '">' + D.VALUE_LABELS[v] + '</span>').join('');
        const costTxt = a.cost ? ' · COST ' + Object.keys(a.cost).map(k => a.cost[k] + ' ' + k).join(', ') : '';
        return '<button class="ncard" style="--c:' + D.SKILL_COLORS[a.skill] + '" data-act="negoPlay" data-arg="' + i + '"' + (afford ? '' : ' disabled') + '>' +
          '<span>' + U.esc(a.label) + '</span><span class="tags">' + tags + '</span>' +
          '<span class="muted" style="font-size:13px">' + a.skill.toUpperCase() + ' ' + Math.round(c.chance * 100) + '%' + (c.officer ? ' · ' + U.esc(c.officer.name) : '') + costTxt + '</span></button>';
      }).join('');
      const last = N.last ? '<div class="result ' + (N.last.ok ? 'ok' : 'no') + '">' + N.last.skill.toUpperCase() + ' ' + (N.last.ok ? 'SUCCEEDED' : 'FAILED') + ' · ' + Math.round(N.last.chance * 100) + '%</div>' : '';
      body = last + (N.lines.length ? '<p class="muted" style="margin:0 0 8px">' + U.esc(N.lines.join(' ')) + '</p>' : '') +
        '<div class="speaker">' + U.esc(N.slot.leader || f.adj + ' envoy') + ' · round ' + N.round + ' of ' + N.rounds + '</div>' +
        '<div class="prose"><p>' + U.esc(N.quote) + '</p></div>' +
        '<p class="muted" style="margin:0 0 6px">Their concern: <span style="color:' + D.VALUE_COLORS[N.concern] + '">' + D.VALUE_LABELS[N.concern].toUpperCase() + '</span>. Answer it with something they value.</p>' +
        '<div class="cards">' + cards + '</div>' +
        '<div class="row" style="margin-top:10px;justify-content:flex-end"><button class="lc-btn sm c-red" data-act="negoWalk">Break off talks</button></div>';
    }
    const html = '<div class="dlg" style="--c:#99ccff"><div class="dlg-rail"></div><div class="dlg-body">' +
      '<div class="dlg-top"><div class="t">Negotiation · ' + U.esc(f.name) + '</div><div class="k">DIPLOMACY · ' + U.esc((N.opts.topic || '').toUpperCase()) + '</div></div>' +
      '<div class="dlg-grid"><div>' + ST.art.html(N.opts.image || img, { label: 'SUBSPACE LINK', color: f.color }) +
      (N.opts.intro && N.round === 1 && !N.last ? '<div class="prose" style="margin-top:10px;font-size:18px"><p>' + U.esc(N.opts.intro) + '</p></div>' : '') +
      '<div class="sub-h">What they value</div><div class="values">' + vals + '</div></div>' +
      '<div><div class="nego-meters">' + meter('AGREEMENT', N.agreement, N.goal, '#99cc99') + meter('TENSION', N.tension, 100, '#ff6a5a') + '</div>' + body + '</div>' +
      '</div></div></div>';
    ST.ui.showOverlay(html);
  }

  // ================================================================ trade
  Dp.priceFactor = function (fid) {
    const S = ST.S;
    if (!fid || fid === 'federation') return 1;
    const rel = S.relations[fid] || 0;
    let f = 1.3 - rel / 250;
    if (fid === 'ferengi') f += 0.1;
    return U.clamp(f, 0.8, 1.8);
  };
  Dp.trade = function (fid) {
    Dp.tradeWith = fid || null;
    Dp.tradeOpen = true;
    ST.ui.setNavLocked(true);
    renderTrade();
  };
  function renderTrade() {
    const fid = Dp.tradeWith, f = ST.faction(fid);
    const k = Dp.priceFactor(fid);
    const rows = Object.keys(D.prices).map(r => {
      const buy = Math.ceil(D.prices[r] * k), sell = Math.floor(D.prices[r] * 0.55);
      const have = ST.res.get(r), cap = ST.res.cap(r);
      return '<div class="card" style="--c:var(--tan)"><h3>' + r + '</h3><div class="kv"><dt>Aboard</dt><dd class="num">' + have + (cap ? ' / ' + cap : '') + '</dd><dt>Buy</dt><dd class="num">' + buy + ' latinum</dd><dt>Sell</dt><dd class="num">' + sell + ' latinum</dd></div>' +
        '<div class="row" style="margin-top:8px"><button class="lc-btn sm c-green" data-act="tradeBuy" data-arg="' + r + ':1">Buy 1</button><button class="lc-btn sm c-green" data-act="tradeBuy" data-arg="' + r + ':5">Buy 5</button><button class="lc-btn sm c-peach" data-act="tradeSell" data-arg="' + r + ':1">Sell 1</button><button class="lc-btn sm c-peach" data-act="tradeSell" data-arg="' + r + ':5">Sell 5</button></div></div>';
    }).join('');
    const html = '<div class="dlg" style="--c:#ffcc66"><div class="dlg-rail"></div><div class="dlg-body">' +
      '<div class="dlg-top"><div class="t">Trade · ' + U.esc(f ? f.name : 'Independent traders') + '</div><div class="k">LATINUM ' + ST.res.get('latinum') + '</div></div>' +
      '<div style="padding-right:16px"><p class="muted">Prices shift with your standing. ' + (k > 1.15 ? 'They do not like you much, and it shows in the prices.' : k < 1 ? 'Good relations earn you a discount.' : '') + '</p>' +
      '<div class="cols three">' + rows + '</div>' +
      '<div class="row" style="margin-top:14px;justify-content:flex-end"><button class="lc-btn c-orange" data-act="tradeClose">Close channel</button></div></div>' +
      '</div></div>';
    ST.ui.showOverlay(html);
  }
  Dp.buy = function (arg) {
    const [r, n] = arg.split(':'); const amt = +n;
    const price = Math.ceil(D.prices[r] * Dp.priceFactor(Dp.tradeWith));
    const cap = ST.res.cap(r);
    const room = cap == null ? amt : Math.max(0, cap - ST.res.get(r));
    const q = Math.min(amt, room, Math.floor(ST.res.get('latinum') / price));
    if (q <= 0) { ST.audio.play('deny'); ST.ui.toast(room <= 0 ? 'No room aboard' : 'Not enough latinum', '#cc6666'); return; }
    ST.res.add('latinum', -q * price); ST.res.add(r, q);
    ST.audio.play('click'); renderTrade(); ST.ui.renderChrome();
  };
  Dp.sell = function (arg) {
    const [r, n] = arg.split(':'); const amt = +n;
    const q = Math.min(amt, Math.floor(ST.res.get(r)));
    if (q <= 0) { ST.audio.play('deny'); return; }
    ST.res.add(r, -q); ST.res.add('latinum', q * Math.floor(D.prices[r] * 0.55));
    ST.audio.play('click'); renderTrade(); ST.ui.renderChrome();
  };
  Dp.closeTrade = function () { Dp.tradeWith = null; Dp.tradeOpen = false; ST.ui.hideOverlay(); ST.ui.setNavLocked(false); ST.ui.render(); ST.save(); };
})();
