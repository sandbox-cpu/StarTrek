/* Exploration and science missions. Pure data — see docs/MISSION_AUTHORING.md. */

ST.content.register({
  kind: 'mission', id: 'anomaly_study', category: 'investigate', weight: 3,
  title: 'The fold at {target}',
  briefing: 'A long-range probe detected a region near {target} where space appears to fold back on itself. The Daystrom Institute wants eyes on it. Carefully.',
  slots: { target: { type: 'system', minJumps: 1, maxJumps: 5, faction: 'none' } },
  deadline: [12, 18],
  rewards: { renown: 11 },
  penalties: { renown: -3 },
  twists: [{ id: 'future', chance: 0.3 }],
  stages: [
    { id: 'study', objective: 'Investigate the spatial fold at {target}', trigger: { on: 'arrive', slot: 'target' }, node: 'arrive' }
  ],
  nodes: {
    arrive: {
      type: 'scene', image: 'rift',
      text: 'The fold is beautiful and wrong. Starlight bends around a patch of darkness the size of a small moon. Your sensors return readings that contradict each other.\n\n{officer.science}: "Fascinating. And, I suspect, dangerous."',
      choices: [
        { label: 'Launch a class-4 probe into the fold', check: { skill: 'science', difficulty: 'moderate' }, success: 'probe', failure: 'probe_lost' },
        { label: 'Take the ship to the very edge', check: { skill: 'command', difficulty: 'hard' }, success: 'edge', failure: 'edge_bad' },
        { label: 'Pulse it with a modulated tachyon beam', check: { skill: 'engineering', difficulty: 'moderate' }, success: 'pulse', failure: 'probe_lost' }
      ]
    },
    probe: { type: 'branch', if: { twist: 'future' }, then: 'future', else: 'done' },
    edge: { type: 'branch', if: { twist: 'future' }, then: 'future', else: 'done_bonus' },
    pulse: { type: 'branch', if: { twist: 'future' }, then: 'future', else: 'done' },
    probe_lost: {
      type: 'scene', image: 'rift',
      text: 'The probe goes silent the moment it crosses the threshold. You will need another approach.',
      choices: [
        { label: 'Try again with the ship\'s sensors at full power', check: { skill: 'science', difficulty: 'moderate' }, success: 'done', failure: 'done_poor' }
      ]
    },
    edge_bad: {
      type: 'scene', image: 'rift', effects: { hull: -12, damage: { system: 'engines', amount: 25 } },
      text: 'Gravimetric shear grabs the ship. For a terrifying moment the helm does not respond. Then you are clear, battered but with a full set of readings.',
      choices: [{ label: 'Transmit the data to Starfleet', next: 'done' }]
    },
    future: {
      type: 'scene', image: 'rift',
      text: 'Among the readings is a message, encoded in a Starfleet format that does not exist yet. It is signed with your own authorisation code. It says: *the fold is a door. Do not let anyone open it.*',
      choices: [
        { label: 'Seal the fold with a deflector pulse', check: { skill: 'engineering', difficulty: 'hard' }, success: 'sealed', failure: 'done' },
        { label: 'Classify the message and report it to Starfleet Intelligence', effects: { renown: 3 }, next: 'done' }
      ]
    },
    sealed: { type: 'end', result: 'success', text: 'The fold collapses in on itself and is gone. You will never know what was on the other side, and your future self seemed to think that was for the best.', effects: { renown: 6, xp: 20 } },
    done: { type: 'end', result: 'success', text: 'The data is the most detailed study of a spatial fold ever made. The Daystrom Institute is thrilled.' },
    done_bonus: { type: 'end', result: 'success', text: 'The close-range readings are extraordinary. Three papers bear the ship\'s name before the month is out.', effects: { renown: 4 } },
    done_poor: { type: 'end', result: 'success', text: 'The data is thin, but it is more than anyone had before.', effects: { renown: -4 } }
  }
});

