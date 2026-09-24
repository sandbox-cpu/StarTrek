/* Core Starfleet missions: survey, rescue, delivery, patrol, recovery, medical.
   Pure data — see docs/MISSION_AUTHORING.md. */

ST.content.register({
  kind: 'mission', id: 'survey_system', category: 'survey', weight: 4,
  title: 'Stellar survey: {target}',
  briefing: 'Starfleet Cartography wants a full sensor survey of the {target} system. Nobody has charted it in detail, and the science council is getting impatient.',
  slots: { target: { type: 'system', minJumps: 1, maxJumps: 4, unvisited: true } },
  deadline: [10, 16],
  rewards: { renown: 7, latinum: 20 },
  penalties: { renown: -3 },
  twists: [{ id: 'signal', chance: 0.35 }, { id: 'claim', chance: 0.2 }],
  stages: [
    { id: 'survey', objective: 'Travel to {target} and run a full system scan', trigger: { on: 'scan', slot: 'target' }, node: 'scanned' }
  ],
  nodes: {
    scanned: { type: 'branch', if: { twist: 'signal' }, then: 'signal', else: 'claim_check' },
    claim_check: { type: 'branch', if: { twist: 'claim' }, then: 'claim', else: 'done' },
    done: { type: 'end', result: 'success', image: '{target}', text: 'The survey data streams back to Starfleet Cartography: stellar composition, planetary orbits, a dozen new asteroid designations. Routine work, done well.' },
    signal: {
      type: 'scene', image: '{target}',
      text: 'Buried in the survey data is something odd: a repeating signal from deep inside the system, too regular to be natural.',
      choices: [
        { label: 'Triangulate the source', check: { skill: 'science', difficulty: 'moderate' }, success: 'beacon', failure: 'faded' },
        { label: 'Log it for later and file the survey', next: 'done' }
      ]
    },
    beacon: { type: 'end', result: 'success', text: 'The source is an ancient navigation beacon, still running on a power cell that should have died a thousand years ago. Starfleet is very interested.', effects: { renown: 4, spares: 2 } },
    faded: { type: 'end', result: 'success', text: 'The signal fades before you can pin it down. The survey is still a success.' },
    claim: {
      type: 'scene', image: 'portrait_ferengi', speaker: 'An indignant DaiMon',
      text: 'A Ferengi prospector hails you in a fury. "This system is under an exclusive survey contract! My contract! Your scan is a violation of my intellectual property!"',
      choices: [
        { label: 'Offer to share the survey data with him', check: { skill: 'diplomacy', difficulty: 'easy' }, success: 'shared', failure: 'done' },
        { label: '"Federation surveys are public record. Good day."', next: 'done' }
      ]
    },
    shared: { type: 'end', result: 'success', text: 'The prospector is so delighted by free data that he pays you for it anyway. Ferengi logic.', effects: { latinum: 30, relation: { ferengi: 3 } } }
  }
});

