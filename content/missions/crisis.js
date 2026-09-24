/* Sector crises: the campaign finale. One is chosen at random when your
   renown is high enough (or time runs out). Success wins the game; failure
   or letting the deadline pass ends it. Set crisis: true and category "crisis". */

ST.content.register({
  kind: 'mission', id: 'crisis_borg', category: 'crisis', crisis: true,
  title: 'The Collective',
  briefing: 'A Borg cube has crossed into the {sector}. The colony at {colony} has gone silent. Starfleet\'s nearest fleet is weeks away. You are all the sector has.',
  slots: {
    colony: { type: 'system', minJumps: 1, maxJumps: 5, has: 'colony|habitable' },
    wreck: { type: 'system', minJumps: 1, maxJumps: 6 },
    front: { type: 'system', minJumps: 2, maxJumps: 8, has: 'starbase|colony|habitable' }
  },
  deadline: [28, 34],
  rewards: { renown: 30 },
  stages: [
    { id: 'brief', objective: 'Receive orders from Starfleet Command', trigger: { on: 'immediate' }, node: 'brief' },
    { id: 'colony', objective: 'Investigate the silent colony at {colony}', trigger: { on: 'arrive', slot: 'colony' }, node: 'colony' },
    { id: 'wreck', objective: 'Board the damaged Borg probe at {wreck}', trigger: { on: 'arrive', slot: 'wreck' }, node: 'wreck' },
    { id: 'front', objective: 'Stop the Borg cube before it reaches {front}', trigger: { on: 'arrive', slot: 'front' }, node: 'front' }
  ],
  nodes: {
    brief: {
      type: 'advance', image: 'portrait_admiral', speaker: 'Vice Admiral Nakamura · Priority One',
      text: '"Captain, this is a Priority One alert. A Borg cube has entered your sector. The colony at {colony} went silent six hours ago.\n\nFind out what happened. Find a weakness. Then stop that cube before it reaches {front}. I won\'t pretend the odds are good. They never are, with the Borg."'
    },
    colony: {
      type: 'scene', image: 'ship_cube',
      text: 'The colony is gone. Where the domes stood, Borg machinery sprawls across the surface. The colonists have been taken.\n\nAmid the wreckage, sensors detect something useful: a Borg probe, badly damaged in the colony\'s last stand, limping away toward {wreck}.',
      choices: [
        { label: 'Scan the Borg installation for technical data', check: { skill: 'science', difficulty: 'moderate' }, success: 'scanned', failure: 'unscanned' },
        { label: 'Search for survivors', next: 'team' }
      ]
    },
    team: { type: 'away_team', text: 'The surface is crawling with drones that ignore anyone who is not a threat. Tread carefully.', size: [1, 3], recommend: ['medicine', 'tactics'], next: 'search' },
    search: {
      type: 'scene', image: 'ship_cube',
      text: 'In a sealed bunker, {away.leader} finds three children and an old man, the only people the Borg missed. Then the nearest drone turns its head.',
      choices: [
        { label: 'Beam everyone out now', check: { skill: 'engineering', difficulty: 'moderate', team: 'away' }, success: 'survivors', failure: 'drones' },
        { label: 'Hold them off while the transporter locks on', check: { skill: 'tactics', difficulty: 'moderate', team: 'away' }, success: 'survivors', failure: 'drones' }
      ]
    },
    survivors: { type: 'advance', text: 'Four survivors, safe in sickbay. It is not much against the scale of the loss, but it is something. Now, the probe at {wreck}.', effects: { renown: 4, morale: 6 } },
    drones: { type: 'advance', text: 'The drones adapt to your phasers faster than anyone expected. The team gets the survivors out, but not without cost. Set course for {wreck}.', effects: { injure: { who: 'away', severity: 'critical' } } },
    scanned: { type: 'advance', text: '{officer.science} extracts the Borg\'s shield harmonics from the installation. It might help. Now, that probe at {wreck}.', effects: { setFlags: ['borg_scanned'] } },
    unscanned: { type: 'advance', text: 'The Borg installation defends itself with a dampening field. You learn little. The probe at {wreck} is the best lead left.' },
    wreck: {
      type: 'scene', image: 'ship_cube',
      text: 'The probe drifts dark, its hull torn open by colonial defence fire. A few drones still move inside, repairing it. If it can be boarded, its interlink node could let you talk to the cube, or poison it.',
      choices: [{ label: 'Send a boarding party', next: 'wreck_team' }]
    },
    wreck_team: { type: 'away_team', text: 'Boarding a Borg vessel. Pick your best.', size: [2, 3], recommend: ['engineering', 'science', 'tactics'], next: 'inside' },
    inside: {
      type: 'scene', image: 'ship_cube',
      text: 'Green light, cold air, the hum of a hundred minds. The interlink node pulses at the heart of the probe. Removing it will wake every drone aboard.',
      choices: [
        { label: 'Extract the node', check: { skill: 'engineering', difficulty: 'hard', team: 'away' }, success: 'got_node', failure: 'fight_out' },
        { label: 'Use the Borg shield harmonics to mask the team', requires: { flag: 'borg_scanned' }, check: { skill: 'science', difficulty: 'moderate', team: 'away' }, success: 'got_node', failure: 'fight_out' }
      ]
    },
    fight_out: {
      type: 'scene', image: 'ship_cube',
      text: 'The drones wake. The team is surrounded.',
      choices: [
        { label: 'Fight your way out with the node', check: { skill: 'tactics', difficulty: 'moderate', team: 'away' }, success: 'got_node_hurt', failure: 'no_node' }
      ]
    },
    got_node: { type: 'advance', text: 'The node comes free. The cube\'s song falters for a moment, and your engineers say its shields are now readable, predictable, beatable. Now, {front}.', effects: { items: { add: ['borg_node'] }, setFlags: ['borg_weak'] } },
    got_node_hurt: { type: 'advance', text: 'The team fights free with the node, but not everyone walks out unhurt. The cube\'s defences are now an open book. Set course for {front}.', effects: { items: { add: ['borg_node'] }, setFlags: ['borg_weak'], injure: { who: 'away', severity: 'injured' } } },
    no_node: { type: 'advance', text: 'The team barely escapes without the node. You will have to face the cube without it. Set course for {front}.', effects: { injure: { who: 'away', severity: 'critical' }, morale: -5 } },
    front: {
      type: 'scene', image: 'ship_cube', speaker: 'The Borg Collective',
      text: 'The cube fills the viewscreen, blotting out the stars. A voice like a thousand whispers:\n\n"WE ARE THE BORG. LOWER YOUR SHIELDS AND SURRENDER YOUR SHIP. YOUR BIOLOGICAL AND TECHNOLOGICAL DISTINCTIVENESS WILL BE ADDED TO OUR OWN. RESISTANCE IS FUTILE."',
      choices: [
        { label: 'Transmit a shutdown command through the interlink node', requires: { item: 'borg_node' }, check: { skill: 'science', difficulty: 'hard' }, success: 'shutdown', failure: 'battle' },
        { label: 'Lure the cube into the star\'s corona', check: { skill: 'command', difficulty: 'extreme' }, success: 'corona', failure: 'battle' },
        { label: 'All hands, battle stations', next: 'battle' }
      ]
    },
    battle: { type: 'combat', text: 'The cube\'s tractor beam reaches for you.', enemies: [{ faction: 'borg', ship: 'borg_cube' }], win: 'victory', flee: 'regroup', canHail: false },
    regroup: { type: 'advance', stage: 'front', text: 'You tear free and escape at maximum warp. The cube resumes its course for {front}. Repair, rethink and return before it gets there.' },
    shutdown: { type: 'end', result: 'success', text: 'The command slips into the Collective\'s link like a knife. Every light on the cube goes dark at once. For one terrible second you hear a thousand voices wake up, confused and afraid. Then the cube falls silent forever.\n\nThe {sector} is safe.', effects: { items: { remove: ['borg_node'] } } },
    corona: { type: 'end', result: 'success', text: 'You dive into the star\'s corona with the cube on your tail. Your shields, tuned for the heat, hold. Theirs, adapted for your weapons, do not. The cube glows red, then white, then is gone.\n\nThe {sector} is safe.' },
    victory: { type: 'end', result: 'success', text: 'The cube breaks apart in a chain of green explosions, raining debris across the system. Your crew cheers until they are hoarse.\n\nThe {sector} is safe.' }
  }
});