ST.content.register({
  kind: 'mission', id: 'ruins_dig', category: 'archaeology', weight: 3,
  title: 'The ruins of {site}',
  briefing: 'Survey data shows the ruins of a lost civilisation on {site}, in the {target} system. Professor {prof} of the Federation Archaeology Council has asked for a Starfleet team to examine them before looters do.',
  slots: {
    target: { type: 'system', minJumps: 0, maxJumps: 5, has: 'ruins', allowCurrent: true },
    site: { type: 'planet', system: 'target', ruins: true },
    prof: { type: 'name' }
  },
  deadline: [14, 20],
  rewards: { renown: 12 },
  penalties: { renown: -3 },
  twists: [{ id: 'guardian', chance: 0.35 }, { id: 'looters', chance: 0.3 }],
  stages: [
    { id: 'dig', objective: 'Explore the ruins on {site}', trigger: { on: 'arrive', slot: 'target' }, node: 'orbit' }
  ],
  nodes: {
    orbit: { type: 'branch', if: { twist: 'looters' }, then: 'looters', else: 'team' },
    looters: {
      type: 'scene', image: 'ship_orion',
      text: 'An Orion salvage ship sits in orbit above {site}, and a team of looters is already cutting into the ruins.',
      choices: [
        { label: 'Order them off the planet', check: { skill: 'command', difficulty: 'moderate' }, success: 'team', failure: 'loot_fight' },
        { label: 'Beam the looters into your brig', check: { skill: 'tactics', difficulty: 'moderate' }, success: 'team', failure: 'loot_fight' }
      ]
    },
    loot_fight: { type: 'combat', enemies: [{ faction: 'orion', ship: 'light' }], win: 'team', flee: 'fled' },
    fled: { type: 'end', result: 'failure', text: 'You withdraw. By the time Starfleet returns, the ruins have been stripped.' },
    team: { type: 'away_team', image: 'surface_ruins', text: 'The ruins of {site} await. Professor {prof} will be watching over the subspace link.', size: [2, 3], recommend: ['science', 'engineering', 'diplomacy'], next: 'dig' },
    dig: {
      type: 'scene', image: 'surface_ruins', speaker: 'Professor {prof}, via subspace',
      text: '"Remarkable! Those are Iconian-era stress glyphs, or I\'m a Tellarite. The central chamber should be sealed by some kind of logic lock. Please don\'t break it."',
      choices: [
        { label: 'Solve the lock', check: { skill: 'science', difficulty: 'moderate', team: 'away' }, success: 'inner', failure: 'forced' },
        { label: 'Bypass it with engineering', check: { skill: 'engineering', difficulty: 'moderate', team: 'away' }, success: 'forced', failure: 'hurt' }
      ]
    },
    forced: { type: 'scene', image: 'surface_ruins', speaker: 'Professor {prof}', text: '"Oh, you broke it." The door grinds open anyway.', effects: { renown: -2 }, choices: [{ label: 'Enter the chamber', next: 'inner' }] },
    hurt: { type: 'scene', image: 'surface_ruins', text: 'The lock discharges. The team is thrown back, but the door opens.', effects: { injure: { who: 'away', severity: 'injured' } }, choices: [{ label: 'Enter the chamber', next: 'inner' }] },
    inner: { type: 'branch', if: { twist: 'guardian' }, then: 'guardian', else: 'treasure' },
    guardian: {
      type: 'scene', image: 'entity',
      text: 'A figure of light forms in the centre of the chamber. "You have entered the house of the Keepers. Why?"',
      choices: [
        { label: '"To learn from you, and to remember you."', check: { skill: 'diplomacy', difficulty: 'moderate', team: 'away' }, success: 'blessing', failure: 'expelled' },
        { label: 'Answer in the Keepers\' own mathematics', check: { skill: 'science', difficulty: 'hard', team: 'away' }, success: 'blessing', failure: 'expelled' }
      ]
    },
    blessing: { type: 'end', result: 'success', text: 'The guardian bows. "Then remember us." It fills the team\'s tricorders with a library of the Keepers\' history, then fades forever.', effects: { renown: 8, xp: 20 } },
    expelled: { type: 'end', result: 'success', text: 'The guardian finds your answer wanting and the team is gently transported back to the ship. The recordings they made are still invaluable.', effects: { renown: 2 } },
    treasure: { type: 'end', result: 'success', text: 'The chamber holds a star map, a sealed reliquary and murals that tell the story of a people who went somewhere and never came back. Professor {prof} is speechless, briefly.', effects: { items: { add: ['artifact'] }, reveal: 'nearby' } }
  }
});