ST.content.register({
  kind: 'mission', id: 'distress_call', category: 'rescue', weight: 4,
  title: 'Distress call from {target}',
  briefing: 'A freighter, the {freighter}, has sent a mayday from the {target} system. Their warp core is failing and they have {n} crew aboard. You are the closest ship.',
  slots: {
    target: { type: 'system', minJumps: 1, maxJumps: 3 },
    freighter: { type: 'text', options: ['S.S. Hopewell', 'S.S. Kerrigan', 'S.S. Nyota', 'S.S. Pelican', 'S.S. Harbinger', 'S.S. Mercy of Tarsus'] },
    n: { type: 'number', min: 12, max: 60 }
  },
  deadline: [5, 8],
  rewards: { renown: 10 },
  penalties: { renown: -6, morale: -5 },
  twists: [{ id: 'trap', chance: 0.3 }],
  stages: [
    { id: 'reach', objective: 'Reach the {freighter} at {target} before it is too late', trigger: { on: 'arrive', slot: 'target' }, node: 'arrive' }
  ],
  nodes: {
    arrive: { type: 'branch', if: { twist: 'trap' }, then: 'trap', else: 'freighter' },
    freighter: {
      type: 'scene', image: 'derelict',
      text: 'The {freighter} tumbles slowly, venting plasma. Radiation from the failing core floods your sensors. {officer.engineering}: "Ten minutes to breach, maybe less. The radiation will make beaming them out very tricky."',
      choices: [
        { label: 'Beam the crew out through the radiation', check: { skill: 'engineering', difficulty: 'moderate' }, success: 'all_saved', failure: 'most_saved' },
        { label: 'Tractor the freighter and eject its warp core', check: { skill: 'tactics', difficulty: 'hard' }, success: 'ship_saved', failure: 'most_saved' },
        { label: 'Send medical teams over in environment suits', check: { skill: 'medicine', difficulty: 'moderate' }, success: 'all_saved', failure: 'medics_hurt' }
      ]
    },
    all_saved: { type: 'end', result: 'success', text: 'The last of the {n} crew materialises in cargo bay two just as the freighter\'s core breaches. The flash lights up the viewscreen. Everyone made it.', effects: { morale: 6 } },
    ship_saved: { type: 'end', result: 'success', text: 'The ejected core detonates harmlessly a thousand kilometres away. The {freighter} is saved, cargo and all. Her grateful owners wire a reward.', effects: { latinum: 50, renown: 4 } },
    most_saved: { type: 'end', result: 'success', text: 'You save most of the crew. Four do not make it. The survivors thank you through tears.', effects: { morale: -4, renown: -3 } },
    medics_hurt: { type: 'end', result: 'success', text: 'The medical teams get everyone out, but they take heavy radiation doing it.', effects: { injure: { who: 'medicine', severity: 'injured' }, crew: -1 } },
    trap: {
      type: 'scene', image: 'ship_orion',
      text: 'As you approach, the freighter\'s lifesigns flicker and vanish. Holograms. Two Orion raiders swing out from behind the system\'s largest moon.\n\n"Thanks for dropping by, Starfleet."',
      choices: [
        { label: 'Battle stations', next: 'fight' },
        { label: '"There\'s a Starfleet task force a minute behind us." (Bluff)', check: { skill: 'command', difficulty: 'hard' }, success: 'bluffed', failure: 'fight' }
      ]
    },
    fight: { type: 'combat', enemies: [{ faction: 'orion', ship: 'light', count: 2 }], win: 'trap_won', flee: 'trap_fled' },
    trap_won: { type: 'end', result: 'success', text: 'The raiders are crippled. Among their logs you find the real {freighter}: captured, crew held for ransom at a nearby outpost. Starfleet Security moves in within the day.', effects: { renown: 4, latinum: 20, relation: { orion: -5 } } },
    bluffed: { type: 'end', result: 'success', text: 'The raiders scatter. In their haste they leave behind the trapped crew of the real {freighter}, locked in a cargo pod. You bring them home.', effects: { renown: 3 } },
    trap_fled: { type: 'end', result: 'failure', text: 'You escape the ambush, but the raiders have what they wanted. The real {freighter} is never found.' }
  }
});

ST.content.register({
  kind: 'mission', id: 'medical_delivery', category: 'delivery', weight: 3,
  title: 'Medical supplies to {target}',
  briefing: 'An outbreak of Rigelian fever has hit the colony at {target}. Starfleet Medical has loaded vaccines and surgical kits aboard. Get them there before the sickness spreads.',
  slots: { target: { type: 'system', minJumps: 1, maxJumps: 4, has: 'colony' } },
  deadline: [8, 12],
  onAccept: { items: { add: ['medical_supplies'] } },
  rewards: { renown: 9 },
  penalties: { renown: -6 },
  twists: [{ id: 'raid', chance: 0.3 }, { id: 'mutation', chance: 0.25 }],
  stages: [
    { id: 'deliver', objective: 'Deliver the medical supplies to the colony at {target}', trigger: { on: 'arrive', slot: 'target' }, node: 'arrive' }
  ],
  nodes: {
    arrive: { type: 'branch', if: { twist: 'raid' }, then: 'raid', else: 'check_mutation' },
    check_mutation: { type: 'branch', if: { twist: 'mutation' }, then: 'mutation', else: 'deliver' },
    deliver: { type: 'end', result: 'success', image: 'surface_colony', text: 'The supplies are beamed down to a colony that was running out of hope. Within a week, the fever is gone.', effects: { items: { remove: ['medical_supplies'] }, morale: 4 } },
    raid: {
      type: 'scene', image: 'ship_orion',
      text: 'An Orion raider is waiting in orbit. "We\'ll take those medical supplies, Starfleet. Vaccines sell for a fortune on the frontier."',
      choices: [
        { label: '"Over my dead body."', next: 'fight' },
        { label: 'Pay them to leave', cost: { latinum: 40 }, next: 'check_mutation' },
        { label: 'Beam the supplies down under their noses', check: { skill: 'engineering', difficulty: 'hard' }, success: 'sneaky', failure: 'fight' }
      ]
    },
    fight: { type: 'combat', enemies: [{ faction: 'orion', ship: 'medium' }], win: 'check_mutation', flee: 'fled' },
    sneaky: { type: 'end', result: 'success', text: 'The supplies are on the ground before the pirates realise what happened. You leave them fuming in orbit.', effects: { items: { remove: ['medical_supplies'] }, renown: 3 } },
    fled: { type: 'end', result: 'failure', text: 'You are driven off. The colony will have to wait for another ship. Some of them will not survive the wait.', effects: { morale: -6 } },
    mutation: {
      type: 'scene', image: 'surface_colony',
      text: 'The colony doctor meets your team with bad news. The fever has mutated. The vaccines you brought will not work against the new strain as they are.',
      choices: [
        { label: 'Have your medical staff adapt the vaccine', check: { skill: 'medicine', difficulty: 'hard' }, success: 'adapted', failure: 'partial' },
        { label: 'Use the ship\'s labs to model the mutation', check: { skill: 'science', difficulty: 'moderate' }, success: 'adapted', failure: 'partial' }
      ]
    },
    adapted: { type: 'end', result: 'success', text: 'Working through the night, your team modifies the vaccine. It works. Starfleet Medical adopts your method across the sector.', effects: { items: { remove: ['medical_supplies'] }, renown: 5, xp: 15 } },
    partial: { type: 'end', result: 'success', text: 'The vaccine helps, but not enough. The colony survives, with losses.', effects: { items: { remove: ['medical_supplies'] }, renown: -3, morale: -4 } }
  }
});