ST.content.register({
  kind: 'mission', id: 'crisis_doomsday', category: 'crisis', crisis: true,
  title: 'The Planet Killer',
  briefing: 'An ancient machine of immense size has entered the {sector}. It is devouring planets. At its current speed it will reach the inhabited {target} system in weeks.',
  slots: {
    sight: { type: 'system', minJumps: 1, maxJumps: 5, faction: 'none' },
    lore: { type: 'system', minJumps: 1, maxJumps: 7, has: 'ruins|megastructure' },
    target: { type: 'system', minJumps: 2, maxJumps: 8, has: 'starbase|colony|habitable' }
  },
  deadline: [28, 34],
  rewards: { renown: 30 },
  stages: [
    { id: 'brief', objective: 'Receive orders from Starfleet Command', trigger: { on: 'immediate' }, node: 'brief' },
    { id: 'sight', objective: 'Observe the machine at {sight}', trigger: { on: 'arrive', slot: 'sight' }, node: 'sight' },
    { id: 'lore', objective: 'Search the ancient records at {lore} for a weakness', trigger: { on: 'arrive', slot: 'lore' }, node: 'lore' },
    { id: 'stand', objective: 'Stop the Planet Killer before it reaches {target}', trigger: { on: 'arrive', slot: 'target' }, node: 'stand' }
  ],
  nodes: {
    brief: {
      type: 'advance', image: 'portrait_admiral', speaker: 'Vice Admiral Nakamura · Priority One',
      text: '"Captain, an unidentified object has entered your sector. Kilometres long, hull of solid neutronium, and it is eating planets. It was last seen at {sight}, heading for {target}.\n\nObserve it. Find out what it is. Then find a way to stop it. There are two million people in its path."'
    },
    sight: {
      type: 'scene', image: 'doomsday',
      text: 'You arrive in time to watch the machine break up a moon and swallow the pieces. Its hull is solid neutronium. Nothing your ship carries can penetrate it.\n\nBut the maw, where it feeds, glows with energy.',
      choices: [
        { label: 'Scan the interior through the maw', check: { skill: 'science', difficulty: 'moderate' }, success: 'scan_ok', failure: 'scan_bad' },
        { label: 'Fire a test torpedo into the maw', cost: { torpedoes: 1 }, check: { skill: 'tactics', difficulty: 'moderate' }, success: 'scan_ok', failure: 'scan_bad' }
      ]
    },
    scan_ok: { type: 'advance', text: 'The interior is unarmoured. Its power source sits just behind the maw. If something big enough exploded in there... The ruins at {lore} may hold records of the machine\'s builders.', effects: { setFlags: ['doomsday_maw'] } },
    scan_bad: { type: 'advance', text: 'The machine lashes out with an antiproton beam. You withdraw with damage and little data. The ruins at {lore} are your best hope.', effects: { hull: -20, damage: { system: 'random', amount: 30 } } },
    lore: { type: 'away_team', image: 'surface_ruins', text: 'The ruins at {lore} are older than any civilisation in the sector. If anyone knew how to stop the machine, it was them.', size: [2, 3], recommend: ['science', 'engineering'], next: 'records' },
    records: {
      type: 'scene', image: 'surface_ruins',
      text: 'The builders left a warning, and a confession. The machine was their weapon, built to end a war. It ended their world too. The records describe its frequency: a harmonic that makes its neutronium brittle.',
      choices: [
        { label: 'Decode the harmonic', check: { skill: 'science', difficulty: 'hard', team: 'away' }, success: 'harmonic', failure: 'partial' },
        { label: 'Reverse-engineer it from the builders\' devices', check: { skill: 'engineering', difficulty: 'hard', team: 'away' }, success: 'harmonic', failure: 'partial' }
      ]
    },
    harmonic: { type: 'advance', text: 'You have the harmonic. Tuned into your phasers, it should crack the neutronium. Now, {target}.', effects: { setFlags: ['doomsday_weak'], renown: 4 } },
    partial: { type: 'advance', text: 'The records are too damaged. You leave with fragments and a grim resolve. Now, {target}.', effects: { time: 1 } },
    stand: {
      type: 'scene', image: 'doomsday',
      text: 'The machine drifts into the {target} system, its maw glowing. Behind you are two million people.\n\n{officer.engineering}: "Captain, I have an idea, and you won\'t like it. We rig a derelict with an overloaded warp core and fly it down the throat."',
      choices: [
        { label: 'Rig a derelict with an overloaded warp core', cost: { spares: 8 }, check: { skill: 'engineering', difficulty: 'hard' }, success: 'boom', failure: 'battle' },
        { label: 'Fire a full torpedo spread into the maw', requires: { flag: 'doomsday_maw' }, cost: { torpedoes: 8 }, check: { skill: 'tactics', difficulty: 'hard' }, success: 'boom', failure: 'battle' },
        { label: 'Engage it directly', next: 'battle' }
      ]
    },
    battle: { type: 'combat', text: 'The machine turns its maw toward you.', enemies: [{ faction: 'ancient', ship: 'doomsday' }], win: 'victory', flee: 'regroup', canHail: false },
    regroup: { type: 'advance', stage: 'stand', text: 'You pull away. The machine keeps coming. Repair, resupply and return to {target} before it arrives.' },
    boom: { type: 'end', result: 'success', text: 'The explosion inside the machine is visible from the planet\'s surface. Its glow fades. Its engines die. The Planet Killer drifts, inert, a monument to the war that made it.\n\nThe {sector} is safe.' },
    victory: { type: 'end', result: 'success', text: 'The harmonic-tuned phasers crack the neutronium like glass. The machine splits open and goes dark.\n\nThe {sector} is safe.' }
  }
});