ST.content.register({
  kind: 'mission', id: 'cloak_hunt', category: 'hunt', weight: 2,
  title: 'Ghost in the {a} system',
  briefing: 'Listening posts near {a} have picked up signs of a cloaked vessel, probably {enemy}. Starfleet Intelligence wants to know what it is doing on our side of the line.',
  slots: {
    enemy: { type: 'faction', oneOf: ['romulan', 'klingon'], prefer: 'hostile' },
    a: { type: 'system', minJumps: 1, maxJumps: 3 },
    b: { type: 'system', minJumps: 2, maxJumps: 5 }
  },
  deadline: [15, 21],
  rewards: { renown: 13 },
  penalties: { renown: -4 },
  stages: [
    { id: 'trace', objective: 'Search for the cloaked ship\'s trail at {a}', trigger: { on: 'arrive', slot: 'a' }, node: 'trace' },
    { id: 'corner', objective: 'Follow the trail to {b}', trigger: { on: 'arrive', slot: 'b' }, node: 'corner' }
  ],
  nodes: {
    trace: {
      type: 'scene', image: '@location',
      text: 'Nothing on normal sensors. {officer.science} suggests a tachyon detection grid, bouncing beams off the system\'s outer planets.',
      choices: [
        { label: 'Build the tachyon grid', check: { skill: 'science', difficulty: 'moderate' }, success: 'found', failure: 'slow' },
        { label: 'Look for disturbed dust in the Oort cloud', check: { skill: 'engineering', difficulty: 'moderate' }, success: 'found', failure: 'slow' }
      ]
    },
    found: { type: 'advance', text: 'A faint tachyon wake, heading for {b}. You have their trail.', effects: { items: { add: ['tachyon_data'] }, xp: 10 } },
    slow: { type: 'advance', text: 'After a day of searching you find a trace. It points to {b}.', effects: { time: 1 } },
    corner: {
      type: 'scene', image: '@location',
      text: 'The trail ends here. The cloaked ship is close; you can almost feel it. {officer.tactics}: "If we saturate the area with a tachyon pulse, they\'ll have to show themselves."',
      choices: [
        { label: 'Saturate the area and force them to decloak', check: { skill: 'tactics', difficulty: 'moderate' }, success: 'decloak', failure: 'ambush' },
        { label: 'Use the tachyon data to predict their position', requires: { item: 'tachyon_data' }, check: { skill: 'science', difficulty: 'easy' }, success: 'decloak', failure: 'ambush' },
        { label: 'Broadcast a hail on all frequencies and wait', check: { skill: 'diplomacy', difficulty: 'moderate' }, success: 'decloak', failure: 'ambush' }
      ]
    },
    decloak: {
      type: 'scene', image: '{enemy.portrait}', speaker: '{enemy.leader} · {enemy.vessel}',
      text: 'The {enemy.vessel} shimmers into view, weapons cold. Its commander regards you with irritation, and a little respect.\n\n"Well done, Captain. I was surveying a derelict listening post of ours. Nothing more."',
      effects: { items: { remove: ['tachyon_data'] } },
      choices: [
        { label: '"Then you won\'t mind leaving Federation space."', check: { skill: 'command', difficulty: 'moderate' }, success: 'escorted', failure: 'fight' },
        { label: 'Negotiate an understanding about the border', next: 'talks' },
        { label: 'Arrest them for espionage', next: 'fight' }
      ]
    },
    ambush: { type: 'scene', image: '{enemy.ship}', text: 'The {enemy} ship decloaks directly behind you and opens fire!', choices: [{ label: 'Return fire!', next: 'fight' }] },
    talks: { type: 'negotiation', party: '{enemy}', topic: 'border incursions', text: 'The commander leans back. "Very well. Let us discuss where the line truly is."', rounds: 5, difficulty: 'hard', win: 'accord', lose: 'escorted' },
    accord: { type: 'end', result: 'success', text: 'An informal agreement: fewer cloaked visits, fewer unannounced patrols. Starfleet Intelligence is impressed.', effects: { relation: { enemy: 6 }, renown: 4 } },
    escorted: { type: 'end', result: 'success', text: 'You escort the {enemy} ship to the border. It cloaks the moment it crosses. Message delivered.', effects: { relation: { enemy: -2 } } },
    fight: { type: 'combat', enemies: [{ faction: '{enemy}', ship: 'medium' }], win: 'won', flee: 'lost', surrender: 'captured' },
    won: { type: 'end', result: 'success', text: 'The {enemy} ship is crippled and limps home. Their government will call it an outrage. Starfleet will call it a successful patrol.', effects: { relation: { enemy: -8 } } },
    captured: { type: 'end', result: 'success', text: 'The {enemy} commander surrenders. The intelligence value of their ship is enormous.', effects: { relation: { enemy: -4 }, renown: 5 } },
    lost: { type: 'end', result: 'failure', text: 'You escape, but the cloaked ship is gone and so is your chance.' }
  }
});

