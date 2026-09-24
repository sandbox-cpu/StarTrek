/* Random events that happen in deep space between systems (context "travel").
   Pure data — see docs/MISSION_AUTHORING.md for the format. */

ST.content.register({
  kind: 'event', id: 'ion_storm', context: 'travel', weight: 3, title: 'Ion storm', start: 'a',
  slots: { n: { type: 'number', min: 3, max: 8 } },
  nodes: {
    a: {
      type: 'scene', image: 'ion_storm',
      text: 'The helm alarm chimes. A class-{n} ion storm has boiled out of subspace directly across your heading.\n\n{officer.engineering} calls up from main engineering. "We can punch through it, Captain, but it will be a rough ride. Or we lose a day going around."',
      choices: [
        { label: 'Punch through with shields angled forward', check: { skill: 'engineering', difficulty: 'moderate' }, success: 'through_ok', failure: 'through_bad' },
        { label: 'Plot a course around the storm', effects: { time: 1 }, next: 'around' },
        { label: 'Hold at the edge and study it', check: { skill: 'science', difficulty: 'hard' }, success: 'study_ok', failure: 'study_bad' }
      ]
    },
    through_ok: { type: 'end', text: 'The ship bucks and groans, but the shields hold. You come out the far side with nothing worse than a few blown relays.', effects: { shields: -20, xp: 8 } },
    through_bad: { type: 'end', text: 'A surge arcs through the power conduits. Consoles blow out on deck four and damage control teams scramble.', effects: { hull: -12, damage: { system: 'random', amount: 25 }, crew: -2 } },
    around: { type: 'end', text: 'You swing wide around the storm and lose most of a day. Better late than scorched.' },
    study_ok: { type: 'end', text: '{officer.science} captures the storm\'s birth in extraordinary detail. The data goes out to the Daystrom Institute with your compliments.', effects: { renown: 3, xp: 12 } },
    study_bad: { type: 'end', text: 'A tendril of the storm lashes out and catches the ship. The sensor pallets take the worst of it.', effects: { shields: -30, hull: -5, damage: { system: 'sensors', amount: 30 } } }
  }
});

ST.content.register({
  kind: 'event', id: 'escape_pod', context: 'travel', weight: 2, title: 'Escape pod', start: 'a',
  slots: { who: { type: 'name' } },
  nodes: {
    a: {
      type: 'scene', image: 'derelict',
      text: 'A weak distress beacon. Sensors find a single escape pod tumbling through the void, its life support nearly exhausted. One lifesign, fading.',
      choices: [
        { label: 'Beam the survivor straight to sickbay', check: { skill: 'medicine', difficulty: 'easy' }, success: 'saved', failure: 'lost' },
        { label: 'Scan the pod first. Something feels wrong', check: { skill: 'science', difficulty: 'moderate' }, success: 'suspicious', failure: 'saved' },
        { label: 'Log the position for the next freighter and move on', effects: { morale: -4 }, next: 'leave' }
      ]
    },
    saved: {
      type: 'scene', image: 'portrait_alien1',
      text: 'The survivor is {who}, a freighter pilot whose ship was torn apart by raiders. Grateful beyond words, they insist you take the coordinates of the raiders\' hidden cache.',
      choices: [
        { label: 'Thank them and log the coordinates', effects: { reveal: 'nearby', renown: 2 }, next: 'end_ok' },
        { label: 'Offer them passage to the next starbase', effects: { morale: 4, renown: 3 }, next: 'end_ok' }
      ]
    },
    suspicious: {
      type: 'scene',
      text: 'The pod\'s power signature is too clean for a wreck. {officer.science} finds a subspace transmitter hidden in the hull, broadcasting your position.\n\nThe "survivor" is an Orion lookout.',
      choices: [
        { label: 'Beam them to the brig and interrogate them', check: { skill: 'command', difficulty: 'moderate' }, success: 'intel', failure: 'silent' },
        { label: 'Destroy the transmitter and leave them adrift with a beacon', effects: { morale: -2 }, next: 'end_ok' }
      ]
    },
    intel: { type: 'end', text: 'Faced with a Starfleet brig or an Orion boss who does not forgive failure, the lookout talks. You learn the raiders\' patrol routes.', effects: { reveal: 'nearby', renown: 3, relation: { orion: -5 } } },
    silent: { type: 'end', text: 'The prisoner says nothing useful. You hand them over at the next opportunity.', effects: { relation: { orion: -3 } } },
    lost: { type: 'end', text: 'Despite everything sickbay tries, the survivor dies within the hour. Their name was {who}. You log it so someone, somewhere, will know.', effects: { morale: -5 } },
    leave: { type: 'end', text: 'You transmit the pod\'s position on all frequencies and resume course. The bridge is quiet for a long time.' },
    end_ok: { type: 'end', text: 'The ship resumes course.' }
  }
});