ST.content.register({
  kind: 'mission', id: 'crisis_war', category: 'crisis', crisis: true,
  title: 'Drums of war',
  briefing: 'The {enemy.name} is massing warships on the frontier. Intelligence says a hardliner, {enemy.leader}, is preparing to strike. If it comes to war, the {sector} will burn.',
  slots: {
    enemy: { type: 'faction', oneOf: ['klingon', 'romulan', 'cardassian'], prefer: 'hostile' },
    ally: { type: 'faction', oneOf: ['klingon', 'romulan', 'cardassian', 'ferengi'], prefer: 'friendly' },
    border: { type: 'system', minJumps: 1, maxJumps: 7, faction: '{enemy}' },
    allyhome: { type: 'system', homeOf: 'ally' },
    summit: { type: 'system', minJumps: 1, maxJumps: 7, faction: 'none' }
  },
  deadline: [28, 34],
  rewards: { renown: 30 },
  stages: [
    { id: 'brief', objective: 'Receive orders from Starfleet Command', trigger: { on: 'immediate' }, node: 'brief' },
    { id: 'border', objective: 'Gather evidence of {enemy.leader}\'s plans at {border}', trigger: { on: 'arrive', slot: 'border' }, node: 'border' },
    { id: 'ally', objective: 'Seek the support of the {ally.name} at {allyhome}', trigger: { on: 'arrive', slot: 'allyhome' }, node: 'ally' },
    { id: 'summit', objective: 'Face {enemy.leader}\'s fleet at {summit}', trigger: { on: 'arrive', slot: 'summit' }, node: 'summit' }
  ],
  nodes: {
    brief: {
      type: 'advance', image: 'portrait_admiral', speaker: 'Vice Admiral Nakamura · Priority One',
      text: '"Captain, the {enemy.name} is mobilising. {enemy.leader} has gathered a strike force and is making speeches about Federation aggression. We don\'t believe their government has approved it.\n\nGet proof from {border}. Win over the {ally.name}. Then meet {enemy.leader} at {summit} and stop this war before it starts."'
    },
    border: {
      type: 'scene', image: '{enemy.ship}',
      text: 'The {border} system is thick with {enemy} traffic. Somewhere in it are the orders {enemy.leader} does not want their own government to see.',
      choices: [
        { label: 'Intercept and decrypt their fleet communications', check: { skill: 'science', difficulty: 'hard' }, success: 'proof', failure: 'caught' },
        { label: 'Send a disguised team to their supply depot', next: 'team' }
      ]
    },
    team: { type: 'away_team', text: 'A covert infiltration. Choose people who can think on their feet.', size: [1, 2], recommend: ['tactics', 'diplomacy'], next: 'depot' },
    depot: {
      type: 'scene', image: '{enemy.ship}',
      text: 'The team slips into the depot\'s command centre. The orders are there, on an open console. So is a guard, turning round.',
      choices: [
        { label: 'Talk your way out', check: { skill: 'diplomacy', difficulty: 'moderate', team: 'away' }, success: 'proof', failure: 'caught' },
        { label: 'Stun the guard and grab the files', check: { skill: 'tactics', difficulty: 'moderate', team: 'away' }, success: 'proof', failure: 'caught' }
      ]
    },
    proof: { type: 'advance', text: 'You have it: {enemy.leader}\'s orders, issued without their government\'s approval. Now, the {ally.name} at {allyhome}.', effects: { setFlags: ['war_evidence'] } },
    caught: {
      type: 'scene', image: '{enemy.ship}', text: 'You are spotted. A {enemy} patrol ship moves to intercept.',
      choices: [{ label: 'Fight free', next: 'caught_fight' }]
    },
    caught_fight: { type: 'combat', enemies: [{ faction: '{enemy}', ship: 'light' }], win: 'no_proof', flee: 'no_proof', surrender: 'no_proof' },
    no_proof: { type: 'advance', text: 'You get away without the evidence. You will have to make your case some other way. Set course for {allyhome}.', effects: { relation: { enemy: -5 } } },
    ally: { type: 'negotiation', party: '{ally}', topic: 'standing together against the war', text: 'The {ally.name} agrees to hear you. They have their own reasons to fear {enemy.leader}.', rounds: 6, difficulty: 'moderate', win: 'ally_yes', lose: 'ally_no' },
    ally_yes: { type: 'advance', text: 'The {ally.name} will stand with you. Their ships will be at {summit}.', effects: { setFlags: ['war_ally'] } },
    ally_no: { type: 'advance', text: 'The {ally.name} will not commit. You are on your own at {summit}.' },
    summit: {
      type: 'scene', image: '{enemy.portrait}', speaker: '{enemy.leader}',
      text: 'Three {enemy} warships wait at {summit}, weapons hot. {enemy.leader} appears on the viewscreen.\n\n"The Federation\'s lone ship. How fitting. Give me one reason not to begin the war here."',
      choices: [
        { label: 'Broadcast the evidence to the {enemy.name}', requires: { flag: 'war_evidence' }, check: { skill: 'command', difficulty: 'moderate' }, success: 'exposed', failure: 'talks' },
        { label: 'Signal the {ally} fleet to decloak and stand beside you', requires: { flag: 'war_ally' }, check: { skill: 'command', difficulty: 'moderate' }, success: 'outnumbered', failure: 'talks' },
        { label: 'Negotiate', next: 'talks' },
        { label: 'Fire first', next: 'battle' }
      ]
    },
    talks: { type: 'negotiation', party: '{enemy}', topic: 'peace on the frontier', text: '{enemy.leader} folds their arms. "Talk, then. Convince me."', rounds: 6, difficulty: 'extreme', win: 'peace', lose: 'battle' },
    battle: { type: 'combat', text: '{enemy.leader}\'s fleet opens fire.', enemies: [{ faction: '{enemy}', ship: 'heavy' }, { faction: '{enemy}', ship: 'medium' }], win: 'victory', flee: 'regroup', surrender: 'peace' },
    regroup: { type: 'advance', stage: 'summit', text: 'You break away. {enemy.leader}\'s fleet holds at {summit}, waiting. Regroup, and return before the war begins.' },
    exposed: { type: 'end', result: 'success', text: 'The evidence floods the {enemy} fleet\'s comms. Within the hour, orders arrive from their capital: {enemy.leader} is relieved of command. The warships turn for home.\n\nThe war that almost happened becomes a footnote. The {sector} is safe.', effects: { relation: { enemy: 10 } } },
    outnumbered: { type: 'end', result: 'success', text: 'The {ally} ships appear around you. {enemy.leader} looks at the odds, and at their crew, and orders a withdrawal.\n\nThe {sector} is safe.', effects: { relation: { ally: 10 } } },
    peace: { type: 'end', result: 'success', text: 'Somehow, it holds. {enemy.leader} stands down. Governments start talking. The {sector} is safe.', effects: { relation: { enemy: 8 } } },
    victory: { type: 'end', result: 'success', text: '{enemy.leader}\'s fleet is broken. The survivors limp home, and their government, embarrassed, disowns the attack.\n\nThe {sector} is safe, at a price.', effects: { relation: { enemy: -15 } } }
  }
});