ST.content.register({
  kind: 'mission', id: 'collapsed_star', category: 'survey', weight: 2,
  title: 'Dead star at {target}',
  briefing: 'The collapsed star at {target} is one of the most extreme objects in the sector. The Vulcan Science Academy has asked for close-range gravimetric readings. It will be dangerous.',
  slots: { target: { type: 'system', minJumps: 1, maxJumps: 6, has: 'star:collapsed' } },
  rewards: { renown: 10 },
  penalties: { renown: -2 },
  stages: [
    { id: 'study', objective: 'Take close-range readings of the star at {target}', trigger: { on: 'arrive', slot: 'target' }, node: 'arrive' }
  ],
  nodes: {
    arrive: {
      type: 'scene', image: '{target}',
      text: 'Tidal forces make the deck plates groan even at this distance. {officer.science}: "The closer we go, the better the data. And the more likely we are to be torn apart."',
      choices: [
        { label: 'Hold at a safe distance', check: { skill: 'science', difficulty: 'easy' }, success: 'safe', failure: 'safe_poor' },
        { label: 'Take her in close', check: { skill: 'command', difficulty: 'moderate' }, success: 'close', failure: 'close_bad' },
        { label: 'Launch a sensor probe on a slingshot trajectory', check: { skill: 'engineering', difficulty: 'moderate' }, success: 'close', failure: 'safe_poor' }
      ]
    },
    safe: { type: 'end', result: 'success', text: 'The readings are solid, if not spectacular. The Academy sends a polite thank-you.' },
    safe_poor: { type: 'end', result: 'success', text: 'Interference spoils half the readings. Still better than nothing.', effects: { renown: -4 } },
    close: { type: 'end', result: 'success', text: 'The readings are unprecedented. The Vulcan Science Academy calls them "highly satisfactory", which from Vulcans is a standing ovation.', effects: { renown: 6, xp: 15 } },
    close_bad: { type: 'end', result: 'success', text: 'Tidal stress buckles two hull sections before you can pull away. The data is extraordinary. The repair bill is too.', effects: { hull: -20, damage: { system: 'random', amount: 30 }, renown: 4 } }
  }
});

ST.content.register({
  kind: 'mission', id: 'evacuation', category: 'rescue', weight: 2,
  title: 'Evacuate {target}',
  briefing: 'The star at {target} is about to flare. The colony there has {n} people and nowhere near enough ships. Get there, and get them out.',
  slots: { target: { type: 'system', minJumps: 1, maxJumps: 3, has: 'colony' }, n: { type: 'number', min: 300, max: 1400 } },
  deadline: [5, 8],
  rewards: { renown: 14 },
  penalties: { renown: -10, morale: -10 },
  stages: [
    { id: 'evac', objective: 'Reach {target} before the stellar flare', trigger: { on: 'arrive', slot: 'target' }, node: 'arrive' }
  ],
  nodes: {
    arrive: {
      type: 'scene', image: 'surface_colony',
      text: 'The star is already swelling. {n} colonists are waiting with whatever they could carry. The ship cannot hold them all at once.',
      choices: [
        { label: 'Extend the ship\'s shields around the colony', check: { skill: 'engineering', difficulty: 'hard' }, success: 'shield', failure: 'ferry' },
        { label: 'Ferry them in shifts to the outer planets', next: 'ferry' },
        { label: 'Pack every corridor and cargo bay and go', check: { skill: 'command', difficulty: 'moderate' }, success: 'packed', failure: 'ferry' }
      ]
    },
    shield: { type: 'end', result: 'success', text: 'A shimmering dome of energy covers the colony as the flare hits. It holds. The colonists never have to leave their homes.', effects: { dilithium: -6, shields: -100, renown: 6, xp: 20 } },
    packed: { type: 'end', result: 'success', text: 'Every corridor is full of people. It is uncomfortable, noisy and wonderful. Everyone gets out.', effects: { morale: 8, time: 1 } },
    ferry: { type: 'end', result: 'success', text: 'Shift after shift, back and forth, as the star grows angrier. You get almost everyone out. Almost.', effects: { time: 1.5, morale: -3, renown: -3 } }
  }
});