ST.content.register({
  kind: 'event', id: 'subspace_eddy', context: 'travel', weight: 2, title: 'Subspace eddy', start: 'a',
  nodes: {
    a: {
      type: 'scene', image: 'warp',
      text: 'The warp field flutters. You have strayed into a subspace eddy, a current in the fabric of space.\n\n{officer.xo}: "Helm says we could ride it. It might carry us a long way, fast. Or it might spit us out somewhere unpleasant."',
      choices: [
        { label: 'Ride the current', check: { skill: 'command', difficulty: 'moderate' }, success: 'ride_ok', failure: 'ride_bad' },
        { label: 'Drop out of warp and wait for it to pass', effects: { time: 0.5 }, next: 'wait' }
      ]
    },
    ride_ok: { type: 'end', text: 'The eddy flings you forward like a stone from a sling. The warp coils barely draw power for hours.', effects: { dilithium: 3, xp: 6 } },
    ride_bad: { type: 'end', text: 'The current twists. The inertial dampers lag for half a second, long enough to throw half the crew across their stations.', effects: { hull: -8, damage: { system: 'engines', amount: 20 }, injure: { who: 'random', severity: 'injured' } } },
    wait: { type: 'end', text: 'You sit it out at impulse. Boring, and perfectly safe.' }
  }
});

ST.content.register({
  kind: 'event', id: 'dilithium_comet', context: 'travel', weight: 2, title: 'Rogue comet', start: 'a',
  nodes: {
    a: {
      type: 'scene', image: 'asteroids',
      text: 'Long-range sensors pick up a rogue comet on a hyperbolic path through the sector. Its core is laced with dilithium.',
      choices: [
        { label: 'Match velocity and mine it with the phasers', check: { skill: 'engineering', difficulty: 'moderate' }, success: 'mine_ok', failure: 'mine_bad' },
        { label: 'Take spectrographic readings only', effects: { renown: 1, xp: 5 }, next: 'look' },
        { label: 'Ignore it', next: 'skip' }
      ]
    },
    mine_ok: { type: 'end', text: 'A delicate bit of work. You cut free a chunk of raw dilithium and tractor it into the cargo bay.', effects: { dilithium: 8, time: 0.5 } },
    mine_bad: { type: 'end', text: 'The comet fractures under the phaser fire and a slab of ice slams into the forward shields. You salvage a little.', effects: { dilithium: 3, shields: -25, hull: -4, time: 0.5 } },
    look: { type: 'end', text: 'The readings are logged for the Federation Astronomical Survey.' },
    skip: { type: 'end', text: 'The comet dwindles astern.' }
  }
});

ST.content.register({
  kind: 'event', id: 'pirate_ambush', context: 'travel', weight: 2, title: 'Ambush', start: 'a',
  requires: { locationFaction: ['none', 'ferengi'] },
  slots: { boss: { type: 'faction', oneOf: ['orion'] } },
  nodes: {
    a: {
      type: 'scene', image: 'ship_orion', speaker: '{boss.leader} · {boss.vessel}',
      text: 'Two ships drop out of warp on either side of you, weapons hot. The viewscreen fills with a grinning Orion face.\n\n"Nice ship, Starfleet. Tell you what. Drop your cargo and a little latinum, and we all go home happy."',
      choices: [
        { label: 'Pay them off', cost: { latinum: 40 }, next: 'paid' },
        { label: '"You have ten seconds to leave." (Bluff)', check: { skill: 'command', difficulty: 'hard' }, success: 'bluff_ok', failure: 'fight' },
        { label: 'Red alert. Shields up', next: 'fight' }
      ]
    },
    paid: { type: 'end', text: 'The latinum is beamed across. The raiders laugh and vanish into the dark. The crew grumbles for days.', effects: { morale: -6 } },
    bluff_ok: { type: 'end', text: 'Something in your voice convinces them this is not worth it. The raiders break away and scatter.', effects: { renown: 2, xp: 10 } },
    fight: { type: 'combat', text: 'The Orion ships open fire.', enemies: [{ faction: 'orion', ship: 'light', count: 2 }], win: 'won', flee: 'fled' },
    won: { type: 'end', text: 'The last raider breaks apart. Sensors pick up their stolen cargo drifting in the wreckage.', effects: { latinum: 25, relation: { orion: -5 } } },
    fled: { type: 'end', text: 'You leave the raiders behind at high warp.' }
  }
});