ST.content.register({
  kind: 'mission', id: 'pirate_raids', category: 'patrol', weight: 3,
  title: 'Raiders at {target}',
  briefing: 'Orion raiders have been attacking shipping in the {target} system. Two freighters have been lost this month. Find the raiders and put a stop to it.',
  slots: { target: { type: 'system', minJumps: 1, maxJumps: 4, faction: 'none' } },
  deadline: [7, 12],
  rewards: { renown: 11, latinum: 30 },
  penalties: { renown: -5 },
  twists: [{ id: 'hostages', chance: 0.3 }],
  stages: [
    { id: 'hunt', objective: 'Find and stop the raiders at {target}', trigger: { on: 'arrive', slot: 'target' }, node: 'arrive' }
  ],
  nodes: {
    arrive: { type: 'branch', if: { twist: 'hostages' }, then: 'hostages', else: 'battle' },
    battle: {
      type: 'scene', image: 'ship_orion',
      text: 'You find them: two raiders stripping a crippled freighter. They spot you at the same moment and break off, weapons charging.',
      choices: [
        { label: 'Engage', next: 'fight' },
        { label: 'Order them to surrender', check: { skill: 'command', difficulty: 'hard' }, success: 'surrendered', failure: 'fight' }
      ]
    },
    fight: { type: 'combat', enemies: [{ faction: 'orion', ship: 'medium' }, { faction: 'orion', ship: 'light' }], win: 'won', flee: 'fled', surrender: 'surrendered' },
    won: { type: 'end', result: 'success', text: 'The raiders are finished. Shipping lanes through {target} are safe again, and the freighter crews send their thanks.' },
    surrendered: { type: 'end', result: 'success', text: 'The raiders power down and surrender. Their captains will stand trial, and their logs will lead Starfleet to three more crews.', effects: { renown: 4 } },
    fled: { type: 'end', result: 'failure', text: 'You break off. The raiders will be back.' },
    hostages: {
      type: 'scene', image: 'ship_orion',
      text: 'The raiders have a hostage: the crew of the freighter they just captured, held in their cargo bay. "Come closer and they go out the airlock, Starfleet."',
      choices: [
        { label: 'Beam the hostages out, then attack', check: { skill: 'engineering', difficulty: 'hard' }, success: 'rescued', failure: 'hostage_fight' },
        { label: 'Negotiate for their release', next: 'talks' }
      ]
    },
    rescued: { type: 'scene', image: 'ship_orion', text: 'The hostages shimmer out of the pirate cargo bay and onto your transporter pads. Now there is nothing holding you back.', choices: [{ label: 'Open fire', next: 'fight' }] },
    hostage_fight: { type: 'scene', image: 'ship_orion', text: 'The transporter lock fails. The pirates panic, and panicking pirates shoot.', effects: { morale: -5 }, choices: [{ label: 'Engage before they can hurt anyone else', next: 'fight' }] },
    talks: { type: 'negotiation', party: 'orion', topic: 'the hostages', text: 'The pirate captain grins. "Let\'s talk business."', rounds: 5, difficulty: 'hard', win: 'freed', lose: 'hostage_fight' },
    freed: { type: 'end', result: 'success', text: 'The hostages are released and the raiders leave the system for good, with a promise you intend to hold them to.', effects: { renown: 3, relation: { orion: 3 } } }
  }
});

