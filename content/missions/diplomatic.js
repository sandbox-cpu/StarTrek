/* Diplomatic missions: first contact, the Prime Directive, escort, mediation,
   trade and alliances. Pure data — see docs/MISSION_AUTHORING.md. */

ST.content.register({
  kind: 'mission', id: 'first_contact', category: 'first_contact', weight: 4,
  title: 'First contact: the {contact.plural}',
  briefing: 'Long-range sensors have detected warp signatures from the {target} system. The {contact.plural} are a species unknown to the Federation. Make first contact, and make a good impression. There is only one chance at a first one.',
  slots: {
    contact: { type: 'species', prewarp: false },
    target: { type: 'system', homeOf: 'contact' }
  },
  rewards: { renown: 16 },
  penalties: { renown: -6 },
  twists: [{ id: 'wary', chance: 0.3 }, { id: 'test', chance: 0.25 }],
  stages: [
    { id: 'contact', objective: 'Make first contact with the {contact.plural} at {target}', trigger: { on: 'arrive', slot: 'target' }, node: 'arrive' }
  ],
  nodes: {
    arrive: { type: 'branch', if: { twist: 'wary' }, then: 'wary', else: 'greet' },
    wary: {
      type: 'scene', image: 'ship_unknown',
      text: 'Three {contact} ships swing out to meet you, weapons charged. Their signal is a single phrase, repeated: *identify or be fired upon.*',
      choices: [
        { label: 'Lower shields as a gesture of peace', check: { skill: 'diplomacy', difficulty: 'moderate' }, success: 'greet', failure: 'shots' },
        { label: 'Transmit the Federation\'s first-contact protocols', check: { skill: 'science', difficulty: 'moderate' }, success: 'greet', failure: 'shots' },
        { label: 'Hold position, shields up, and wait', check: { skill: 'command', difficulty: 'moderate' }, success: 'greet', failure: 'shots' }
      ]
    },
    shots: {
      type: 'scene', image: 'ship_unknown', effects: { shields: -30, hull: -6 },
      text: 'A warning volley rocks the ship. {officer.tactics} has a firing solution ready. "Your orders, Captain?"',
      choices: [
        { label: '"Hold your fire." Keep hailing', check: { skill: 'diplomacy', difficulty: 'moderate' }, success: 'greet', failure: 'fight' },
        { label: 'Return fire', next: 'fight' }
      ]
    },
    fight: { type: 'combat', text: 'First contact has gone badly wrong.', enemies: [{ faction: '{contact}', ship: 'light', count: 2 }], win: 'war', flee: 'retreat', surrender: 'greet' },
    war: { type: 'end', result: 'failure', text: 'You win the battle and lose everything else. The {contact.plural} now know the Federation as the people who fired on them.', effects: { relation: { contact: -40 } } },
    retreat: { type: 'end', result: 'failure', text: 'You withdraw. Perhaps another captain, another day.', effects: { relation: { contact: -10 } } },
    greet: {
      type: 'scene', image: '{contact.portrait}', speaker: '{contact.leader} · {contact.name}',
      text: 'The viewscreen flickers. The {contact.plural} are {contact.look}. Their envoy studies you for a long, silent moment.\n\n"We have listened to your transmissions for many years, Federation. We have many questions. First: why should we trust you?"',
      choices: [
        { label: 'Open formal talks', next: 'check_test' },
        { label: 'Share the history of the Federation, the good and the bad', check: { skill: 'diplomacy', difficulty: 'moderate' }, success: 'honest', failure: 'check_test' }
      ]
    },
    honest: { type: 'scene', image: '{contact.portrait}', speaker: '{contact.leader}', text: '"You tell us of your wars as well as your peace. That is... unusual. We will talk."', effects: { relation: { contact: 8 } }, choices: [{ label: 'Begin talks', next: 'check_test' }] },
    check_test: { type: 'branch', if: { twist: 'test' }, then: 'test', else: 'talks' },
    test: {
      type: 'scene', image: '{contact.portrait}', speaker: '{contact.leader}',
      text: '"Before we speak of treaties, a test. Our world has a sickness in its southern seas, a bloom that is killing our fisheries. Our scientists cannot stop it. Can you?"',
      choices: [
        { label: 'Offer your medical and science teams', check: { skill: 'medicine', difficulty: 'moderate' }, success: 'test_ok', failure: 'test_bad' },
        { label: 'Model the bloom with the ship\'s computer', check: { skill: 'science', difficulty: 'moderate' }, success: 'test_ok', failure: 'test_bad' }
      ]
    },
    test_ok: { type: 'scene', image: 'planet_o', text: 'Your teams identify an engineered algae and neutralise it within a day. The {contact.plural} are deeply impressed.', effects: { relation: { contact: 15 }, time: 1 }, choices: [{ label: 'Return to the talks', next: 'talks' }] },
    test_bad: { type: 'scene', image: 'planet_o', text: 'Your efforts slow the bloom, but do not stop it. The {contact.plural} are polite about it.', effects: { time: 1 }, choices: [{ label: 'Return to the talks', next: 'talks' }] },
    talks: { type: 'negotiation', party: '{contact}', topic: 'first contact', text: 'The envoy folds their hands. "Speak, and we will listen."', rounds: 6, difficulty: 'moderate', win: 'friends', lose: 'cool' },
    friends: { type: 'end', result: 'success', image: '{contact.portrait}', text: 'The {contact.name} agrees to open relations with the Federation. An embassy will follow. Today, the galaxy got a little less lonely.', effects: { relation: { contact: 20 }, morale: 8 } },
    cool: { type: 'end', result: 'success', text: 'The {contact.plural} are not ready for more than a cautious hello. It is still a hello.', effects: { relation: { contact: 5 }, renown: -8 } }
  }
});