ST.content.register({
  kind: 'event', id: 'ferengi_merchant', context: 'travel', weight: 2, title: 'A business opportunity', start: 'a',
  slots: { f: { type: 'faction', oneOf: ['ferengi'], present: false } },
  nodes: {
    a: {
      type: 'scene', image: 'portrait_ferengi', speaker: '{f.leader} · {f.vessel}',
      text: '"Starfleet! What luck. I am {f.leader}, purveyor of fine goods. My hold is full of dilithium, torpedo casings and replicator parts, and my heart is full of generosity. Almost full. Shall we talk?"',
      choices: [
        { label: 'Open a trade channel', effects: { openTrade: true }, next: 'trade' },
        { label: '"What else have you got in that hold?"', check: { skill: 'science', difficulty: 'moderate' }, success: 'scan_ok', failure: 'scan_bad' },
        { label: 'Politely decline', next: 'no' }
      ]
    },
    trade: { type: 'end', text: '"Excellent, excellent! Remember, the Rules of Acquisition say a deal is a deal. Until a better one comes along."' },
    scan_ok: {
      type: 'scene', image: 'portrait_ferengi', speaker: '{f.leader}',
      text: 'Your sensors find a sealed compartment full of stolen Federation medical supplies. The DaiMon\'s ears go pale.\n\n"A misunderstanding! A gift, really. For you. Free of charge."',
      choices: [
        { label: 'Accept the "gift" and let him go', effects: { spares: 4, morale: 3, relation: { f: 3 } }, next: 'gift' },
        { label: 'Report him to Starfleet', effects: { renown: 3, relation: { f: -8 } }, next: 'report' }
      ]
    },
    scan_bad: { type: 'end', text: 'The DaiMon\'s shielding is better than your scan. He notices the attempt and cuts the channel in a huff.', effects: { relation: { f: -3 } } },
    gift: { type: 'end', text: 'The supplies are beamed aboard. The Ferengi departs at a speed that would impress a Klingon.' },
    report: { type: 'end', text: 'You file the report. Somewhere, a Ferengi liquidator is going to have a very good day.' },
    no: { type: 'end', text: '"Your loss, hew-mon!"' }
  }
});

ST.content.register({
  kind: 'event', id: 'temporal_echo', context: 'travel', weight: 1, title: 'Déjà vu', start: 'a',
  nodes: {
    a: {
      type: 'scene', image: 'rift',
      text: 'You are sitting in your ready room when the door chimes. {officer.xo} enters and says, "Captain, we\'re picking up a strange temporal distortion."\n\nYou have the overwhelming feeling this exact conversation has happened before. Several times.',
      choices: [
        { label: '"This has happened before. We\'re in a loop. Leave a message for ourselves"', check: { skill: 'science', difficulty: 'moderate' }, success: 'break', failure: 'loop' },
        { label: 'Order an immediate full stop', check: { skill: 'command', difficulty: 'hard' }, success: 'break', failure: 'loop' }
      ]
    },
    loop: {
      type: 'scene', image: 'rift',
      text: 'The door chimes. {officer.xo} enters and says, "Captain, we\'re picking up a strange temporal distortion."\n\nThe feeling is stronger now. On your desk sits a note, in your own handwriting: *DECOMPRESS SHUTTLE BAY 2.*',
      choices: [
        { label: 'Decompress shuttle bay two', next: 'escape' },
        { label: 'Ignore the note', effects: { time: 1, morale: -5 }, next: 'escape_slow' }
      ]
    },
    break: { type: 'end', text: 'Acting on a hunch you cannot explain, you shift course a fraction of a degree. The distortion slides past harmlessly. Later, the chronometers show the ship lost eleven hours that nobody remembers.', effects: { renown: 2, xp: 12 } },
    escape: { type: 'end', text: 'The blast of escaping air pushes the ship clear of a collision you never saw coming. The loop breaks. The chronometers say you spent three days in it.', effects: { time: 3, spares: -1 } },
    escape_slow: { type: 'end', text: 'You go around again, and again, until someone finally reads the note. It takes a long time to get the crew to stop saying "haven\'t we done this before?"', effects: { time: 2 } }
  }
});

