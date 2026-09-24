/* Events on arrival in a system ("arrival"), when investigating anomalies
   and wonders ("anomaly"), and when boarding derelicts ("derelict"). */

// ------------------------------------------------------------------ arrival
ST.content.register({
  kind: 'event', id: 'colony_plea', context: 'arrival', weight: 3, title: 'A call for help', start: 'a',
  requires: { locationHas: 'colony' },
  slots: { who: { type: 'name', species: 'human' } },
  nodes: {
    a: {
      type: 'scene', image: 'surface_colony', speaker: 'Administrator {who}',
      text: '"Starfleet! Thank goodness. Our fusion plant is failing and the backup won\'t hold through the winter. We have children here, Captain. Anything you can spare."',
      choices: [
        { label: 'Send an engineering team down to fix the plant', check: { skill: 'engineering', difficulty: 'moderate' }, success: 'fixed', failure: 'partial' },
        { label: 'Donate spare parts so they can repair it themselves', cost: { spares: 3 }, effects: { renown: 3 }, next: 'donated' },
        { label: '"I\'m sorry. We\'re on urgent business."', effects: { morale: -3 }, next: 'no' }
      ]
    },
    fixed: { type: 'end', text: 'Your engineers have the plant running in hours, better than new. The colonists throw an impromptu festival, and the crew is not allowed to leave hungry.', effects: { renown: 4, morale: 6, time: 0.5, xp: 10 } },
    partial: { type: 'end', text: 'The damage is worse than it looked. You get them through the winter, but it costs you parts and a day.', effects: { renown: 2, spares: -2, time: 1 } },
    donated: { type: 'end', text: 'The parts are beamed down with a technical manual. {who} promises to name something after the ship.' },
    no: { type: 'end', text: 'You promise to report their situation to Starfleet. It does not feel like enough.' }
  }
});

ST.content.register({
  kind: 'event', id: 'claim_jumpers', context: 'arrival', weight: 2, title: 'Claim jumpers', start: 'a',
  requires: { locationHas: 'dilithium', locationFaction: 'none' },
  slots: { boss: { type: 'faction', oneOf: ['orion'] } },
  nodes: {
    a: {
      type: 'scene', image: 'ship_orion', speaker: '{boss.leader}',
      text: 'An Orion mining crew is stripping dilithium from a moon in this system with slave labour. Their overseer hails you, all smiles. "Nothing to see here, Starfleet. Private operation. Move along."',
      choices: [
        { label: 'Scan the mine for lifesigns', check: { skill: 'science', difficulty: 'easy' }, success: 'slaves', failure: 'nothing' },
        { label: 'Move along', next: 'leave' }
      ]
    },
    slaves: {
      type: 'scene', image: 'ship_orion',
      text: 'Forty-three lifesigns in the mine shafts, most of them bound by neural restraints. The overseer\'s smile slips.',
      choices: [
        { label: 'Demand they free the workers', check: { skill: 'command', difficulty: 'moderate' }, success: 'freed', failure: 'fight' },
        { label: 'Beam the workers out under their noses', check: { skill: 'engineering', difficulty: 'hard' }, success: 'rescued', failure: 'fight' },
        { label: 'Open fire on the overseer\'s ship', next: 'fight' }
      ]
    },
    freed: { type: 'end', text: 'Outgunned and out of excuses, the Orions release the workers and flee. The miners are taken to safety, and their testimony will put an Orion boss out of business.', effects: { renown: 6, relation: { orion: -5 }, xp: 10 } },
    rescued: { type: 'end', text: 'Forty-three people appear in your transporter rooms at once. The Orion ship leaves in a rage before anyone thinks to fire.', effects: { renown: 7, morale: 6, relation: { orion: -5 } } },
    fight: { type: 'combat', enemies: [{ faction: 'orion', ship: 'medium' }], win: 'won', flee: 'fled', text: 'The Orion ship powers weapons.' },
    won: { type: 'end', text: 'With their ship crippled, the Orions surrender the mine. The workers are freed.', effects: { renown: 6, dilithium: 4 } },
    fled: { type: 'end', text: 'You withdraw. The mine will keep operating. It stays with you.', effects: { morale: -6 } },
    nothing: { type: 'end', text: 'Their shielding hides whatever is down there. You log a report and move on.' },
    leave: { type: 'end', text: 'You leave them to it. {officer.xo} says nothing, pointedly.', effects: { morale: -2 } }
  }
});