ST.content.register({
  kind: 'mission', id: 'derelict_datacore', category: 'recover', weight: 3,
  title: 'The lost {vessel}',
  briefing: 'The survey ship {vessel} vanished near {target} two years ago. A freighter has just reported seeing her, adrift. Recover her computer core and bring it to {base}.',
  slots: {
    target: { type: 'system', minJumps: 1, maxJumps: 4, faction: 'none' },
    base: { type: 'system', minJumps: 0, maxJumps: 9, has: 'starbase', allowCurrent: true },
    vessel: { type: 'text', options: ['U.S.S. Tesla', 'U.S.S. Vico', 'U.S.S. Raman', 'U.S.S. Yosemite', 'U.S.S. Hathaway'] },
    rival: { type: 'faction', oneOf: ['romulan', 'cardassian', 'klingon'], prefer: 'hostile' }
  },
  deadline: [12, 18],
  rewards: { renown: 12, latinum: 25 },
  penalties: { renown: -5 },
  twists: [{ id: 'rival', chance: 0.45 }],
  stages: [
    { id: 'find', objective: 'Find the {vessel} at {target}', trigger: { on: 'arrive', slot: 'target' }, node: 'found' },
    { id: 'return', objective: 'Deliver the data core to {base}', trigger: { on: 'dock', slot: 'base' }, node: 'deliver' }
  ],
  nodes: {
    found: {
      type: 'scene', image: 'derelict',
      text: 'The {vessel} drifts at the edge of the system, lights out, hull intact. Whatever happened to her crew, it did not involve weapons fire.',
      choices: [{ label: 'Send an away team', next: 'team' }]
    },
    team: { type: 'away_team', image: 'derelict', text: 'Environment suits and tricorders. Keep your wits about you.', size: [2, 3], recommend: ['engineering', 'science', 'medicine'], next: 'inside' },
    inside: {
      type: 'scene', image: 'derelict',
      text: '{away.leader} reports: "No crew. No bodies. The logs just stop. Main power is dead, and the computer core is in engineering behind a jammed bulkhead."',
      choices: [
        { label: 'Restore auxiliary power to open the bulkhead', check: { skill: 'engineering', difficulty: 'moderate', team: 'away' }, success: 'core', failure: 'core_hard' },
        { label: 'Read the last sensor logs first', check: { skill: 'science', difficulty: 'moderate', team: 'away' }, success: 'logs', failure: 'core_hard' }
      ]
    },
    logs: {
      type: 'scene', image: 'derelict',
      text: 'The last sensor log shows the crew beaming down to a planet that is no longer there. The entire world vanished, and them with it. {away.leader} goes very quiet.',
      effects: { renown: 3 },
      choices: [{ label: 'Retrieve the core and get off this ship', next: 'core' }]
    },
    core_hard: { type: 'scene', image: 'derelict', text: 'A power surge arcs across the corridor. The team pushes through, singed but determined.', effects: { injure: { who: 'away', severity: 'injured' } }, choices: [{ label: 'Pull the core', next: 'core' }] },
    core: { type: 'branch', if: { twist: 'rival' }, then: 'rival', else: 'got' },
    got: { type: 'advance', text: 'The data core is secured aboard. Starfleet wants it delivered to {base}.', effects: { items: { add: ['data_core'] } } },
    rival: {
      type: 'scene', image: '{rival.portrait}', speaker: '{rival.leader} · {rival.vessel}',
      text: 'As the team beams back, a {rival} warship arrives. "That vessel was lost in {rival.name} space. Its data belongs to us. Hand over the core."',
      effects: { items: { add: ['data_core'] } },
      choices: [
        { label: '"The {vessel} is a Federation ship. The core stays with us."', check: { skill: 'command', difficulty: 'moderate' }, success: 'rival_back', failure: 'rival_fight' },
        { label: 'Offer them a copy of the non-military data', check: { skill: 'diplomacy', difficulty: 'moderate' }, success: 'rival_share', failure: 'rival_fight' },
        { label: 'Leave at maximum warp', next: 'rival_fight' }
      ]
    },
    rival_back: { type: 'advance', text: 'A tense silence, then the {rival} ship withdraws. Now get the core to {base}.', effects: { relation: { rival: -2 } } },
    rival_share: { type: 'advance', text: 'The {rival} commander accepts a sanitised copy. Everyone saves face. Now get the core to {base}.', effects: { relation: { rival: 4 } } },
    rival_fight: { type: 'combat', enemies: [{ faction: '{rival}', ship: 'light' }], win: 'rival_won', flee: 'rival_fled', surrender: 'rival_won' },
    rival_won: { type: 'advance', text: 'The {rival} ship retreats. The core is yours. Now get it to {base}.', effects: { relation: { rival: -5 } } },
    rival_fled: { type: 'advance', text: 'You escape with the core, and a new enemy. Get it to {base}.' },
    deliver: { type: 'end', result: 'success', image: 'starbase', text: 'Starfleet engineers take the core away under guard. Whatever happened to the {vessel}, her crew will not be forgotten.', effects: { items: { remove: ['data_core'] } } }
  }
});