ST.content.register({
  kind: 'event', id: 'crew_illness', context: 'travel', weight: 2, title: 'Outbreak', start: 'a',
  nodes: {
    a: {
      type: 'scene',
      text: 'Sickbay reports a dozen crew with high fevers and strange blue blotches. {officer.medicine} suspects a virus picked up on your last stop. It is spreading fast.',
      choices: [
        { label: 'Quarantine the affected decks and work on a treatment', check: { skill: 'medicine', difficulty: 'moderate' }, success: 'cured', failure: 'spread' },
        { label: 'Have engineering flood the ship with an anti-viral field', check: { skill: 'engineering', difficulty: 'hard' }, success: 'cured', failure: 'spread' }
      ]
    },
    cured: { type: 'end', text: 'The treatment works. Within a day the blotches fade and the jokes about looking like a Bolian begin.', effects: { xp: 12, morale: 2 } },
    spread: { type: 'end', text: 'It takes three days and the whole medical staff to beat it. The crew is exhausted, and two elderly crew members do not recover.', effects: { time: 2, crew: -2, morale: -8, injure: { who: 'medicine', severity: 'injured' } } }
  }
});

ST.content.register({
  kind: 'event', id: 'warp_core_flux', context: 'travel', weight: 2, title: 'Warp core fluctuation', start: 'a',
  nodes: {
    a: {
      type: 'scene', image: 'warp',
      text: 'The deck plates hum a little too loud. {officer.engineering}: "Captain, the matter/antimatter ratio is drifting. I can recalibrate on the fly, or we drop out of warp and do it by the book."',
      choices: [
        { label: '"Recalibrate on the fly."', check: { skill: 'engineering', difficulty: 'moderate' }, success: 'ok', failure: 'bad' },
        { label: '"By the book."', effects: { time: 0.5 }, next: 'book' }
      ]
    },
    ok: { type: 'end', text: 'A few deft adjustments and the core settles down, running cleaner than it has in weeks.', effects: { dilithium: 2, xp: 10 } },
    bad: { type: 'end', text: 'The recalibration goes wrong. You have to vent plasma and burn off dilithium to keep the core from breaching.', effects: { dilithium: -5, damage: { system: 'engines', amount: 20 } } },
    book: { type: 'end', text: 'Twelve hours at impulse and the core is as good as new.' }
  }
});

ST.content.register({
  kind: 'event', id: 'energy_being', context: 'travel', weight: 1, title: 'Visitor', start: 'a', once: true,
  nodes: {
    a: {
      type: 'scene', image: 'entity',
      text: 'A shimmering cloud of light passes through the hull as if it were not there. It drifts along the corridors, through bulkheads and people alike. The crew it touches report hearing music.\n\nIt seems curious. It is also draining power from the warp core.',
      choices: [
        { label: 'Try to communicate through the deflector array', check: { skill: 'science', difficulty: 'hard' }, success: 'talk', failure: 'angry' },
        { label: 'Invite it to "listen" to the ship\'s music library', check: { skill: 'diplomacy', difficulty: 'moderate' }, success: 'music', failure: 'angry' },
        { label: 'Erect a force field around the warp core and wait it out', check: { skill: 'engineering', difficulty: 'moderate' }, success: 'leave', failure: 'angry' }
      ]
    },
    talk: { type: 'end', text: 'A pattern of harmonics, answered in kind. The being withdraws, leaving a gift: a coil of energy that tops off your reserves. Starfleet will be studying your logs for years.', effects: { renown: 6, dilithium: 6, xp: 15 } },
    music: { type: 'end', text: 'The being lingers over Bach, and longer over Klingon opera. When it finally departs, the warp core hums in a key it never used before, and the crew is in a strangely fine mood.', effects: { renown: 3, morale: 10 } },
    leave: { type: 'end', text: 'Denied its meal, the being loses interest and drifts back into space.', effects: { xp: 5 } },
    angry: { type: 'end', text: 'The light flares red. For a terrible moment every console on the ship screams. Then it is gone, and so is a chunk of your power.', effects: { dilithium: -4, shields: -40, damage: { system: 'random', amount: 20 }, injure: { who: 'random', severity: 'injured' } } }
  }
});