ST.content.register({
  kind: 'event', id: 'warning_buoy', context: 'arrival', weight: 1.5, title: 'Warning buoy', start: 'a',
  nodes: {
    a: {
      type: 'scene', image: 'megastructure',
      text: 'An ancient buoy hangs at the edge of the system, broadcasting in a language nobody has spoken for ten thousand years. The universal translator manages one word: *turn back.*',
      choices: [
        { label: 'Decode the full message', check: { skill: 'science', difficulty: 'hard' }, success: 'decoded', failure: 'garbled' },
        { label: 'Bring the buoy aboard for study', check: { skill: 'engineering', difficulty: 'moderate' }, success: 'aboard', failure: 'zap' },
        { label: 'Heed the warning and stay alert', next: 'alert' }
      ]
    },
    decoded: { type: 'end', text: 'It is a memorial, not a threat. A species once lived here, and they wanted to be remembered. You record their names, all four thousand of them.', effects: { renown: 5, xp: 15 } },
    garbled: { type: 'end', text: 'Despite hours of work, the rest stays a mystery.', effects: { time: 0.5 } },
    aboard: { type: 'end', text: 'The buoy\'s power cell is a marvel. The science labs are thrilled.', effects: { renown: 3, spares: 2 } },
    zap: { type: 'end', text: 'The buoy defends itself with a discharge that knocks out half the cargo bay.', effects: { hull: -6, damage: { system: 'sensors', amount: 20 } } },
    alert: { type: 'end', text: 'You go to yellow alert for a few hours. Nothing happens. Probably.' }
  }
});

ST.content.register({
  kind: 'event', id: 'stranded_shuttle', context: 'arrival', weight: 2, title: 'Stranded shuttle', start: 'a',
  slots: { who: { type: 'name' } },
  nodes: {
    a: {
      type: 'scene', image: '@location',
      text: 'A civilian shuttle sits dead in space near the system\'s edge. Its pilot, {who}, is out of fuel and out of patience.',
      choices: [
        { label: 'Transfer some dilithium', cost: { dilithium: 2 }, effects: { renown: 2 }, next: 'fuel' },
        { label: 'Tow them to the nearest planet', effects: { time: 0.5, renown: 1 }, next: 'tow' },
        { label: 'Fix their engine instead', check: { skill: 'engineering', difficulty: 'easy' }, success: 'fixed', failure: 'tow' }
      ]
    },
    fuel: { type: 'end', text: '{who} thanks you and heads off.' },
    tow: { type: 'end', text: 'You tow the shuttle to safety. {who} insists on buying the crew a round next time they are in port.' },
    fixed: { type: 'end', text: 'A clogged injector. Five minutes of work, and {who} is on their way, telling everyone about the helpful Starfleet ship.', effects: { renown: 2, xp: 5 } }
  }
});

ST.content.register({
  kind: 'event', id: 'sensor_ghost', context: 'arrival', weight: 1.5, title: 'Sensor ghost', start: 'a',
  nodes: {
    a: {
      type: 'scene', image: '@location',
      text: 'Something flickers on long-range sensors: a vessel-sized shadow, there and gone. {officer.science} cannot say whether it is a cloaked ship, a sensor echo or a trick of the local star.',
      choices: [
        { label: 'Run a tachyon sweep', check: { skill: 'science', difficulty: 'moderate' }, success: 'found', failure: 'gone' },
        { label: 'Raise shields and wait', effects: { time: 0.25 }, next: 'gone' }
      ]
    },
    found: { type: 'end', text: 'The sweep catches a cloaked ship\'s wake heading out of the system. Whoever it was, they know you are watching now. The sensor data is logged.', effects: { renown: 2, xp: 8 } },
    gone: { type: 'end', text: 'The shadow does not return. The night shift will be telling ghost stories about it for weeks.' }
  }
});

