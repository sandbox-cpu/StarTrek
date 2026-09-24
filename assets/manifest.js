/* Art manifest. Content packs reference images by these keys (e.g. "image": "planet_m").
   To add art: drop a 16:9 JPG in assets/img/ and add a line here.
   ALIAS maps a key with no image of its own to one that has one.
   If a file fails to load, the game draws a procedural stand-in instead. */
(function (root) {
  'use strict';
  const ST = root.ST;
  ST.ART = {
    // planet orbit views, by planet class
    planet_m: 'assets/img/planet_m.jpg',
    planet_l: 'assets/img/planet_l.jpg',
    planet_o: 'assets/img/planet_o.jpg',
    planet_h: 'assets/img/planet_h.jpg',
    planet_p: 'assets/img/planet_p.jpg',
    planet_k: 'assets/img/planet_k.jpg',
    planet_n: 'assets/img/planet_n.jpg',
    planet_y: 'assets/img/planet_y.jpg',
    planet_j: 'assets/img/planet_j.jpg',
    // space
    warp: 'assets/img/warp.jpg',
    nebula: 'assets/img/nebula.jpg',
    ion_storm: 'assets/img/ion_storm.jpg',
    rift: 'assets/img/rift.jpg',
    wormhole: 'assets/img/wormhole.jpg',
    asteroids: 'assets/img/asteroids.jpg',
    derelict: 'assets/img/derelict.jpg',
    starbase: 'assets/img/starbase.jpg',
    trade_station: 'assets/img/trade_station.jpg',
    pulsar: 'assets/img/pulsar.jpg',
    megastructure: 'assets/img/megastructure.jpg',
    entity: 'assets/img/entity.jpg',
    black_hole: 'assets/img/black_hole.jpg',
    // ships
    ship_player: 'assets/img/ship_player.jpg',
    ship_klingon: 'assets/img/ship_klingon.jpg',
    ship_romulan: 'assets/img/ship_romulan.jpg',
    ship_cardassian: 'assets/img/ship_cardassian.jpg',
    ship_ferengi: 'assets/img/ship_ferengi.jpg',
    ship_orion: 'assets/img/ship_orion.jpg',
    ship_unknown: 'assets/img/ship_unknown.jpg',
    ship_cube: 'assets/img/ship_cube.jpg',
    doomsday: 'assets/img/doomsday.jpg',
    // people on the viewscreen
    portrait_admiral: 'assets/img/portrait_admiral.jpg',
    portrait_klingon: 'assets/img/portrait_klingon.jpg',
    portrait_romulan: 'assets/img/portrait_romulan.jpg',
    portrait_cardassian: 'assets/img/portrait_cardassian.jpg',
    portrait_ferengi: 'assets/img/portrait_ferengi.jpg',
    portrait_orion: 'assets/img/portrait_orion.jpg',
    portrait_alien1: 'assets/img/portrait_alien1.jpg',
    portrait_alien2: 'assets/img/portrait_alien2.jpg',
    portrait_borg: 'assets/img/portrait_borg.jpg',
    // planet surfaces for away teams
    surface_ruins: 'assets/img/surface_ruins.jpg',
    surface_colony: 'assets/img/surface_colony.jpg',
    surface_caves: 'assets/img/surface_caves.jpg'
  };
  // Keys that do not have their own picture yet.
  ST.ART_ALIAS = {
    title: 'starbase'
  };
})(typeof window !== 'undefined' ? window : globalThis);