ST.content.register({
  kind: 'event', id: 'tribbles', context: 'travel', weight: 1, title: 'Small furry problem', start: 'a', once: true,
  nodes: {
    a: {
      type: 'scene',
      text: 'A crew member brought a tribble back from shore leave. It was pregnant. Now there are several hundred tribbles, and they are in the grain stores, the Jefferies tubes and, according to {officer.engineering}, the plasma conduits.',
      choices: [
        { label: 'Beam them into a cargo container and find them a home', check: { skill: 'science', difficulty: 'easy' }, success: 'home', failure: 'more' },
        { label: 'Hand them out to the crew as pets', effects: { morale: 8 }, next: 'pets' }
      ]
    },
    home: { type: 'end', text: 'The tribbles are gathered up, purring, and delivered to a very surprised agricultural colony. The crew misses them.', effects: { morale: 4 } },
    more: { type: 'end', text: 'You miss a few. By morning there are a few thousand. It takes two days and a lot of creative engineering to clear them out.', effects: { time: 1.5, spares: -1, morale: 3 } },
    pets: { type: 'end', text: 'Morale soars. Food stocks plummet. It is a trade you would probably make again.' }
  }
});

ST.content.register({
  kind: 'event', id: 'holodeck', context: 'travel', weight: 1, title: 'Holodeck malfunction', start: 'a',
  nodes: {
    a: {
      type: 'scene',
      text: 'The holodeck safety protocols have failed with {officer.random} inside, playing a 1940s detective story. The gangsters\' bullets are now very real, and the doors will not open.',
      choices: [
        { label: 'Have engineering cut power to the holodeck', check: { skill: 'engineering', difficulty: 'moderate' }, success: 'saved', failure: 'hurt' },
        { label: 'Walk in and play along until the story ends', check: { skill: 'command', difficulty: 'moderate' }, success: 'played', failure: 'hurt' }
      ]
    },
    saved: { type: 'end', text: 'The program collapses into a grid of yellow lines. A shaken officer walks out, still in a trench coat.', effects: { xp: 6 } },
    played: { type: 'end', text: 'You solve the case, dodge the bullets and deliver the final line. The program ends and the doors open. It becomes a ship\'s legend.', effects: { morale: 6, xp: 10 } },
    hurt: { type: 'end', text: 'It ends badly. A holographic bullet leaves a very real wound.', effects: { injure: { who: 'random', severity: 'injured' }, morale: -3 } }
  }
});

ST.content.register({
  kind: 'event', id: 'trickster', context: 'travel', weight: 0.6, title: 'An uninvited guest', start: 'a', once: true,
  nodes: {
    a: {
      type: 'scene', image: 'entity',
      text: 'A flash of light, and someone is sitting in your chair. Tall, amused, dressed in a Starfleet admiral\'s uniform from three centuries ago.\n\n"Relax, Captain. I\'m Zed. I\'m omnipotent, I\'m bored, and I have a little test for you."',
      choices: [
        { label: '"We don\'t play games with beings like you."', check: { skill: 'command', difficulty: 'hard' }, success: 'respect', failure: 'prank' },
        { label: '"What kind of test?"', next: 'test' }
      ]
    },
    test: {
      type: 'scene', image: 'entity',
      text: '"Simple. I hold out two hands. One holds a gift, the other a lesson. Choose."',
      choices: [
        { label: 'The left hand', next: 'rnd' },
        { label: 'The right hand', next: 'rnd' },
        { label: '"Neither. We make our own luck."', check: { skill: 'diplomacy', difficulty: 'moderate' }, success: 'respect', failure: 'prank' }
      ]
    },
    rnd: { type: 'random', branches: [{ weight: 1, next: 'gift' }, { weight: 1, next: 'lesson' }] },
    gift: { type: 'end', text: '"How dull. You win." A snap of the fingers, and the ship is gleaming, fully fuelled and restocked. Zed vanishes.', effects: { repair: 60, dilithium: 15, torpedoes: 6 } },
    lesson: { type: 'end', text: '"Lesson one: never trust omnipotent beings." A snap of the fingers, and the ship is somewhere else entirely. It takes two days to get back on course.', effects: { time: 2, dilithium: -4 } },
    respect: { type: 'end', text: 'Zed studies you for a long moment. "Huh. Maybe you\'re not so tedious after all." He vanishes, and the whole crew feels oddly proud.', effects: { renown: 5, morale: 8 } },
    prank: { type: 'end', text: '"Spoilsport." For the next day, every replicator on the ship only makes lukewarm tea.', effects: { morale: -8, time: 0.5 } }
  }
});