ST.content.register({
  kind: 'mission', id: 'crisis_cascade', category: 'crisis', crisis: true,
  title: 'Subspace cascade',
  briefing: 'Subspace itself is tearing apart near {epicenter}. The ruptures are spreading. If they reach the inhabited systems, warp travel across the {sector} will become impossible, and worse.',
  slots: {
    lab: { type: 'system', minJumps: 1, maxJumps: 6, has: 'nebula|star:collapsed|anomaly|wormhole' },
    epicenter: { type: 'system', minJumps: 2, maxJumps: 8, faction: 'none' }
  },
  deadline: [26, 32],
  rewards: { renown: 30 },
  stages: [
    { id: 'brief', objective: 'Receive orders from Starfleet Command', trigger: { on: 'immediate' }, node: 'brief' },
    { id: 'lab', objective: 'Scan the subspace distortions at {lab}', trigger: { on: 'scan', slot: 'lab' }, node: 'lab' },
    { id: 'seal', objective: 'Seal the cascade at {epicenter}', trigger: { on: 'arrive', slot: 'epicenter' }, node: 'seal' }
  ],
  nodes: {
    brief: {
      type: 'advance', image: 'portrait_admiral', speaker: 'Vice Admiral Nakamura · Priority One',
      text: '"Captain, a subspace cascade has begun near {epicenter}. Each rupture triggers the next. If it spreads, every warp-capable ship in the sector will be stranded, and the ruptures will swallow whole systems.\n\nThe distortions near {lab} are an early echo of it. Scan them, build a model, then seal the cascade at its source."'
    },
    lab: {
      type: 'scene', image: 'rift',
      text: 'The distortions here are faint, but they carry the cascade\'s signature. With enough data, {officer.science} could predict how it will behave.',
      choices: [
        { label: 'Build a predictive model', check: { skill: 'science', difficulty: 'moderate' }, success: 'model', failure: 'nomodel' },
        { label: 'Calibrate the deflector to the distortion frequency', check: { skill: 'engineering', difficulty: 'moderate' }, success: 'model', failure: 'nomodel' }
      ]
    },
    model: { type: 'advance', text: 'The model is solid. You know where the cascade is weakest. Set course for {epicenter}.', effects: { setFlags: ['cascade_model'] } },
    nomodel: { type: 'advance', text: 'The data is incomplete. You will have to improvise at {epicenter}.' },
    seal: {
      type: 'scene', image: 'rift',
      text: 'The epicenter is a storm of broken space. Ruptures open and close like mouths. The plan: fire a verteron-laced warp pulse from the deflector to stitch subspace back together. It will take everything the ship has.',
      choices: [
        { label: 'Target the cascade\'s weak point using the model', requires: { flag: 'cascade_model' }, check: { skill: 'science', difficulty: 'moderate' }, success: 'step2', failure: 'wobble' },
        { label: 'Find the weak point by hand', check: { skill: 'science', difficulty: 'hard' }, success: 'step2', failure: 'wobble' }
      ]
    },
    wobble: {
      type: 'scene', image: 'rift', effects: { hull: -15, damage: { system: 'sensors', amount: 30 } },
      text: 'A rupture opens beside the ship and nearly takes the port nacelle. You are still in position. One more try.',
      choices: [{ label: 'Try again', check: { skill: 'science', difficulty: 'hard' }, success: 'step2', failure: 'failed' }]
    },
    step2: {
      type: 'scene', image: 'rift',
      text: '{officer.engineering}: "Target locked. Now I need every drop of dilithium we have, pushed through the deflector at once. The ship will hate it."',
      choices: [
        { label: 'Fire the warp pulse', cost: { dilithium: 10 }, check: { skill: 'engineering', difficulty: 'hard' }, success: 'step3', failure: 'surge' },
        { label: 'Fire at reduced power and hold longer', cost: { dilithium: 5 }, check: { skill: 'engineering', difficulty: 'extreme' }, success: 'step3', failure: 'surge' }
      ]
    },
    surge: {
      type: 'scene', image: 'rift', effects: { hull: -15, crew: -4, damage: { system: 'engines', amount: 40 } },
      text: 'The pulse falters. Plasma fires break out on three decks. The cascade is still spreading.',
      choices: [{ label: 'Reroute everything and fire again', cost: { dilithium: 4 }, check: { skill: 'engineering', difficulty: 'hard' }, success: 'step3', failure: 'failed' }]
    },
    step3: {
      type: 'scene', image: 'rift',
      text: 'The pulse strikes. Subspace begins to knit, but the ship must hold its position in the storm until it finishes. The helm is fighting shear forces the ship was never built for.',
      choices: [
        { label: '"Steady as she goes."', check: { skill: 'command', difficulty: 'moderate' }, success: 'sealed', failure: 'sealed_hurt' }
      ]
    },
    sealed: { type: 'end', result: 'success', text: 'The last rupture closes like a healing wound. Silence. The stars return to where they belong.\n\nThe {sector} is safe.' },
    sealed_hurt: { type: 'end', result: 'success', text: 'The ship is thrown about like a toy, but it holds just long enough. The cascade collapses. The {sector} is safe, and the ship will need a very long refit.', effects: { hull: -20, injure: { who: 'random', severity: 'injured' } } },
    failed: { type: 'end', result: 'failure', text: 'The pulse fails. The cascade roars past you and out into the sector. Starfleet orders a full evacuation. The {sector} is lost.' }
  }
});