ST.content.register({
  kind: 'event', id: 'trade_convoy', context: 'arrival', weight: 1.5, title: 'Merchant convoy', start: 'a',
  requires: { relationAtLeast: { ferengi: -20 } },
  slots: { f: { type: 'faction', oneOf: ['ferengi'], present: false } },
  nodes: {
    a: {
      type: 'scene', image: 'ship_ferengi', speaker: '{f.leader}',
      text: 'A small Ferengi convoy is resting here between markets. "Starfleet! Customers! Come, come. Our prices are the fairest in the sector. According to us."',
      choices: [
        { label: 'See what they have', effects: { openTrade: true }, next: 'trade' },
        { label: 'Ask about rumours for sale', cost: { latinum: 10 }, next: 'rumour' },
        { label: 'Decline', next: 'no' }
      ]
    },
    trade: { type: 'end', text: '"Excellent!"' },
    rumour: { type: 'end', text: 'For ten bars of latinum you learn the layout of the nearby lanes, which is almost worth it.', effects: { reveal: 'nearby' } },
    no: { type: 'end', text: 'The convoy loses interest.' }
  }
});

ST.content.register({
  kind: 'event', id: 'miners_accident', context: 'arrival', weight: 1.5, title: 'Mining accident', start: 'a',
  requires: { locationHas: 'asteroids' },
  slots: { n: { type: 'number', min: 4, max: 12 } },
  nodes: {
    a: {
      type: 'scene', image: 'asteroids',
      text: 'An independent mining barge has been holed by a collapsing asteroid. {n} miners are trapped in a pressurised section that is losing air fast.',
      choices: [
        { label: 'Beam them out through the interference', check: { skill: 'engineering', difficulty: 'hard' }, success: 'saved', failure: 'some' },
        { label: 'Send a shuttle into the debris field', check: { skill: 'command', difficulty: 'moderate' }, success: 'saved', failure: 'some' }
      ]
    },
    saved: { type: 'end', text: 'All {n} miners are aboard. The barge\'s owners send a thank-you, with a crate of refined ore.', effects: { renown: 4, spares: 2, dilithium: 2 } },
    some: { type: 'end', text: 'You save most of them. Not all.', effects: { renown: 1, morale: -4, injure: { who: 'random', severity: 'injured' } } }
  }
});

// ------------------------------------------------------------------ anomalies
ST.content.register({
  kind: 'event', id: 'anomaly_rift', context: 'anomaly', weight: 3, title: 'Subspace rift', start: 'a',
  requires: { poi: { type: 'anomaly', kind: 'rift' } },
  nodes: {
    a: {
      type: 'scene', image: 'rift',
      text: 'The rift is a wound in space, a thin seam of light that bends the stars around it. Something is leaking through: exotic particles that should not exist in this universe.',
      choices: [
        { label: 'Launch a probe into the rift', check: { skill: 'science', difficulty: 'moderate' }, success: 'probe_ok', failure: 'probe_lost' },
        { label: 'Try to seal it with a modulated deflector pulse', check: { skill: 'engineering', difficulty: 'hard' }, success: 'sealed', failure: 'backlash' },
        { label: 'Take readings from a safe distance', effects: { time: 0.25 }, next: 'safe' }
      ]
    },
    probe_ok: { type: 'end', text: 'The probe transmits for eleven seconds from somewhere that is not quite here. The data will keep theoretical physicists busy for a decade.', effects: { renown: 6, xp: 15 } },
    probe_lost: { type: 'end', text: 'The probe vanishes without a trace. Then, an hour later, it reappears in shuttle bay two, covered in frost. Nobody can explain it.', effects: { renown: 2 } },
    sealed: { type: 'end', text: 'The deflector pulse knits the seam shut. Space settles. Starfleet commends you for removing a navigational hazard.', effects: { renown: 7, dilithium: -2, xp: 15 } },
    backlash: { type: 'end', text: 'The rift pushes back. Energy surges through the deflector and into half the ship.', effects: { hull: -10, damage: { system: 'shields', amount: 35 }, injure: { who: 'engineering', severity: 'injured' } } },
    safe: { type: 'end', text: 'The readings are interesting, if unspectacular.', effects: { renown: 1 } }
  }
});