ST.content.register({
  kind: 'mission', id: 'plague_outbreak', category: 'medical', weight: 2,
  title: 'Plague on {colony}',
  briefing: 'A mysterious plague is spreading through the colony at {colony}. Their doctors are overwhelmed. Starfleet Medical asks for your help, and quickly.',
  slots: {
    colony: { type: 'system', minJumps: 1, maxJumps: 4, has: 'colony' },
    source: { type: 'system', minJumps: 1, maxJumps: 4, has: 'planet:Y,J,N' }
  },
  deadline: [16, 22],
  rewards: { renown: 14 },
  penalties: { renown: -8, morale: -6 },
  stages: [
    { id: 'assess', objective: 'Reach the colony at {colony} and assess the plague', trigger: { on: 'arrive', slot: 'colony' }, node: 'assess' },
    { id: 'collect', objective: 'Collect the rare compound from {source}', trigger: { on: 'arrive', slot: 'source' }, node: 'collect' },
    { id: 'cure', objective: 'Return to {colony} with the compound', trigger: { on: 'arrive', slot: 'colony' }, node: 'cure' }
  ],
  nodes: {
    assess: {
      type: 'scene', image: 'surface_colony',
      text: 'The colony infirmary is full. {officer.medicine} studies the pathogen for hours. "It\'s a retrovirus, and it\'s adapting to every treatment. But it has a weakness: it can\'t survive an isoboramine compound, and the only natural source in range is the upper atmosphere of a world in the {source} system."',
      choices: [
        { label: 'Leave a medical team to slow the spread, then go', check: { skill: 'medicine', difficulty: 'moderate' }, success: 'slowed', failure: 'go' },
        { label: 'Go immediately', next: 'go' }
      ]
    },
    slowed: { type: 'advance', text: 'Your medics stabilise the worst cases. It buys the colony time. Now for {source}.', effects: { xp: 10 } },
    go: { type: 'advance', text: 'There is no time to lose. Set course for {source}.' },
    collect: {
      type: 'scene', image: '{source}',
      text: 'The compound drifts in thin bands, high in a hostile atmosphere. Collecting it will mean flying a shuttle, or the whole ship, dangerously deep.',
      choices: [
        { label: 'Take the ship in and scoop it with the Bussard collectors', check: { skill: 'command', difficulty: 'moderate' }, success: 'got', failure: 'got_hurt' },
        { label: 'Send a shuttle with a skilled pilot', check: { skill: 'engineering', difficulty: 'moderate' }, success: 'got', failure: 'shuttle_hurt' }
      ]
    },
    got: { type: 'advance', text: 'The collectors fill with the precious compound. Back to {colony}.', effects: { items: { add: ['cure_sample'] } } },
    got_hurt: { type: 'advance', text: 'The atmosphere batters the ship, but you get the compound. Back to {colony}.', effects: { items: { add: ['cure_sample'] }, hull: -12, damage: { system: 'engines', amount: 20 } } },
    shuttle_hurt: { type: 'advance', text: 'The shuttle limps home with the compound and an injured pilot. Back to {colony}.', effects: { items: { add: ['cure_sample'] }, injure: { who: 'random', severity: 'injured' }, spares: -2 } },
    cure: {
      type: 'scene', image: 'surface_colony',
      text: 'Now the hard part: synthesising a cure from the raw compound, fast enough to matter.',
      choices: [
        { label: 'Synthesise the cure', check: { skill: 'medicine', difficulty: 'moderate' }, success: 'cured', failure: 'cured_late' }
      ]
    },
    cured: { type: 'end', result: 'success', text: 'The cure works. Within days, the infirmary empties. The colonists name their new hospital after the ship.', effects: { items: { remove: ['cure_sample'] }, morale: 8 } },
    cured_late: { type: 'end', result: 'success', text: 'The cure works, eventually. Too late for some. But the colony will live.', effects: { items: { remove: ['cure_sample'] }, renown: -4 } }
  }
});
