/* Static game data: factions, ships, planets, stars, names, refits.
   Pure data (no DOM) — also loaded by tools/validate-content.mjs. */
(function (root) {
  'use strict';
  const ST = root.ST;
  const D = ST.DATA = {};

  D.SKILLS = ['command', 'tactics', 'engineering', 'science', 'medicine', 'diplomacy'];
  D.SKILL_COLORS = { command: '#ff9c00', tactics: '#cc6666', engineering: '#ffcc66', science: '#9999ff', medicine: '#99cc99', diplomacy: '#99ccff' };
  D.DIFFICULTIES = {
    trivial: { base: 0.92, label: 'Trivial' },
    easy: { base: 0.78, label: 'Easy' },
    moderate: { base: 0.62, label: 'Moderate' },
    hard: { base: 0.46, label: 'Hard' },
    extreme: { base: 0.30, label: 'Extreme' }
  };

  D.GAME_DIFFICULTY = {
    ensign: { label: 'Ensign', desc: 'Forgiving. Enemies hit softer, checks are easier, the crisis comes later.', check: 0.08, enemyDmg: 0.75, enemyHp: 0.85, crisisRenown: 70, crisisDay: 120, eventChance: 0.30 },
    commander: { label: 'Commander', desc: 'The intended experience. Every choice has weight.', check: 0, enemyDmg: 1, enemyHp: 1, crisisRenown: 90, crisisDay: 100, eventChance: 0.36 },
    admiral: { label: 'Admiral', desc: 'Harsh. Hard hitting enemies, thin margins, an early crisis.', check: -0.07, enemyDmg: 1.25, enemyHp: 1.15, crisisRenown: 100, crisisDay: 85, eventChance: 0.42 }
  };

  // ---------------------------------------------------------------- factions
  D.VALUES = ['honor', 'profit', 'security', 'knowledge', 'autonomy', 'tradition'];
  D.VALUE_LABELS = { honor: 'Honour', profit: 'Profit', security: 'Security', knowledge: 'Knowledge', autonomy: 'Autonomy', tradition: 'Tradition' };
  D.VALUE_COLORS = { honor: '#cc6666', profit: '#ffcc66', security: '#ff9c00', knowledge: '#9999ff', autonomy: '#99ccff', tradition: '#cc99cc' };

  D.factions = {
    federation: {
      id: 'federation', name: 'United Federation of Planets', short: 'Federation', adj: 'Federation', plural: 'Federation starships',
      color: '#9999ff', major: true, leaderTitles: ['Captain', 'Commander'], leaders: ['Reyes', 'Okafor', 'Lindqvist', 'Tanaka', 'Novak', 'Brennan', 'Haddad', 'Sato', 'Mwangi', 'Castellan'],
      ship: 'starbase', portrait: 'portrait_admiral', values: { knowledge: 2, autonomy: 1, security: 1, profit: -1, honor: 1, tradition: 0 },
      aggression: 0, trades: true, bribable: false, cloak: false, startRel: [100, 100],
      hailFlavor: 'A fellow Starfleet crew answers with a friendly wave.'
    },
    klingon: {
      id: 'klingon', name: 'Klingon Empire', short: 'Klingon Empire', adj: 'Klingon', plural: 'Klingons',
      color: '#cc6666', major: true, leaderTitles: ['Captain', 'Commander'], leaders: ['Kargh', 'Vorok', 'Tagh', 'Kolvek', 'Mokra', 'Grevak', 'Torgath', "K'Tal", 'Drovak', 'Kesh'],
      ship: 'ship_klingon', portrait: 'portrait_klingon', values: { honor: 3, tradition: 2, security: 1, profit: -2, knowledge: -1, autonomy: 1 },
      aggression: 0.55, trades: false, bribable: false, cloak: false, startRel: [-15, 15],
      hailFlavor: 'A snarling face fills the viewscreen, lit red by battle-lamps.'
    },
    romulan: {
      id: 'romulan', name: 'Romulan Star Empire', short: 'Romulan Star Empire', adj: 'Romulan', plural: 'Romulans',
      color: '#66bb99', major: true, leaderTitles: ['Commander', 'Subcommander'], leaders: ['Tovan', 'Velar', "T'Seth", 'Rethan', 'Liviana', 'Varel', 'Nerev', 'Mhiessan', 'Sethra', 'Adrell'],
      ship: 'ship_romulan', portrait: 'portrait_romulan', values: { security: 3, autonomy: 2, knowledge: 1, honor: -1, tradition: 1, profit: 0 },
      aggression: 0.45, trades: false, bribable: false, cloak: true, startRel: [-35, -10],
      hailFlavor: 'The Romulan commander regards you with polite, bottomless suspicion.'
    },
    cardassian: {
      id: 'cardassian', name: 'Cardassian Union', short: 'Cardassian Union', adj: 'Cardassian', plural: 'Cardassians',
      color: '#c9a36b', major: true, leaderTitles: ['Gul', 'Glinn', 'Legate'], leaders: ['Jaret', 'Rodek', 'Setrin', 'Madral', 'Tovek', 'Dorval', 'Kasek', 'Ranek', 'Oset', 'Telal'],
      ship: 'ship_cardassian', portrait: 'portrait_cardassian', values: { security: 2, tradition: 2, profit: 1, autonomy: -1, honor: 0, knowledge: -1 },
      aggression: 0.5, trades: true, bribable: true, cloak: false, startRel: [-30, 0],
      hailFlavor: 'A Cardassian officer smiles thinly, as if you had already confessed to something.'
    },
    ferengi: {
      id: 'ferengi', name: 'Ferengi Alliance', short: 'Ferengi Alliance', adj: 'Ferengi', plural: 'Ferengi',
      color: '#ff9c00', major: true, leaderTitles: ['DaiMon'], leaders: ['Grel', 'Brok', 'Norg', 'Pek', 'Zobb', 'Kreel', 'Tarvok', 'Lurn', 'Gorm', 'Frin'],
      ship: 'ship_ferengi', portrait: 'portrait_ferengi', values: { profit: 3, security: 1, honor: -2, tradition: 0, knowledge: 0, autonomy: 1 },
      aggression: 0.2, trades: true, bribable: true, cloak: false, startRel: [-5, 15],
      hailFlavor: 'The DaiMon leans uncomfortably close to his screen, ears twitching.'
    },
    orion: {
      id: 'orion', name: 'Orion Syndicate', short: 'Orion Syndicate', adj: 'Orion', plural: 'Orion pirates',
      color: '#88c070', major: false, pirate: true, leaderTitles: ['Captain', 'Boss'], leaders: ['Vessa', 'Kaan', 'Ral Doran', 'Neela', 'Tharn', 'Soraya', 'Dezh', 'Mavrik'],
      ship: 'ship_orion', portrait: 'ship_orion', values: { profit: 3, autonomy: 2, tradition: -1, honor: -1, security: 0, knowledge: 0 },
      aggression: 0.8, trades: true, bribable: true, cloak: false, startRel: [-45, -30],
      hailFlavor: 'The pirate captain lounges in a battered command chair, weapons charged.'
    },
    borg: {
      id: 'borg', name: 'Borg Collective', short: 'Borg Collective', adj: 'Borg', plural: 'the Borg',
      color: '#66cc66', major: false, hidden: true, leaderTitles: ['Drone'], leaders: ['Three of Twelve', 'Nine of Sixteen', 'Two of Five'],
      ship: 'ship_cube', portrait: 'ship_cube', values: { honor: 0, profit: 0, security: 0, knowledge: 0, autonomy: 0, tradition: 0 },
      aggression: 1, trades: false, bribable: false, cloak: false, negotiable: false, startRel: [-100, -100],
      hailFlavor: 'WE ARE THE BORG. RESISTANCE IS FUTILE.'
    },
    ancient: {
      id: 'ancient', name: 'Unknown Origin', short: 'Unknown', adj: 'Alien', plural: 'unknown entities',
      color: '#cc99cc', major: false, hidden: true, leaderTitles: [''], leaders: ['—'],
      ship: 'doomsday', portrait: 'doomsday', values: { honor: 0, profit: 0, security: 0, knowledge: 0, autonomy: 0, tradition: 0 },
      aggression: 1, trades: false, bribable: false, cloak: false, negotiable: false, startRel: [-100, -100]
    }
  };
  // Factions that can own territory in a generated sector
  D.TERRITORY_FACTIONS = ['klingon', 'romulan', 'cardassian', 'ferengi'];

  // ------------------------------------------------------------ species gen
  D.speciesGen = {
    syllA: ['Vha', 'Kel', 'Ost', 'Tre', 'Mir', 'Zan', 'Qo', 'Eth', 'Suu', 'Lor', 'Bre', 'Ix', 'Nar', 'Oph', 'Dra', 'Cy', 'Hal', 'Pen', 'Rhu', 'Tal'],
    syllB: ['ssa', 'ren', 'tik', 'mar', 'oni', 'vel', 'dru', 'ai', 'khet', 'lis', 'phor', 'uun', 'zar', 'eth', 'ova', 'quin', 'thal', 'ari'],
    endA: ['i', 'an', 'ite', 'ar', 'ese', 'ori', 'ul'],
    looks: ['luminous, soft-voiced beings with branching head crests', 'broad reptilian people with ceremonial stone ornaments', 'tall, gaunt beings who speak through translator harmonics', 'small, quick avian people with iridescent plumage', 'silicon-based beings whose bodies shimmer like wet slate', 'amphibious people whose ships are flooded with warm brine', 'insectoid colonists who speak in overlapping chorus', 'serene humanoids with bioluminescent facial patterns'],
    shipWords: ['Skiff', 'Cruiser', 'Dreadnought'],
    portraits: ['portrait_alien1', 'portrait_alien2'],
    ships: ['ship_unknown']
  };

  // ---------------------------------------------------------------- player ships
  D.playerClasses = {
    intrepid: {
      id: 'intrepid', name: 'Intrepid-class', role: 'Explorer', color: '#9999ff',
      desc: 'Fast, agile science vessel. Best sensors in the fleet and bio-neural gel packs. Lighter hull.',
      hull: 100, shields: 90, reactor: 10, torpCap: 20, dilCap: 45, crew: 150, warp: 1.15, fuel: 0.9, evasion: 0.06,
      phaserDmg: 9, torpDmg: 22, sensorsMax: 5, bonus: { science: 1 }, registryPrefix: 'NCC-7'
    },
    galaxy: {
      id: 'galaxy', name: 'Galaxy-class', role: 'Flagship', color: '#ff9c00',
      desc: 'Large, tough and self-sufficient. Heavy shields, big crew, diplomatic facilities. Thirsty for dilithium.',
      hull: 140, shields: 120, reactor: 12, torpCap: 30, dilCap: 55, crew: 220, warp: 1.0, fuel: 1.1, evasion: 0,
      phaserDmg: 9, torpDmg: 22, sensorsMax: 4, bonus: { diplomacy: 1 }, registryPrefix: 'NCC-7'
    },
    defiant: {
      id: 'defiant', name: 'Defiant-class', role: 'Escort', color: '#cc6666',
      desc: 'A warship in all but name. Pulse phasers, ablative plating, tiny crew. Short range, few comforts.',
      hull: 110, shields: 100, reactor: 11, torpCap: 24, dilCap: 36, crew: 60, warp: 0.95, fuel: 1.0, evasion: 0.12,
      phaserDmg: 12, torpDmg: 24, sensorsMax: 4, bonus: { tactics: 1 }, registryPrefix: 'NX-7'
    }
  };
  D.SHIP_NAMES = ['Aurora', 'Resolute', 'Valiant', 'Endeavour', 'Horizon', 'Pathfinder', 'Meridian', 'Tenacity', 'Odyssey', 'Heron', 'Calypso', 'Serenity', 'Vigilant', 'Artemis', 'Kestrel', 'Sojourner', 'Farragut', 'Archimedes', 'Magellan', 'Zheng He', 'Ibn Battuta', 'Shackleton', 'Nightingale', 'Tereshkova'];

  // ---------------------------------------------------------------- enemy / NPC ships
  // tier: light | medium | heavy | boss. weapons: type beam (instant) or torpedo (projectile, dodgeable)
  D.ships = {
    bop: { faction: 'klingon', name: "B'rel-class Bird-of-Prey", tier: 'light', hull: 60, shields: 45, regen: 2.2, evasion: 0.22, weapons: [{ n: 'Disruptor cannons', type: 'beam', dmg: 7, cd: 2.6 }, { n: 'Photon torpedo', type: 'torpedo', dmg: 18, cd: 10 }], prefer: 'weapons', salvage: [2, 4] },
    ktinga: { faction: 'klingon', name: "K't'inga-class Battle Cruiser", tier: 'medium', hull: 120, shields: 80, regen: 2.5, evasion: 0.1, weapons: [{ n: 'Disruptor bank', type: 'beam', dmg: 9, cd: 3 }, { n: 'Disruptor bank', type: 'beam', dmg: 9, cd: 3.2 }, { n: 'Photon torpedo', type: 'torpedo', dmg: 22, cd: 9 }], prefer: 'weapons', salvage: [3, 6] },
    vorcha: { faction: 'klingon', name: "Vor'cha-class Attack Cruiser", tier: 'heavy', hull: 170, shields: 120, regen: 3, evasion: 0.08, weapons: [{ n: 'Heavy disruptor', type: 'beam', dmg: 11, cd: 2.8 }, { n: 'Disruptor bank', type: 'beam', dmg: 9, cd: 3 }, { n: 'Photon torpedo', type: 'torpedo', dmg: 26, cd: 8 }], prefer: 'weapons', salvage: [4, 8] },

    rom_scout: { faction: 'romulan', name: 'Romulan Scout', tier: 'light', hull: 45, shields: 60, regen: 3, evasion: 0.25, cloak: true, weapons: [{ n: 'Disruptor', type: 'beam', dmg: 6, cd: 2.4 }], prefer: 'sensors', salvage: [2, 4] },
    mogai: { faction: 'romulan', name: "Mogai-class Warbird", tier: 'medium', hull: 110, shields: 100, regen: 3.5, evasion: 0.12, cloak: true, weapons: [{ n: 'Disruptor array', type: 'beam', dmg: 9, cd: 3 }, { n: 'Disruptor array', type: 'beam', dmg: 9, cd: 3.3 }, { n: 'Plasma torpedo', type: 'torpedo', dmg: 24, cd: 10 }], prefer: 'shields', salvage: [3, 6] },
    dderidex: { faction: 'romulan', name: "D'deridex-class Warbird", tier: 'heavy', hull: 220, shields: 150, regen: 4, evasion: 0.05, cloak: true, weapons: [{ n: 'Disruptor array', type: 'beam', dmg: 12, cd: 3 }, { n: 'Disruptor array', type: 'beam', dmg: 12, cd: 3.2 }, { n: 'Plasma torpedo', type: 'torpedo', dmg: 30, cd: 9 }], prefer: 'shields', salvage: [5, 9] },

    hideki: { faction: 'cardassian', name: 'Hideki-class Patrol Ship', tier: 'light', hull: 50, shields: 40, regen: 2, evasion: 0.2, weapons: [{ n: 'Phaser emitter', type: 'beam', dmg: 6, cd: 2.2 }], prefer: 'hull', salvage: [2, 4] },
    galor: { faction: 'cardassian', name: 'Galor-class Warship', tier: 'medium', hull: 130, shields: 90, regen: 2.5, evasion: 0.08, weapons: [{ n: 'Spiral-wave disruptor', type: 'beam', dmg: 10, cd: 3 }, { n: 'Compressor beam', type: 'beam', dmg: 14, cd: 6 }], prefer: 'hull', salvage: [3, 6] },
    keldon: { faction: 'cardassian', name: 'Keldon-class Cruiser', tier: 'heavy', hull: 180, shields: 120, regen: 3, evasion: 0.06, weapons: [{ n: 'Spiral-wave disruptor', type: 'beam', dmg: 11, cd: 2.8 }, { n: 'Compressor beam', type: 'beam', dmg: 15, cd: 5.5 }, { n: 'Photon torpedo', type: 'torpedo', dmg: 24, cd: 9 }], prefer: 'hull', salvage: [4, 8] },

    fer_raider: { faction: 'ferengi', name: 'Ferengi Raider', tier: 'light', hull: 50, shields: 50, regen: 2.2, evasion: 0.2, weapons: [{ n: 'Plasma beam', type: 'beam', dmg: 6, cd: 2.5 }], prefer: 'engines', flee: 0.35, salvage: [2, 5] },
    dkora: { faction: 'ferengi', name: "D'Kora-class Marauder", tier: 'medium', hull: 120, shields: 90, regen: 2.6, evasion: 0.1, weapons: [{ n: 'Plasma beam', type: 'beam', dmg: 8, cd: 2.8 }, { n: 'Electromagnetic pulse', type: 'beam', dmg: 10, cd: 7, target: 'engines' }], prefer: 'engines', flee: 0.3, salvage: [4, 8] },
    dkora_refit: { faction: 'ferengi', name: "D'Kora Battle Refit", tier: 'heavy', hull: 150, shields: 110, regen: 3, evasion: 0.1, weapons: [{ n: 'Plasma beam', type: 'beam', dmg: 10, cd: 2.6 }, { n: 'Plasma beam', type: 'beam', dmg: 10, cd: 2.9 }, { n: 'Electromagnetic pulse', type: 'beam', dmg: 12, cd: 6, target: 'engines' }], prefer: 'engines', flee: 0.3, salvage: [5, 10] },

    orion_int: { faction: 'orion', name: 'Orion Interceptor', tier: 'light', hull: 45, shields: 35, regen: 1.8, evasion: 0.28, weapons: [{ n: 'Disruptor', type: 'beam', dmg: 6, cd: 2.2 }], prefer: 'engines', flee: 0.25, salvage: [2, 5] },
    orion_raider: { faction: 'orion', name: 'Orion Raider', tier: 'medium', hull: 90, shields: 60, regen: 2.2, evasion: 0.15, weapons: [{ n: 'Disruptor', type: 'beam', dmg: 8, cd: 2.6 }, { n: 'Photon torpedo', type: 'torpedo', dmg: 16, cd: 9 }], prefer: 'engines', flee: 0.2, salvage: [3, 6] },
    orion_corsair: { faction: 'orion', name: 'Orion Corsair', tier: 'heavy', hull: 140, shields: 90, regen: 2.6, evasion: 0.1, weapons: [{ n: 'Heavy disruptor', type: 'beam', dmg: 10, cd: 2.8 }, { n: 'Disruptor', type: 'beam', dmg: 8, cd: 2.4 }, { n: 'Photon torpedo', type: 'torpedo', dmg: 20, cd: 8 }], prefer: 'engines', flee: 0.15, salvage: [4, 8] },

    borg_probe: { faction: 'borg', name: 'Borg Probe', tier: 'heavy', hull: 220, shields: 120, regen: 4, evasion: 0.02, adaptive: true, hullRegen: 0.8, weapons: [{ n: 'Cutting beam', type: 'beam', dmg: 12, cd: 3 }, { n: 'Tractor beam', type: 'beam', dmg: 8, cd: 4, target: 'engines' }], prefer: 'shields', salvage: [6, 10] },
    borg_cube: { faction: 'borg', name: 'Borg Cube', tier: 'boss', hull: 700, shields: 300, regen: 6, evasion: 0, adaptive: true, hullRegen: 1.5, weapons: [{ n: 'Cutting beam', type: 'beam', dmg: 16, cd: 2.6 }, { n: 'Cutting beam', type: 'beam', dmg: 16, cd: 2.9 }, { n: 'Borg torpedo', type: 'torpedo', dmg: 30, cd: 8 }, { n: 'Tractor beam', type: 'beam', dmg: 6, cd: 5, target: 'engines' }], prefer: 'shields', salvage: [10, 20] },

    doomsday: { faction: 'ancient', name: 'Planet Killer', tier: 'boss', hull: 900, shields: 0, regen: 0, evasion: 0, armor: 0.8, weapons: [{ n: 'Antiproton beam', type: 'beam', dmg: 30, cd: 7 }], prefer: 'hull', salvage: [15, 25] },

    fed_miranda: { faction: 'federation', name: 'Miranda-class Frigate', tier: 'light', hull: 70, shields: 60, regen: 2, evasion: 0.1, weapons: [{ n: 'Phaser', type: 'beam', dmg: 7, cd: 2.8 }], prefer: 'hull' },
    fed_excelsior: { faction: 'federation', name: 'Excelsior-class Cruiser', tier: 'medium', hull: 120, shields: 100, regen: 2.8, evasion: 0.06, weapons: [{ n: 'Phaser array', type: 'beam', dmg: 9, cd: 2.8 }, { n: 'Photon torpedo', type: 'torpedo', dmg: 22, cd: 9 }], prefer: 'hull' },
    fed_nebula: { faction: 'federation', name: 'Nebula-class Cruiser', tier: 'heavy', hull: 150, shields: 120, regen: 3, evasion: 0.05, weapons: [{ n: 'Phaser array', type: 'beam', dmg: 10, cd: 2.8 }, { n: 'Photon torpedo', type: 'torpedo', dmg: 24, cd: 8 }], prefer: 'hull' },

    // generic templates for procedurally generated species (name filled at runtime)
    sp_light: { faction: '*species', name: 'Skiff', tier: 'light', hull: 55, shields: 50, regen: 2.4, evasion: 0.2, weapons: [{ n: 'Particle beam', type: 'beam', dmg: 7, cd: 2.6 }], prefer: 'hull', salvage: [2, 5] },
    sp_medium: { faction: '*species', name: 'Cruiser', tier: 'medium', hull: 110, shields: 90, regen: 2.8, evasion: 0.1, weapons: [{ n: 'Particle beam', type: 'beam', dmg: 9, cd: 2.8 }, { n: 'Energy torpedo', type: 'torpedo', dmg: 20, cd: 9 }], prefer: 'weapons', salvage: [3, 7] },
    sp_heavy: { faction: '*species', name: 'Dreadnought', tier: 'heavy', hull: 170, shields: 130, regen: 3.2, evasion: 0.06, weapons: [{ n: 'Heavy particle beam', type: 'beam', dmg: 11, cd: 2.8 }, { n: 'Energy torpedo', type: 'torpedo', dmg: 24, cd: 8 }], prefer: 'weapons', salvage: [5, 9] }
  };

  // ---------------------------------------------------------------- stars & planets
  D.stars = {
    O: { name: 'Class O blue giant', color: '#9bb0ff', r: 26, w: 1 },
    B: { name: 'Class B blue-white', color: '#aabfff', r: 23, w: 2 },
    A: { name: 'Class A white', color: '#dfe6ff', r: 20, w: 4 },
    F: { name: 'Class F yellow-white', color: '#fbf6e4', r: 18, w: 7 },
    G: { name: 'Class G yellow dwarf', color: '#ffe9a8', r: 17, w: 10 },
    K: { name: 'Class K orange dwarf', color: '#ffc27a', r: 15, w: 10 },
    M: { name: 'Class M red dwarf', color: '#ff9a6a', r: 12, w: 11 },
    WD: { name: 'White dwarf', color: '#e8f4ff', r: 8, w: 2 },
    NS: { name: 'Pulsar', color: '#b9e3ff', r: 7, w: 1, art: 'pulsar' },
    BH: { name: 'Black hole', color: '#ffb070', r: 10, w: 0.6, art: 'black_hole' }
  };
  D.planets = {
    M: { name: 'Class M', kind: 'Terrestrial', art: 'planet_m', colors: ['#2f6fb5', '#4f9150', '#e9f1ff'], habitable: true, life: { none: 1, microbial: 2, flora: 3, fauna: 4, sentient: 2 } },
    L: { name: 'Class L', kind: 'Marginal forest', art: 'planet_l', colors: ['#2f5a33', '#6a4f8a', '#cfe3c8'], habitable: true, life: { none: 1, microbial: 2, flora: 4, fauna: 3, sentient: 1 } },
    O: { name: 'Class O', kind: 'Pelagic ocean', art: 'planet_o', colors: ['#1b4f99', '#2c79c7', '#e3f0ff'], habitable: true, life: { none: 1, microbial: 3, flora: 2, fauna: 3, sentient: 1 } },
    H: { name: 'Class H', kind: 'Desert', art: 'planet_h', colors: ['#c98a4a', '#8a5a2e', '#f1d4a0'], habitable: false, life: { none: 4, microbial: 3, flora: 1, fauna: 1, sentient: 0.4 } },
    P: { name: 'Class P', kind: 'Glaciated', art: 'planet_p', colors: ['#cfe5f2', '#8fb9d8', '#ffffff'], habitable: false, life: { none: 5, microbial: 3, flora: 0.5, fauna: 0.5, sentient: 0.2 } },
    K: { name: 'Class K', kind: 'Adaptable barren', art: 'planet_k', colors: ['#8a7f73', '#5d544b', '#b8aea2'], habitable: false, life: { none: 8, microbial: 1 } },
    N: { name: 'Class N', kind: 'Volcanic', art: 'planet_n', colors: ['#2a1a14', '#ff6a1a', '#5a3020'], habitable: false, life: { none: 8, microbial: 1 } },
    Y: { name: 'Class Y', kind: 'Demon toxic', art: 'planet_y', colors: ['#b8b43a', '#6f7a2a', '#e4e08a'], habitable: false, life: { none: 7, microbial: 2 } },
    J: { name: 'Class J', kind: 'Gas giant', art: 'planet_j', colors: ['#d9b98a', '#a8703e', '#f2e2c4'], habitable: false, gas: true, life: { none: 9, microbial: 1 } }
  };
  D.LIFE_LABELS = { none: 'No lifesigns', microbial: 'Microbial life', flora: 'Plant life', fauna: 'Animal life', sentient: 'Sentient life', prewarp: 'Pre-warp civilisation', colony: 'Colony' };

  D.pois = {
    starbase: { name: 'Starbase', art: 'starbase', color: '#9999ff' },
    outpost: { name: 'Outpost', art: 'starbase', color: '#ffcc99' },
    trade: { name: 'Trading post', art: 'trade_station', color: '#ffcc66' },
    colony: { name: 'Colony', art: 'surface_colony', color: '#99cc99' },
    anomaly: { name: 'Spatial anomaly', art: 'rift', color: '#cc99cc' },
    derelict: { name: 'Derelict vessel', art: 'derelict', color: '#8a7a66' },
    asteroids: { name: 'Asteroid field', art: 'asteroids', color: '#b8a58a' },
    nebula: { name: 'Nebula', art: 'nebula', color: '#a57fd8' },
    megastructure: { name: 'Ancient megastructure', art: 'megastructure', color: '#ff9c00' },
    wormhole: { name: 'Wormhole', art: 'wormhole', color: '#99ccff' }
  };
  D.ANOMALY_KINDS = [
    { id: 'rift', name: 'Subspace rift', art: 'rift' },
    { id: 'ion', name: 'Ion storm front', art: 'ion_storm' },
    { id: 'entity', name: 'Crystalline energy signature', art: 'entity' },
    { id: 'wormhole', name: 'Unstable wormhole', art: 'wormhole' }
  ];

  // ---------------------------------------------------------------- names
  D.SYSTEM_NAMES = ['Kessara', 'Vendra', 'Oriam', 'Tessik', 'Halvor', 'Nadir', 'Corvan', 'Ishtara', 'Belloq', 'Sarpeid', 'Maraxis', 'Tyrel', 'Quellan', 'Vorath', 'Elysia', 'Dremor', 'Caldera', 'Aphelos', 'Kyrrian', 'Solace', 'Tamsin', 'Varrow', 'Zhemret', 'Obelus', 'Pellian', 'Ruumath', 'Sennet', 'Galtor', 'Hespera', 'Iolanthe', 'Jevra', 'Korvath', 'Lumen', 'Mireth', 'Nostra', 'Ostrava', 'Praxis', 'Quorra', 'Rhodan', 'Sabik', 'Teralis', 'Umbra', 'Vessel', 'Wennet', 'Xantis', 'Yridia', 'Zerith', 'Arcadia', 'Brisa', 'Cygna', 'Dalvek', 'Edris', 'Farros', 'Gethin', 'Havoc', 'Iskar', 'Jarro', 'Kaltos', 'Lirra', 'Moros', 'Nimbus', 'Ossian', 'Pyrrhus', 'Rellis', 'Straten', 'Talvan', 'Ulthar', 'Vireo', 'Wrenfall', 'Zanthe'];
  D.GREEK = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Sigma', 'Tau', 'Omicron'];
  D.SECTOR_NAMES = ['Kessari Expanse', 'Typhon Frontier', 'Beta Rennar Sector', 'Veridian Reach', 'Hollow Marches', 'Argolis Cluster', 'Shoals of Tessik', 'Draken Rift', 'Ember Reach', 'Calloran Verge'];
  D.CAPTAIN_NAMES = ['Elena Reyes', 'Marcus Okafor', 'Aiko Tanaka', 'Tomas Novak', 'Priya Raman', 'Daniel Brennan', 'Nadia Haddad', 'Samuel Mwangi', 'Ingrid Lindqvist', 'Rafael Castillo', 'Mei Lin', 'Kofi Mensah'];

  D.RANKS = ['Ensign', 'Lieutenant (j.g.)', 'Lieutenant', 'Lt. Commander', 'Commander'];
  D.RANK_SHORT = ['Ens.', 'Lt.(jg)', 'Lt.', 'Lt.Cmdr.', 'Cmdr.'];

  D.ROLES = [
    { id: 'xo', title: 'First Officer', skill: 'command', color: '#ff9c00' },
    { id: 'tac', title: 'Tactical Officer', skill: 'tactics', color: '#cc6666' },
    { id: 'eng', title: 'Chief Engineer', skill: 'engineering', color: '#ffcc66' },
    { id: 'sci', title: 'Science Officer', skill: 'science', color: '#9999ff' },
    { id: 'med', title: 'Chief Medical Officer', skill: 'medicine', color: '#99cc99' },
    { id: 'cns', title: 'Counselor', skill: 'diplomacy', color: '#99ccff' }
  ];

  D.SPECIES = {
    human: { name: 'Human', bonus: { command: 1 }, first: ['Elena', 'Marcus', 'Aiko', 'Tomas', 'Priya', 'Daniel', 'Nadia', 'Samuel', 'Ingrid', 'Kofi', 'Mei', 'Rafael', 'Hannah', 'Omar', 'Yusuf', 'Leah', 'Arjun', 'Sofia', 'Declan', 'Imani'], last: ['Reyes', 'Okafor', 'Lindqvist', 'Tanaka', 'Novak', 'Brennan', 'Castillo', 'Haddad', 'Sato', 'Vasquez', 'Mwangi', 'Park', 'Adeyemi', 'Kowalski', 'Moreau', 'Chen', 'Ferreira', 'Ivanova'] },
    vulcan: { name: 'Vulcan', bonus: { science: 1 }, trait: 'telepath', single: ["T'Vel", 'Sorek', "T'Mira", 'Sevek', 'Tuvan', 'Salok', "T'Sai", 'Venik', "T'Lara", 'Skon'] },
    andorian: { name: 'Andorian', bonus: { tactics: 1 }, first: ['Thyra', 'Vessik', 'Tarah', 'Keval', 'Jhamel', 'Sherav'], last: ["th'Zoarin", "sh'Vessa", "ch'Thane", "zh'Rell", "th'Kelas"] },
    bajoran: { name: 'Bajoran', bonus: { diplomacy: 1 }, first: ['Varis', 'Doran', 'Trenn', 'Jalis', 'Keela', 'Tolan'], last: ['Mira', 'Anara', 'Jorel', 'Leeta', 'Seran', 'Talis'], familyFirst: true },
    betazoid: { name: 'Betazoid', bonus: { diplomacy: 1 }, trait: 'empath', first: ['Selara', 'Andal', 'Kestra', 'Tevin', 'Lyra', 'Orem'], last: ['Vendaan', 'Ruvik', 'Tellos', 'Maelen', 'Iskar'] },
    trill: { name: 'Trill', bonus: { science: 1 }, trait: 'joined', first: ['Talen', 'Jeral', 'Nira', 'Osen', 'Verin', 'Kella'], last: ['Moxa', 'Vos', 'Tenn', 'Orell', 'Seza'] },
    tellarite: { name: 'Tellarite', bonus: { engineering: 1 }, single: ['Graak', 'Bolk', 'Thrag', 'Gorv', 'Brasht', 'Jhev'] },
    bolian: { name: 'Bolian', bonus: { medicine: 1 }, first: ['Brel', 'Sorv', 'Mirra', 'Gavo', 'Tessa'], last: ['Tarn', 'Ghin', 'Vodd', 'Lomm'] },
    denobulan: { name: 'Denobulan', bonus: { medicine: 1 }, single: ['Mirosh', 'Tavek', 'Feezal', 'Lorrik', 'Anzo', 'Pheet'] },
    caitian: { name: 'Caitian', bonus: { tactics: 1 }, single: ["R'Tahn", "S'Kaara", "M'Rell", "T'Reth", "K'Shara"] },
    klingon: { name: 'Klingon', bonus: { tactics: 1 }, trait: 'warrior', single: ['Torvek', "K'Rell", 'Mogath', "B'Vara", 'Kurzhan', "L'Kor"] }
  };
  D.TRAITS = {
    empath: { name: 'Empath', desc: 'Senses emotions. Reveals an envoy\'s values during negotiations.' },
    telepath: { name: 'Touch telepath', desc: 'Can attempt a mind-meld in some situations.' },
    joined: { name: 'Joined', desc: 'Lifetimes of memories. Gains experience 50% faster.' },
    warrior: { name: 'Warrior heritage', desc: 'Respected by Klingons. +5% tactics checks.' },
    brilliant: { name: 'Brilliant', desc: '+1 Science.', skill: 'science' },
    veteran: { name: 'Veteran', desc: '+1 Tactics.', skill: 'tactics' },
    diplomat: { name: 'Silver tongue', desc: '+1 Diplomacy.', skill: 'diplomacy' },
    miracle_worker: { name: 'Miracle worker', desc: '+1 Engineering. Faster damage control.', skill: 'engineering' },
    field_medic: { name: 'Field medic', desc: '+1 Medicine.', skill: 'medicine' },
    daredevil: { name: 'Daredevil', desc: '+1 Command.', skill: 'command' },
    lucky: { name: 'Lucky', desc: '+4% on every check they make.' }
  };
  D.GENERAL_TRAITS = ['brilliant', 'veteran', 'diplomat', 'miracle_worker', 'field_medic', 'daredevil', 'lucky'];

  // ---------------------------------------------------------------- refits (shop)
  D.refits = {
    phaser2: { name: 'Type-X Phaser Arrays', desc: '+25% phaser damage.', cost: 120 },
    quantum: { name: 'Quantum Torpedo Launcher', desc: '+40% torpedo damage.', cost: 150 },
    regen: { name: 'Regenerative Shield Grid', desc: '+35% shield regeneration.', cost: 110 },
    shields2: { name: 'Multiphasic Shield Emitters', desc: '+25 maximum shields.', cost: 120 },
    armor: { name: 'Ablative Hull Armour', desc: '+30 maximum hull.', cost: 130 },
    coils: { name: 'Improved Warp Coils', desc: '20% less dilithium per jump, 10% faster.', cost: 100 },
    sensors: { name: 'Tachyon Sensor Suite', desc: '+1 sensor power cap, better accuracy, reveals cloaked ships.', cost: 120 },
    reactor: { name: 'Warp Core Upgrade', desc: '+2 reactor power.', cost: 160 },
    magazine: { name: 'Expanded Torpedo Magazine', desc: '+10 torpedo capacity.', cost: 70 },
    tanks: { name: 'Dilithium Storage Expansion', desc: '+15 dilithium capacity.', cost: 70 },
    dc: { name: 'Damage Control Teams', desc: 'A second repair team in combat, +25% repair speed.', cost: 90 }
  };

  // ---------------------------------------------------------------- items (cargo)
  D.items = {
    medical_supplies: { name: 'Medical supplies', desc: 'Crates of vaccines and surgical kits.' },
    ambassador: { name: 'Ambassador aboard', desc: 'A diplomat and their staff in guest quarters.' },
    data_core: { name: 'Recovered data core', desc: 'A salvaged computer core, heavily encrypted.' },
    artifact: { name: 'Alien artifact', desc: 'An object of unknown origin and purpose.' },
    cure_sample: { name: 'Biological sample', desc: 'A rare compound for synthesising a cure.' },
    trade_goods: { name: 'Sealed cargo', desc: 'Sealed containers. The manifest is vague.' },
    refugees: { name: 'Refugees aboard', desc: 'Displaced civilians in the cargo bays.' },
    prisoner: { name: 'Prisoner in the brig', desc: 'A captive under guard.' },
    borg_node: { name: 'Borg interlink node', desc: 'Salvaged Borg technology. Handle with care.' },
    tachyon_data: { name: 'Tachyon trace data', desc: 'Sensor logs of a cloaked vessel\'s wake.' },
    probe_logs: { name: 'Probe telemetry', desc: 'Survey data from a deep-space probe.' },
    spare_core: { name: 'Salvaged warp core', desc: 'A dangerous but powerful energy source.' }
  };

  // ---------------------------------------------------------------- trade
  D.prices = { dilithium: 7, torpedoes: 12, spares: 9 };

  // ---------------------------------------------------------------- negotiation
  D.approaches = [
    { id: 'honour', label: 'Invoke the honour of their people', v: { honor: 2 }, skill: 'diplomacy' },
    { id: 'science', label: 'Offer to share scientific data', v: { knowledge: 2, security: -1 }, skill: 'science' },
    { id: 'trade', label: 'Propose a trade agreement', v: { profit: 2 }, skill: 'diplomacy' },
    { id: 'gift', label: 'Present a gift of latinum', v: { profit: 3 }, skill: 'diplomacy', cost: { latinum: 25 } },
    { id: 'border', label: 'Guarantee mutual border security', v: { security: 2 }, skill: 'command' },
    { id: 'sovereign', label: 'Affirm their sovereignty', v: { autonomy: 2 }, skill: 'diplomacy' },
    { id: 'customs', label: 'Honour their customs and rituals', v: { tradition: 2 }, skill: 'diplomacy' },
    { id: 'firm', label: 'Stand firm and show strength', v: { honor: 1, security: 1, autonomy: -1 }, skill: 'command' },
    { id: 'logic', label: 'Appeal to logic and shared interest', v: { knowledge: 1, security: 1 }, skill: 'science' },
    { id: 'medtech', label: 'Share Federation medical technology', v: { knowledge: 1, profit: 1 }, skill: 'medicine', cost: { spares: 1 } },
    { id: 'alliance', label: 'Offer joint patrols against pirates', v: { security: 2, honor: 1 }, skill: 'tactics' },
    { id: 'noninterf', label: 'Promise non-interference in their affairs', v: { autonomy: 2, tradition: 1, knowledge: -1 }, skill: 'diplomacy' },
    { id: 'dilithium', label: 'Offer a shipment of dilithium', v: { profit: 2, security: 1 }, skill: 'diplomacy', cost: { dilithium: 5 } },
    { id: 'toast', label: 'Share a ceremonial drink and stories', v: { tradition: 1, honor: 1 }, skill: 'diplomacy' },
    { id: 'history', label: 'Cite the history between your peoples', v: { tradition: 2, knowledge: 1 }, skill: 'command' },
    { id: 'concede', label: 'Make a concession on shipping lanes', v: { profit: 1, security: 1, autonomy: 1 }, skill: 'command', cost: { renown: 2 } }
  ];
  D.concerns = {
    honor: ['"Words cost nothing, Captain. Where is your courage?"', '"You speak of peace like a merchant. Do you not know the value of honour?"', '"My warriors ask whether your people can be trusted to stand and fight."'],
    profit: ['"And what, precisely, do we gain from all this?"', '"Friendship is lovely. Latinum is better."', '"My backers expect a return on this conversation."'],
    security: ['"Your ships have been sighted far too close to our borders."', '"How do we know this is not a prelude to invasion?"', '"Our people will not be left vulnerable by some treaty."'],
    knowledge: ['"We seek understanding before we commit to anything."', '"Your technology interests us. Your intentions interest us more."', '"Tell us what you have learned out here. Hold nothing back."'],
    autonomy: ['"We will not be absorbed into your Federation."', '"Our decisions are our own. Remember that."', '"Too many empires have tried to tell us how to live."'],
    tradition: ['"Our ancestors\' ways are not to be brushed aside."', '"There are forms to observe, Captain. Rituals matter."', '"You have not even asked about our customs."']
  };
  D.reactions = {
    good: ['nods slowly, visibly pleased.', 'leans forward with new interest.', 'exchanges an approving look with an aide.', 'allows a rare smile.'],
    bad: ['stiffens. The room goes quiet.', 'narrows their eyes.', 'mutters something the translator declines to render.', 'glances pointedly at the exit.'],
    flat: ['listens without expression.', 'waits for you to continue.', 'makes a note and says nothing.']
  };
})(typeof window !== 'undefined' ? window : globalThis);