ST.content.register({
  kind: 'mission', id: 'prime_directive', category: 'first_contact', weight: 3,
  title: 'The Prime Directive',
  briefing: 'A pre-warp civilisation, the {people.plural}, lives in the {target} system. Starfleet has just learned that a large asteroid is on a collision course with their world. By the Prime Directive, you may not reveal yourselves. You may still be able to help.',
  slots: {
    people: { type: 'species', prewarp: true },
    target: { type: 'system', homeOf: 'people' }
  },
  deadline: [13, 18],
  rewards: { renown: 14 },
  penalties: { renown: -8 },
  stages: [
    { id: 'save', objective: 'Reach {target} and deal with the asteroid, unseen', trigger: { on: 'arrive', slot: 'target' }, node: 'arrive' }
  ],
  nodes: {
    arrive: {
      type: 'scene', image: 'asteroids',
      text: 'The asteroid is twelve kilometres across and forty hours from impact. On the planet below, the {people.plural} have just noticed it. Their astronomers are watching, and they have telescopes.',
      choices: [
        { label: 'Nudge it off course with the tractor beam, slowly and invisibly', check: { skill: 'engineering', difficulty: 'hard' }, success: 'saved', failure: 'seen' },
        { label: 'Break it up with torpedoes from behind their moon', cost: { torpedoes: 6 }, check: { skill: 'tactics', difficulty: 'moderate' }, success: 'saved', failure: 'fragments' },
        { label: 'Hollow it out with phasers and let it burn up', check: { skill: 'science', difficulty: 'hard' }, success: 'saved', failure: 'fragments' },
        { label: 'Do nothing. It is not our place', next: 'nothing' }
      ]
    },
    saved: { type: 'end', result: 'success', image: '{target}', text: 'The asteroid slides past the planet with room to spare. The {people.plural} will call it a miracle, or luck, or the will of their gods. They will never know about you, and that is the point.', effects: { xp: 20, morale: 6 } },
    fragments: { type: 'end', result: 'success', text: 'The asteroid breaks up, but some fragments get through. Several cities are hit. The {people.plural} survive, scarred.', effects: { renown: -6, morale: -6 } },
    seen: {
      type: 'scene', image: '@location',
      text: 'The asteroid turns aside, but not before an observatory photographs your ship against the stars. Their news broadcasts are full of it: a vessel from the heavens.',
      choices: [
        { label: 'Leave, and let it fade into legend', effects: { renown: -4 }, next: 'legend' },
        { label: 'Send a disguised team to discredit the photographs', check: { skill: 'diplomacy', difficulty: 'hard' }, success: 'covered', failure: 'legend' }
      ]
    },
    covered: { type: 'end', result: 'success', text: 'A few carefully placed "experts" explain it away as a lens flaw. The {people.plural} move on. The world is saved.' },
    legend: { type: 'end', result: 'success', text: 'The world is saved. The {people.plural} will tell stories of the sky ship for generations. Starfleet will want a full report.' },
    nothing: { type: 'end', result: 'failure', text: 'You watch from behind the moon as the asteroid strikes. The Prime Directive is intact. Your crew does not speak to you for days.', effects: { morale: -15 } }
  }
});