ST.content.register({
  kind: 'event', id: 'anomaly_ion', context: 'anomaly', weight: 3, title: 'Ion storm front', start: 'a',
  requires: { poi: { type: 'anomaly', kind: 'ion' } },
  nodes: {
    a: {
      type: 'scene', image: 'ion_storm',
      text: 'A permanent ion storm churns at the edge of the system, and something metallic glints inside it. A ship, or what is left of one.',
      choices: [
        { label: 'Fly in and investigate', check: { skill: 'command', difficulty: 'moderate' }, success: 'inside', failure: 'battered' },
        { label: 'Harvest the storm\'s energy with the Bussard collectors', check: { skill: 'engineering', difficulty: 'moderate' }, success: 'harvest', failure: 'battered' }
      ]
    },
    inside: { type: 'end', text: 'Inside the storm is an old freighter, crew long gone, cargo intact. You salvage what you can.', effects: { spares: 4, latinum: 30, torpedoes: 2 } },
    harvest: { type: 'end', text: 'The collectors drink in the storm. Your reserves climb.', effects: { dilithium: 6 } },
    battered: { type: 'end', text: 'The storm is stronger than it looked. You pull out battered and empty-handed.', effects: { hull: -10, shields: -40 } }
  }
});

ST.content.register({
  kind: 'event', id: 'anomaly_entity', context: 'anomaly', weight: 3, title: 'Crystalline entity', start: 'a',
  requires: { poi: { type: 'anomaly', kind: 'entity' } },
  nodes: {
    a: {
      type: 'scene', image: 'entity',
      text: 'The signature resolves into a vast lattice of crystal, kilometres across, drifting between the planets. It is alive. It is feeding on the system\'s moons, and it has noticed you.',
      choices: [
        { label: 'Attempt communication with graviton pulses', check: { skill: 'science', difficulty: 'hard' }, success: 'talk', failure: 'attack' },
        { label: 'Withdraw immediately', check: { skill: 'command', difficulty: 'easy' }, success: 'leave', failure: 'attack' },
        { label: 'Fire a full spread of torpedoes', cost: { torpedoes: 4 }, next: 'shatter' }
      ]
    },
    talk: { type: 'end', text: 'The entity pauses. The pulses echo back, changed, almost like a question. Then it turns away from the inhabited worlds and drifts into deep space. You may have just averted a catastrophe.', effects: { renown: 9, xp: 20 } },
    leave: { type: 'end', text: 'You back away and warn the region. It is the prudent choice.', effects: { renown: 1 } },
    attack: { type: 'end', text: 'A beam of pure energy lances out from the lattice and rakes the hull. You barely get away.', effects: { hull: -20, shields: -50, crew: -3, damage: { system: 'random', amount: 30 } } },
    shatter: { type: 'end', text: 'The torpedoes find a resonance point. The entity shatters into a billion glittering shards. Starfleet is relieved. Some of your crew are not.', effects: { renown: 4, morale: -5 } }
  }
});

ST.content.register({
  kind: 'event', id: 'anomaly_wormhole', context: 'anomaly', weight: 3, title: 'Wormhole', start: 'a',
  requires: { any: [{ poi: { type: 'wormhole' } }, { poi: { type: 'anomaly', kind: 'wormhole' } }] },
  nodes: {
    a: {
      type: 'scene', image: 'wormhole',
      text: 'A wormhole, flickering and unstable. It opens and closes in a slow rhythm, like breathing. Sensors cannot tell where it leads.',
      choices: [
        { label: 'Send a probe through', check: { skill: 'science', difficulty: 'moderate' }, success: 'probe', failure: 'nothing' },
        { label: 'Take the ship through', check: { skill: 'command', difficulty: 'hard' }, success: 'through', failure: 'spat' }
      ]
    },
    probe: { type: 'end', text: 'The probe emerges in a distant part of the sector and maps the systems around it before the link closes.', effects: { reveal: 'nearby', renown: 4 } },
    nothing: { type: 'end', text: 'The wormhole closes on the probe. It never comes back.', effects: { renown: 1 } },
    through: { type: 'end', text: 'A stomach-turning lurch, a blaze of colour, and you are through. You chart the far side, then come back before the link closes. The crew will never forget it.', effects: { renown: 8, morale: 8, reveal: 'nearby', xp: 15 } },
    spat: { type: 'end', text: 'The wormhole collapses halfway through and throws the ship back out, tumbling.', effects: { hull: -15, damage: { system: 'engines', amount: 30 }, injure: { who: 'random', severity: 'injured' } } }
  }
});

