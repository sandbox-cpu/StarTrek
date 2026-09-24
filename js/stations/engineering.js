/* Engineering: power, repairs with spare parts, refits and ship specs. */
(function () {
  'use strict';
  const ST = window.ST, D = ST.DATA, U = ST.util, G = ST.galaxy;
  const A = ST.actions, UI = ST.ui;

  function shopAvailable() {
    const S = ST.S; if (!S.docked) return null;
    const st = G.station(G.here());
    if (!st) return null;
    if (st.type === 'starbase') return { kind: 'starbase', mult: 1, name: st.name };
    if (st.type === 'trade') return { kind: 'trade', mult: ST.diplomacy.priceFactor('ferengi') * 1.1, name: st.name };
    return null;
  }

  UI.station('engineering', {
    label: 'Engineering',
    render() {
      const S = ST.S, st = ST.shipStats(), cls = st.cls;
      const shop = shopAvailable();
      const systems = Object.keys(S.ship.systems).map(s => {
        const h = S.ship.systems[s];
        return '<div class="row" style="justify-content:space-between"><span style="text-transform:uppercase;min-width:92px">' + s + '</span><div class="meter" style="flex:1;--c:' + (h < 25 ? '#ff5a4a' : h < 60 ? '#ffcc66' : '#99cc99') + '"><i style="width:' + h + '%"></i></div><span class="num" style="width:44px;text-align:right">' + Math.round(h) + '%</span>' +
          '<button class="lc-btn sm c-tan" data-act="engRepair" data-arg="' + s + '"' + (h >= 100 || S.res.spares < 1 ? ' disabled' : '') + '>Repair · 1 spare</button></div>';
      }).join('');
      const refitsHave = S.ship.refits.map(r => '<span class="chip" style="--c:var(--tan)">' + U.esc(D.refits[r].name) + '</span>').join(' ') || '<span class="muted">Standard configuration</span>';
      let shopHtml = '';
      if (shop) {
        shopHtml = '<div class="sub-h">Refit yard · ' + U.esc(shop.name) + '</div><div class="list">' + Object.keys(D.refits).filter(r => !S.ship.refits.includes(r)).map(r => {
          const cost = Math.round(D.refits[r].cost * shop.mult);
          return '<div class="card" style="--c:var(--tan)"><div class="row" style="justify-content:space-between"><div><h3 style="font-size:18px">' + U.esc(D.refits[r].name) + '</h3><div class="muted" style="font-size:15px">' + U.esc(D.refits[r].desc) + '</div></div>' +
            '<button class="lc-btn sm c-orange" data-act="engBuy" data-arg="' + r + '"' + (S.res.latinum >= cost ? '' : ' disabled') + '>' + cost + ' latinum</button></div></div>';
        }).join('') + '</div>';
      } else shopHtml = '<p class="muted">Dock at a starbase or trading post to buy refits.</p>';
      return '<div class="cols"><div class="stack">' +
        '<div class="hdr" style="--c:var(--tan)"><span class="cap"></span><span class="t">Main engineering</span><span class="fill"></span><span class="tag">' + U.esc(cls.name.toUpperCase()) + '</span></div>' +
        '<div class="sub-h">Power distribution</div>' + UI.powerRows() +
        '<div class="sub-h">Systems</div><div class="stack" style="gap:8px">' + systems + '</div>' +
        '<div class="sub-h">Hull</div><div class="row"><div class="meter" style="flex:1;--c:var(--peach)"><i style="width:' + (S.ship.hull / st.hullMax * 100) + '%"></i></div><span class="num">' + Math.round(S.ship.hull) + ' / ' + st.hullMax + '</span>' +
        '<button class="lc-btn sm c-peach" data-act="engHull" data-arg="1"' + (S.ship.hull >= st.hullMax || S.res.spares < 1 ? ' disabled' : '') + '>Patch · 1 spare</button><button class="lc-btn sm c-peach" data-act="engHull" data-arg="5"' + (S.ship.hull >= st.hullMax || S.res.spares < 5 ? ' disabled' : '') + '>Patch · 5 spares</button></div>' +
        '<p class="muted" style="font-size:15px">One spare part restores 25% to a system or 8 hull. Full repairs are free at a Federation starbase.</p>' +
        '</div><div class="stack">' +
        '<div class="hdr" style="--c:var(--orange)"><span class="cap"></span><span class="t">Ship specifications</span><span class="fill"></span><span class="end"></span></div>' +
        ST.art.html('ship_' + S.ship.cls, { label: 'U.S.S. ' + S.ship.name, label2: cls.name }) +
        '<dl class="kv"><dt>Vessel</dt><dd>U.S.S. ' + U.esc(S.ship.name) + ' · ' + S.ship.registry + '</dd><dt>Class</dt><dd>' + cls.name + ' ' + cls.role.toLowerCase() + '</dd>' +
        '<dt>Reactor</dt><dd>' + st.reactor + ' power units</dd><dt>Warp core</dt><dd>Matter/antimatter reaction stable · ' + S.res.dilithium + ' / ' + st.dilCap + ' dilithium</dd>' +
        '<dt>Fuel use</dt><dd>' + Math.round(st.fuel * 100) + '% of standard</dd><dt>Speed</dt><dd>' + Math.round(st.warp * 100) + '% of standard</dd>' +
        '<dt>Complement</dt><dd>' + S.res.crew + ' / ' + st.crewMax + '</dd></dl>' +
        '<div class="sub-h">Installed refits</div><div class="row" style="gap:6px">' + refitsHave + '</div>' + shopHtml +
        '</div></div>';
    }
  });

  A.engRepair = function (s) {
    const S = ST.S;
    if (S.res.spares < 1 || S.ship.systems[s] >= 100) return;
    ST.res.add('spares', -1);
    const eng = ST.crew.best('engineering');
    S.ship.systems[s] = Math.min(100, S.ship.systems[s] + 25 + eng.value * 2);
    ST.audio.play('select');
    UI.render(); ST.save();
  };
  A.engHull = function (n) {
    n = +n;
    const S = ST.S, st = ST.shipStats();
    const need = Math.ceil((st.hullMax - S.ship.hull) / 8);
    const use = Math.min(n, need, S.res.spares);
    if (use <= 0) return;
    ST.res.add('spares', -use); ST.res.add('hull', use * 8);
    ST.audio.play('select');
    UI.render(); ST.save();
  };
  A.engBuy = function (r) {
    const S = ST.S, shop = shopAvailable();
    if (!shop || S.ship.refits.includes(r)) return;
    const cost = Math.round(D.refits[r].cost * shop.mult);
    if (S.res.latinum < cost) { ST.audio.play('deny'); return; }
    ST.res.add('latinum', -cost);
    S.ship.refits.push(r);
    ST.log('Refit installed: ' + D.refits[r].name + '.', 'good');
    UI.toast('Installed: ' + D.refits[r].name, '#ffcc66');
    ST.audio.play('success');
    UI.render(); ST.save();
  };
})();