ST.content.register({
  kind: 'mission', id: 'ambassador_escort', category: 'escort', weight: 3,
  title: 'Envoy to the {f.name}',
  briefing: 'Ambassador {amb} must reach {target} for talks with the {f.name}. Their government has agreed to hear the Federation out, and Starfleet wants you at the table.',
  slots: {
    f: { type: 'faction', oneOf: ['klingon', 'romulan', 'cardassian', 'ferengi'] },
    target: { type: 'system', homeOf: 'f' },
    amb: { type: 'name' }
  },
  deadline: [15, 21],
  onAccept: { items: { add: ['ambassador'] } },
  rewards: { renown: 13 },
  penalties: { renown: -6 },
  twists: [{ id: 'assassin', chance: 0.3 }],
  stages: [
    { id: 'deliver', objective: 'Escort Ambassador {amb} to {target}', trigger: { on: 'arrive', slot: 'target' }, node: 'arrive' }
  ],
  nodes: {
    arrive: { type: 'branch', if: { twist: 'assassin' }, then: 'assassin', else: 'summit' },
    assassin: {
      type: 'scene', speaker: '{officer.tactics}',
      text: '"Captain, security alert. Someone has tampered with the transporter logs. I think there\'s an assassin aboard, and the ambassador is the target."',
      choices: [
        { label: 'Lock down the ship and search deck by deck', check: { skill: 'tactics', difficulty: 'moderate' }, success: 'caught', failure: 'wounded' },
        { label: 'Use the ambassador as bait', check: { skill: 'command', difficulty: 'hard' }, success: 'caught', failure: 'wounded' }
      ]
    },
    caught: { type: 'scene', text: 'Security catches the assassin, a disguised agent from a faction that wants the talks to fail. The ambassador is shaken but unhurt.', effects: { renown: 3 }, choices: [{ label: 'Proceed to the talks', next: 'summit' }] },
    wounded: { type: 'scene', text: 'The assassin is caught, but not before Ambassador {amb} is wounded. They insist on going ahead, bandaged and furious.', effects: { injure: { who: 'tactics', severity: 'injured' } }, choices: [{ label: 'Proceed to the talks', next: 'summit' }] },
    summit: { type: 'negotiation', party: '{f}', topic: 'a treaty of friendship', text: 'Ambassador {amb} leans over. "I\'ll open, Captain, but they respect ship captains here. You lead."', rounds: 6, difficulty: 'hard', win: 'treaty', lose: 'failed' },
    treaty: { type: 'end', result: 'success', text: 'The treaty is signed. Ambassador {amb} shakes your hand and says they will mention you in the report. They do, glowingly.', effects: { relation: { f: 12 } } },
    failed: { type: 'end', result: 'failure', text: 'The talks collapse. Ambassador {amb} is gracious about it, but the Federation Council will not be.', effects: { relation: { f: -3 } } }
  }
});