ST.content.register({
  kind: 'event', id: 'refugees', context: 'travel', weight: 2, title: 'Refugee transport', start: 'a',
  slots: { n: { type: 'number', min: 40, max: 180 } },
  nodes: {
    a: {
      type: 'scene', image: 'derelict',
      text: 'An overloaded civilian transport limps across your path. {n} refugees fleeing a failed colony, with failing life support and nowhere to go.',
      choices: [
        { label: 'Take them aboard and share your supplies', effects: { spares: -2, morale: 4, renown: 4 }, next: 'aboard' },
        { label: 'Repair their life support so they can continue', check: { skill: 'engineering', difficulty: 'moderate' }, success: 'fixed', failure: 'aboard' },
        { label: 'Give them directions to the nearest starbase', effects: { morale: -4 }, next: 'go' }
      ]
    },
    aboard: { type: 'end', text: 'The cargo bays fill with families. They will be put ashore at the next port, and several ask to thank the captain in person.', effects: { renown: 2 } },
    fixed: { type: 'end', text: 'Your engineers patch their systems well enough to reach safety. The transport\'s captain weeps with relief.', effects: { spares: -1, renown: 4, xp: 10 } },
    go: { type: 'end', text: 'You transmit the coordinates. They thank you. You try not to think about their life support readings.' }
  }
});

ST.content.register({
  kind: 'event', id: 'minefield', context: 'travel', weight: 1.5, title: 'Forgotten minefield', start: 'a',
  requires: { locationFaction: ['none', 'cardassian', 'klingon', 'romulan'] },
  nodes: {
    a: {
      type: 'scene', image: 'asteroids',
      text: 'Proximity alarms. You have blundered into an old subspace minefield, left over from some forgotten war. The mines are cloaked, drifting and still very much armed.',
      choices: [
        { label: 'Thread a path through with sensors at maximum', check: { skill: 'science', difficulty: 'moderate' }, success: 'thread', failure: 'boom' },
        { label: 'Detonate them from a distance with phasers', check: { skill: 'tactics', difficulty: 'moderate' }, success: 'clear', failure: 'boom' },
        { label: 'Back out slowly the way you came', effects: { time: 1 }, next: 'back' }
      ]
    },
    thread: { type: 'end', text: 'Metre by metre, the helm threads the gaps. You emerge on the far side untouched, and chart the field for everyone who comes after.', effects: { renown: 2, xp: 10 } },
    clear: { type: 'end', text: 'A string of silent explosions ripples through the dark. The lane is safe again.', effects: { renown: 3, xp: 10 } },
    boom: { type: 'end', text: 'A mine decloaks off the port bow and detonates.', effects: { hull: -18, shields: -30, damage: { system: 'random', amount: 25 }, crew: -3 } },
    back: { type: 'end', text: 'You retrace your path and lose a day.' }
  }
});

ST.content.register({
  kind: 'event', id: 'lost_probe', context: 'travel', weight: 1.5, title: 'Lost probe', start: 'a',
  nodes: {
    a: {
      type: 'scene', image: 'nebula',
      text: 'A faint signal: a Starfleet survey probe, launched decades ago and presumed lost. Its memory banks might still hold data.',
      choices: [
        { label: 'Tractor it aboard and download its logs', check: { skill: 'engineering', difficulty: 'easy' }, success: 'data', failure: 'wiped' },
        { label: 'Leave it be', next: 'leave' }
      ]
    },
    data: { type: 'end', text: 'The probe\'s logs contain survey data for several nearby systems. The charts update.', effects: { reveal: 'nearby', renown: 2 } },
    wiped: { type: 'end', text: 'The memory core crumbles as you connect to it. Still, the parts are useful.', effects: { spares: 2 } },
    leave: { type: 'end', text: 'The probe tumbles on into the dark, still transmitting to nobody.' }
  }
});