ST.content.register({
  kind: 'event', id: 'megastructure', context: 'anomaly', weight: 3, title: 'The shell', start: 'a',
  requires: { poi: { type: 'megastructure' } },
  nodes: {
    a: {
      type: 'scene', image: 'megastructure',
      text: 'A partial shell of hexagonal plates, each larger than a continent, encloses the star. Most of it is dark and broken. Near the equator, one section still glows with internal light.',
      choices: [
        { label: 'Send an away team into the lit section', next: 'team' },
        { label: 'Survey it from orbit', check: { skill: 'science', difficulty: 'moderate' }, success: 'survey', failure: 'survey_poor' }
      ]
    },
    team: { type: 'away_team', text: 'The lit section has breathable air and gravity. Assemble a team.', size: [2, 3], recommend: ['science', 'engineering'], next: 'inside' },
    inside: {
      type: 'scene', image: 'surface_ruins',
      text: 'Endless corridors, built for beings three times human height. At the heart of the section, a control room still hums with power. Glyphs crawl across a wall-sized display.',
      choices: [
        { label: 'Interface with the control room', check: { skill: 'engineering', difficulty: 'hard', team: 'away' }, success: 'power', failure: 'defence' },
        { label: 'Record the glyphs and leave everything untouched', check: { skill: 'science', difficulty: 'moderate', team: 'away' }, success: 'glyphs', failure: 'glyphs_poor' }
      ]
    },
    power: { type: 'end', text: 'The system recognises you as visitors and offers a gift: a storage cell of pure energy, and a map of the local lanes as they were a million years ago.', effects: { dilithium: 12, reveal: 'nearby', renown: 10, xp: 20 } },
    defence: { type: 'end', text: 'An automated defence system activates. The team beams out under fire.', effects: { injure: { who: 'away', severity: 'critical' }, renown: 3 } },
    glyphs: { type: 'end', text: 'The recordings will keep linguists busy for a century. It is the discovery of a lifetime.', effects: { renown: 9, xp: 15 } },
    glyphs_poor: { type: 'end', text: 'The recordings are fragmentary but still remarkable.', effects: { renown: 4 } },
    survey: { type: 'end', text: 'Your survey reveals the structure\'s original purpose: a vast solar collector, powering a civilisation long since gone.', effects: { renown: 6 } },
    survey_poor: { type: 'end', text: 'The structure\'s hull scatters your sensors. You learn little.', effects: { renown: 2 } }
  }
});

// ------------------------------------------------------------------ derelicts
ST.content.register({
  kind: 'event', id: 'ghost_ship', context: 'derelict', weight: 3, title: 'Ghost ship', start: 'a',
  nodes: {
    a: {
      type: 'scene', image: 'derelict',
      text: 'The derelict is an old warship of unknown design, cold and dark. Its hull is scored by weapons fire. Internal sensors are blocked, but emergency power is still flickering.',
      choices: [
        { label: 'Send an away team', next: 'team' },
        { label: 'Tractor it and strip the hull for parts', check: { skill: 'engineering', difficulty: 'easy' }, success: 'strip', failure: 'strip_bad' }
      ]
    },
    team: { type: 'away_team', text: 'The air aboard is thin and cold. Environment suits recommended.', size: [2, 3], recommend: ['engineering', 'tactics', 'science'], next: 'inside' },
    inside: {
      type: 'scene', image: 'derelict',
      text: 'The corridors are empty. No bodies, no signs of a struggle. On the bridge, the captain\'s chair faces a dead viewscreen. The computer core is intact. So is an automated security system, which has just woken up.',
      choices: [
        { label: 'Shut down the security system', check: { skill: 'engineering', difficulty: 'moderate', team: 'away' }, success: 'core', failure: 'shot' },
        { label: 'Fight your way to the core', check: { skill: 'tactics', difficulty: 'moderate', team: 'away' }, success: 'core', failure: 'shot' },
        { label: 'Grab what you can and beam out', effects: { spares: 2 }, next: 'out' }
      ]
    },
    core: {
      type: 'scene', image: 'derelict',
      text: 'The core yields the ship\'s final log. The crew abandoned ship after something followed them out of a nebula, something they refused to name. The log ends mid-sentence.',
      choices: [
        { label: 'Download everything', effects: { renown: 4, xp: 12 }, next: 'loot' },
        { label: 'Also salvage the ship\'s torpedo magazine', check: { skill: 'engineering', difficulty: 'moderate', team: 'away' }, success: 'torps', failure: 'loot' }
      ]
    },
    loot: { type: 'end', text: 'You return with the logs and a haul of spare parts.', effects: { spares: 3 } },
    torps: { type: 'end', text: 'The warheads are compatible with your launchers, with a little work.', effects: { spares: 3, torpedoes: 5 } },
    shot: { type: 'end', text: 'A security turret opens fire. The team gets out, but not unhurt.', effects: { injure: { who: 'away', severity: 'injured' }, crew: -1 } },
    out: { type: 'end', text: 'You beam out with an armful of salvage.' },
    strip: { type: 'end', text: 'The hull plating and power couplings are excellent. Your stores fill up.', effects: { spares: 5, time: 0.5 } },
    strip_bad: { type: 'end', text: 'An old plasma conduit ruptures as you cut into it. You get some salvage anyway.', effects: { spares: 2, hull: -5 } }
  }
});