ST.content.register({
  kind: 'mission', id: 'border_mediation', category: 'mediate', weight: 2,
  title: 'Standoff at {target}',
  briefing: 'The {a.name} and the {b.name} both claim the {target} system. Their warships are facing off there right now, and one wrong move will start a war. The Federation has offered to mediate.',
  slots: {
    a: { type: 'faction', oneOf: ['klingon', 'romulan', 'cardassian', 'ferengi'] },
    b: { type: 'faction', oneOf: ['klingon', 'romulan', 'cardassian', 'ferengi'] },
    target: { type: 'system', minJumps: 1, maxJumps: 5, faction: 'none' }
  },
  deadline: [9, 13],
  rewards: { renown: 15 },
  penalties: { renown: -8 },
  stages: [
    { id: 'mediate', objective: 'Mediate between the {a} and {b} ships at {target}', trigger: { on: 'arrive', slot: 'target' }, node: 'arrive' }
  ],
  nodes: {
    arrive: {
      type: 'scene', image: '@location',
      text: 'The two warships hang a few hundred kilometres apart, shields up, weapons hot. You slide the ship between them.\n\n{officer.xo}: "Well, we certainly have their attention."',
      choices: [
        { label: 'Talk to the {a} commander first', next: 'talk_a' },
        { label: 'Propose a joint survey: whoever proves the older claim keeps the system', check: { skill: 'science', difficulty: 'hard' }, success: 'survey', failure: 'talk_a' }
      ]
    },
    talk_a: { type: 'negotiation', party: '{a}', topic: 'the {target} claim', text: 'The {a} commander is the first to answer. "Speak, Federation. Briefly."', rounds: 5, difficulty: 'moderate', win: 'talk_b', lose: 'tense' },
    tense: {
      type: 'scene', image: '{b.portrait}', speaker: '{b.leader}',
      text: 'The {a} ship powers its weapons further. The {b} commander hails you urgently. "If they fire, Federation, we will answer. Choose now whose side you are on."',
      choices: [
        { label: '"Nobody\'s. Nobody fires today."', check: { skill: 'command', difficulty: 'hard' }, success: 'talk_b', failure: 'war' },
        { label: 'Position the ship to absorb the first shot', check: { skill: 'tactics', difficulty: 'moderate' }, success: 'talk_b', failure: 'war' }
      ]
    },
    talk_b: { type: 'negotiation', party: '{b}', topic: 'the {target} claim', text: 'Now the {b} commander. "Our turn, it seems."', rounds: 5, difficulty: 'moderate', win: 'peace', lose: 'half' },
    survey: { type: 'end', result: 'success', text: 'Your survey finds that neither claim is older than the ruins of a third civilisation on the fourth planet. Faced with the evidence, both sides agree to declare the system a neutral reserve. It is an elegant solution.', effects: { renown: 5, relation: { a: 5, b: 5 } } },
    peace: { type: 'end', result: 'success', text: 'Both commanders agree to withdraw and let their governments talk. Nobody gets what they wanted, which is the definition of good diplomacy.', effects: { relation: { a: 6, b: 6 } } },
    half: { type: 'end', result: 'success', text: 'The {b} ship withdraws, grudgingly. The {a} ship stays. It is not peace, but it is not war.', effects: { relation: { a: 4, b: -2 }, renown: -5 } },
    war: { type: 'end', result: 'failure', text: 'Someone fires. Within minutes both ships are burning, and a border war has begun. It will not be the last of it.', effects: { relation: { a: -10, b: -10 }, hull: -15 } }
  }
});

ST.content.register({
  kind: 'mission', id: 'ferengi_contract', category: 'trade', weight: 2, giver: 'ferengi',
  title: 'A Ferengi business proposal',
  briefing: 'DaiMon {f.leader} has offered the Federation a contract: deliver sealed cargo to a buyer at {target}. The pay is excellent. The DaiMon\'s smile is wider than seems necessary.',
  requires: { relationAtLeast: { ferengi: -15 } },
  slots: {
    f: { type: 'faction', oneOf: ['ferengi'] },
    target: { type: 'system', minJumps: 1, maxJumps: 4 }
  },
  deadline: [7, 11],
  onAccept: { items: { add: ['trade_goods'] } },
  rewards: { latinum: 90, renown: 3 },
  penalties: { relation: { ferengi: -8 } },
  twists: [{ id: 'contraband', chance: 0.4 }],
  stages: [
    { id: 'deliver', objective: 'Deliver the sealed cargo to {target}', trigger: { on: 'arrive', slot: 'target' }, node: 'arrive' }
  ],
  nodes: {
    arrive: { type: 'branch', if: { twist: 'contraband' }, then: 'contraband', else: 'handoff' },
    handoff: { type: 'end', result: 'success', text: 'The buyer takes the crates without comment and transfers payment. Easy latinum. Almost suspiciously easy.', effects: { items: { remove: ['trade_goods'] } } },
    contraband: {
      type: 'scene', image: 'portrait_ferengi',
      text: 'The buyer turns out to be an Orion arms dealer, and a routine scan shows the "farm equipment" is a crate of disruptor rifles.\n\n{officer.xo}: "Well. That explains the smile."',
      choices: [
        { label: 'Refuse the delivery and confiscate the weapons', effects: { renown: 4, relation: { f: -6 } }, next: 'refuse' },
        { label: 'Deliver it anyway. A contract is a contract', effects: { renown: -6, morale: -6 }, next: 'deliver_bad' },
        { label: 'Swap the rifles for scrap and deliver that', check: { skill: 'engineering', difficulty: 'moderate' }, success: 'swap', failure: 'refuse' }
      ]
    },
    refuse: { type: 'end', result: 'failure', text: 'The weapons are handed over to Starfleet Security. The DaiMon will not be paying, and he will not be happy.', effects: { items: { remove: ['trade_goods'] }, spares: 3 } },
    deliver_bad: { type: 'end', result: 'success', text: 'The delivery is made. The latinum is good. You try not to think about where the rifles will end up.', effects: { items: { remove: ['trade_goods'] } } },
    swap: { type: 'end', result: 'success', text: 'The dealer opens the crates to find neatly packed scrap metal. By then you are long gone, with the DaiMon\'s payment and the dealer\'s undying hatred.', effects: { items: { remove: ['trade_goods'] }, relation: { orion: -8 }, spares: 3 } }
  }
});