ST.content.register({
  kind: 'event', id: 'solar_flare', context: 'travel', weight: 1.5, title: 'Stellar flare', start: 'a',
  nodes: {
    a: {
      type: 'scene', image: 'pulsar',
      text: 'A nearby star erupts in a massive coronal ejection. A wall of radiation is heading your way, and it is faster than you would like.',
      choices: [
        { label: 'Divert all power to shields', effects: { shields: -50 }, next: 'shield' },
        { label: 'Outrun it at maximum warp', check: { skill: 'command', difficulty: 'moderate' }, success: 'outrun', failure: 'caught' }
      ]
    },
    shield: { type: 'end', text: 'The shields glow white as the wave passes. The ship comes through unhurt.' },
    outrun: { type: 'end', text: 'The ship leaps ahead of the wavefront with seconds to spare. The engines complain but hold.', effects: { dilithium: -2 } },
    caught: { type: 'end', text: 'The wave catches you. Radiation alarms sound on every deck, and sickbay fills up.', effects: { hull: -8, crew: -2, injure: { who: 'random', severity: 'injured' } } }
  }
});

ST.content.register({
  kind: 'event', id: 'letter_from_home', context: 'travel', weight: 1.5, title: 'Letter from home', start: 'a',
  nodes: {
    a: {
      type: 'scene',
      text: '{officer.random} has received bad news from home. A family member has died, and there is no way to get back in time. They are trying to carry on, but everyone can see it.',
      choices: [
        { label: 'Ask the counsellor to spend time with them', check: { skill: 'diplomacy', difficulty: 'easy' }, success: 'help', failure: 'struggle' },
        { label: 'Hold a small remembrance in Ten Forward', effects: { morale: 5, time: 0.25 }, next: 'remember' },
        { label: 'Give them a few days off duty', next: 'rest' }
      ]
    },
    help: { type: 'end', text: 'Talking helps. A few days later they are back at their station, steadier than before.', effects: { morale: 3 } },
    struggle: { type: 'end', text: 'They are not ready to talk. It will take time.', effects: { morale: -3 } },
    remember: { type: 'end', text: 'The crew gathers, and stories are shared. It helps more than anyone expected.' },
    rest: { type: 'end', text: 'They take the time. It is the right call.' }
  }
});

ST.content.register({
  kind: 'event', id: 'border_patrol', context: 'travel', weight: 2, title: 'Border patrol', start: 'a',
  requires: { locationFaction: ['klingon', 'romulan', 'cardassian'] },
  slots: { f: { type: 'faction', oneOf: ['klingon', 'romulan', 'cardassian'], fromLocation: true } },
  nodes: {
    a: {
      type: 'scene', image: '{f.portrait}', speaker: '{f.leader} · {f.vessel}',
      text: 'A {f} warship shadows you out of the system, then hails. "Federation vessel, you are travelling through {f.name} space without leave. State your business, or be escorted out."',
      choices: [
        { label: '"We\'re on a peaceful mission and will be gone shortly."', check: { skill: 'diplomacy', difficulty: 'moderate' }, success: 'pass', failure: 'escort' },
        { label: '"This is open space. Stand aside."', check: { skill: 'command', difficulty: 'hard' }, success: 'backdown', failure: 'fight' },
        { label: 'Transmit your flight plan and submit to a scan', effects: { time: 0.25 }, next: 'scan' }
      ]
    },
    pass: { type: 'end', text: '"Very well. See that you are." The warship peels off.', effects: { relation: { f: 2 } } },
    scan: { type: 'end', text: 'They take their time with the scan, and learn nothing interesting. Eventually they let you go.', effects: { relation: { f: 3 } } },
    escort: { type: 'end', text: 'The warship escorts you the long way round, wasting most of a day.', effects: { time: 1, relation: { f: -2 } } },
    backdown: { type: 'end', text: 'A long silence. Then the warship peels away. Your bridge crew exchanges grins.', effects: { renown: 2, relation: { f: -3 } } },
    fight: { type: 'combat', text: 'The {f} captain takes that as a challenge.', enemies: [{ faction: '{f}', ship: 'light' }], win: 'won', flee: 'fled', surrender: 'calm' },
    won: { type: 'end', text: 'You win, but you have made enemies today.', effects: { relation: { f: -10 } } },
    calm: { type: 'end', text: 'Cooler heads prevail. The warship limps home.', effects: { relation: { f: -2 } } },
    fled: { type: 'end', text: 'You leave at high warp. Their captain will be telling this story for a while.' }
  }
});