ST.content.register({
  kind: 'event', id: 'plague_ship', context: 'derelict', weight: 2, title: 'Silent ship', start: 'a',
  nodes: {
    a: {
      type: 'scene', image: 'derelict',
      text: 'A civilian transport, adrift. Two hundred bodies aboard. {officer.medicine} finds the cause on the first scan: an engineered pathogen, still active.',
      choices: [
        { label: 'Study the pathogen under strict quarantine', check: { skill: 'medicine', difficulty: 'hard' }, success: 'cure', failure: 'exposed' },
        { label: 'Destroy the ship to stop the pathogen spreading', effects: { torpedoes: -1 }, next: 'destroy' },
        { label: 'Search the ship\'s logs for who did this', check: { skill: 'science', difficulty: 'moderate' }, success: 'logs', failure: 'destroy' }
      ]
    },
    cure: { type: 'end', text: 'Your medical team synthesises a vaccine. Starfleet Medical distributes it across the sector. Somewhere, a weapon has just been made useless.', effects: { renown: 8, xp: 20 } },
    exposed: { type: 'end', text: 'The quarantine fails. A medic is infected before the pathogen is contained.', effects: { injure: { who: 'medicine', severity: 'critical' }, morale: -6 } },
    destroy: { type: 'end', text: 'The transport vanishes in a ball of fire. It is the only safe thing to do.', effects: { morale: -2 } },
    logs: { type: 'end', text: 'The logs point to an Orion smuggling ring that sold the pathogen as "medical supplies". The evidence goes to Starfleet Security.', effects: { renown: 5, relation: { orion: -5 } } }
  }
});

ST.content.register({
  kind: 'event', id: 'salvage_claim', context: 'derelict', weight: 2, title: 'Salvage rights', start: 'a',
  slots: { f: { type: 'faction', oneOf: ['ferengi'], present: false } },
  nodes: {
    a: {
      type: 'scene', image: 'portrait_ferengi', speaker: '{f.leader}',
      text: 'As you approach the derelict, a Ferengi marauder decloaks. Well, powers up; Ferengi do not have cloaks. "That salvage is mine! I saw it first! Rule of Acquisition number nine: opportunity plus instinct equals profit!"',
      choices: [
        { label: 'Let him have it', effects: { relation: { f: 4 } }, next: 'let' },
        { label: 'Split the salvage fifty-fifty', check: { skill: 'diplomacy', difficulty: 'moderate' }, success: 'split', failure: 'grab' },
        { label: '"Federation salvage law says otherwise."', check: { skill: 'command', difficulty: 'moderate' }, success: 'ours', failure: 'grab' }
      ]
    },
    let: { type: 'end', text: 'The DaiMon is so surprised he throws in a small gift.', effects: { latinum: 15 } },
    split: { type: 'end', text: 'A deal. The Ferengi get the cargo, you get the useful technology.', effects: { spares: 4, relation: { f: 2 } } },
    ours: { type: 'end', text: 'He backs down, muttering about lawyers. The derelict is yours.', effects: { spares: 5, torpedoes: 2, relation: { f: -3 } } },
    grab: { type: 'end', text: 'While you argue, his crew strips the derelict bare and warps away laughing.', effects: { relation: { f: -2 } } }
  }
});