ST.content.register({
  kind: 'mission', id: 'blood_oath', category: 'patrol', weight: 2, giver: 'klingon',
  title: 'Blood oath',
  briefing: '{k.leader} of the Klingon Empire has asked for a Starfleet ship to join a hunt. An Orion corsair, the {prey}, raided a Klingon colony, and {k.leader} has sworn a blood oath. The hunt ends at {target}.',
  requires: { relationAtLeast: { klingon: -20 } },
  slots: {
    k: { type: 'faction', oneOf: ['klingon'] },
    target: { type: 'system', minJumps: 1, maxJumps: 5, faction: 'none' },
    prey: { type: 'text', options: ['Scarlet Maw', 'Iron Tithe', 'Widow\'s Kiss', 'Black Harrow'] }
  },
  deadline: [11, 16],
  rewards: { renown: 10, latinum: 20 },
  penalties: { relation: { klingon: -10 } },
  stages: [
    { id: 'hunt', objective: 'Meet {k.leader} and hunt the {prey} at {target}', trigger: { on: 'arrive', slot: 'target' }, node: 'arrive' }
  ],
  nodes: {
    arrive: {
      type: 'scene', image: 'portrait_klingon', speaker: '{k.leader} · {k.vessel}',
      text: '"You came! Good. The {prey} is hiding in this system, behind the gas giant. My ship will drive it into the open. Yours will make sure it does not escape. Today we honour the dead!"',
      choices: [
        { label: '"Lead the way, Commander."', next: 'fight' },
        { label: 'Suggest capturing the pirates for trial instead', check: { skill: 'diplomacy', difficulty: 'hard' }, success: 'trial', failure: 'insulted' }
      ]
    },
    insulted: { type: 'scene', image: 'portrait_klingon', speaker: '{k.leader}', text: '"Trial? This is a blood oath, not a debate!" He cuts the channel, then reopens it a moment later. "...But you came. Fight beside me, and we will speak no more of it."', effects: { relation: { klingon: -3 } }, choices: [{ label: 'Battle stations', next: 'fight' }] },
    fight: { type: 'combat', text: 'The {prey} breaks cover, and it has friends.', enemies: [{ faction: 'orion', ship: 'orion_corsair' }, { faction: 'orion', ship: 'light' }], win: 'victory', flee: 'coward' },
    trial: { type: 'combat', text: 'The {prey} will not go quietly. Disable it and the Klingons will allow a trial.', enemies: [{ faction: 'orion', ship: 'orion_corsair' }], win: 'victory', flee: 'coward', surrender: 'captured' },
    victory: { type: 'end', result: 'success', image: 'portrait_klingon', speaker: '{k.leader}', text: '"The {prey} is ash, and our dead can rest! You fought well, Starfleet. You will always have a place at my table."', effects: { relation: { klingon: 12 }, morale: 5 } },
    captured: { type: 'end', result: 'success', image: 'portrait_klingon', speaker: '{k.leader}', text: '"A Klingon trial, then. They will wish we had killed them." He sounds almost pleased. "You are a strange people, but brave."', effects: { relation: { klingon: 8 }, renown: 5 } },
    coward: { type: 'end', result: 'failure', text: 'You break off. {k.leader} finishes the fight alone and will not answer your hails afterwards.' }
  }
});
