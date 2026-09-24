/* Away-team missions on planets (context "away"). The planet being visited
   is available to conditions via { planet: { class, life, ruins, dilithium, colony } }. */

ST.content.register({
  kind: 'event', id: 'away_ruins', context: 'away', weight: 5, title: 'Ancient ruins', start: 'team',
  requires: { planet: { ruins: true } },
  nodes: {
    team: { type: 'away_team', image: 'surface_ruins', text: 'Sensors show artificial structures on the surface, very old and partly buried. Assemble an away team.', size: [2, 3], recommend: ['science', 'tactics'], next: 'a' },
    a: {
      type: 'scene', image: 'surface_ruins',
      text: '{away.leader} reports from the surface. "It\'s a city, Captain, or it was. Half a million years old at least. There\'s a sealed vault at the centre, and the glyphs on the door are still glowing."',
      choices: [
        { label: 'Decipher the glyphs to open the vault', check: { skill: 'science', difficulty: 'moderate', team: 'away' }, success: 'vault', failure: 'trap' },
        { label: 'Cut through the door', check: { skill: 'engineering', difficulty: 'hard', team: 'away' }, success: 'vault', failure: 'trap' },
        { label: 'Record everything and leave the vault sealed', effects: { renown: 3 }, next: 'respect' }
      ]
    },
    vault: {
      type: 'scene', image: 'surface_ruins',
      text: 'The vault holds a single object on a pedestal: a smooth, warm stone that hums when touched. Around it, the walls show a map of the stars as they were long ago.',
      choices: [
        { label: 'Take the artifact for study', effects: { items: { add: ['artifact'] }, renown: 5, xp: 15 }, next: 'done' },
        { label: 'Leave it, but record the star map', effects: { renown: 4, reveal: 'nearby', xp: 10 }, next: 'done' }
      ]
    },
    trap: { type: 'end', text: 'The vault\'s defences are still working. A pulse of energy knocks the team flat, and the structure begins to collapse. You beam them out in the nick of time.', effects: { injure: { who: 'away', severity: 'injured' }, renown: 1 } },
    respect: { type: 'end', text: 'Some doors are best left closed. The archaeological survey is still the find of the year.' },
    done: { type: 'end', text: 'The away team beams back up, grinning like cadets.' }
  }
});

ST.content.register({
  kind: 'event', id: 'away_fauna', context: 'away', weight: 4, title: 'Wildlife', start: 'team',
  requires: { planet: { life: 'fauna' } },
  nodes: {
    team: { type: 'away_team', text: 'The planet teems with animal life. A biological survey would be valuable. So would caution.', size: [1, 3], recommend: ['science', 'tactics', 'medicine'], next: 'a' },
    a: {
      type: 'scene', image: '@location',
      text: 'The survey goes well until {away.any} steps into a clearing and something large and six-legged rises out of the undergrowth, very interested in them.',
      choices: [
        { label: 'Stun it', check: { skill: 'tactics', difficulty: 'easy', team: 'away' }, success: 'stunned', failure: 'mauled' },
        { label: 'Stay still and let it lose interest', check: { skill: 'science', difficulty: 'moderate', team: 'away' }, success: 'calm', failure: 'mauled' },
        { label: 'Emergency beam-out', next: 'out' }
      ]
    },
    stunned: { type: 'end', text: 'The creature slumps. While it sleeps, the team takes tissue samples. It turns out to be a new species, and Starfleet lets you name it.', effects: { renown: 3, xp: 10 } },
    calm: { type: 'end', text: 'The creature sniffs, snorts and wanders off. The team finishes the survey and discovers it was only curious.', effects: { renown: 4, xp: 12 } },
    mauled: { type: 'end', text: 'The creature charges. By the time the team beams out, someone has a broken arm and everyone has a story.', effects: { injure: { who: 'away', severity: 'injured' }, renown: 1 } },
    out: { type: 'end', text: 'The team materialises on the transporter pad, breathing hard.' }
  }
});

ST.content.register({
  kind: 'event', id: 'away_flora', context: 'away', weight: 3, title: 'Botanical survey', start: 'team',
  requires: { planet: { life: ['flora', 'microbial'] } },
  nodes: {
    team: { type: 'away_team', text: 'A botanical and microbial survey. It should be routine.', size: [1, 3], recommend: ['science', 'medicine'], next: 'a' },
    a: {
      type: 'scene', image: '@location',
      text: 'The team finds a flowering plant whose pollen shows remarkable medical properties. Then {away.any} starts giggling uncontrollably. The pollen has other properties too.',
      choices: [
        { label: 'Treat the affected officer and collect samples carefully', check: { skill: 'medicine', difficulty: 'moderate', team: 'away' }, success: 'samples', failure: 'woozy' },
        { label: 'Seal up the samples and beam out now', effects: { renown: 2 }, next: 'safe' }
      ]
    },
    samples: { type: 'end', text: 'The samples are the basis of a new painkiller. Starfleet Medical is delighted.', effects: { renown: 5, xp: 12, spares: 1 } },
    woozy: { type: 'end', text: 'Half the team spends the next day in sickbay, very happy and very useless.', effects: { time: 0.5, injure: { who: 'away', severity: 'injured' }, morale: 3 } },
    safe: { type: 'end', text: 'Discretion wins. The samples reach the labs intact.' }
  }
});

ST.content.register({
  kind: 'event', id: 'away_caves', context: 'away', weight: 4, title: 'Crystal caves', start: 'team',
  requires: { planet: { dilithium: true } },
  nodes: {
    team: { type: 'away_team', image: 'surface_caves', text: 'Deep scans show dilithium crystals in a cave system below the surface.', size: [1, 3], recommend: ['engineering', 'science'], next: 'a' },
    a: {
      type: 'scene', image: 'surface_caves',
      text: 'The caverns glitter with raw dilithium, some crystals taller than a person. The rock around them is unstable, and something in the deep tunnels is making a scraping sound.',
      choices: [
        { label: 'Carefully extract the best crystals', check: { skill: 'engineering', difficulty: 'moderate', team: 'away' }, success: 'haul', failure: 'collapse' },
        { label: 'Investigate the scraping', check: { skill: 'science', difficulty: 'moderate', team: 'away' }, success: 'horta', failure: 'collapse' },
        { label: 'Grab a few loose crystals and go', effects: { dilithium: 3 }, next: 'quick' }
      ]
    },
    haul: { type: 'end', text: 'A textbook extraction. The cargo bay glows faintly for days.', effects: { dilithium: 10, xp: 10 } },
    horta: { type: 'end', text: 'The scraping comes from a silicon-based creature tunnelling through the rock, and it is guarding eggs. Your team backs away and marks the caves as a protected habitat. The creature, grateful, pushes a heap of crystals toward them.', effects: { dilithium: 6, renown: 5, xp: 12 } },
    collapse: { type: 'end', text: 'The cave roof gives way. The team gets out, bruised and with only a few crystals.', effects: { dilithium: 2, injure: { who: 'away', severity: 'injured' } } },
    quick: { type: 'end', text: 'In and out. Efficient.' }
  }
});

ST.content.register({
  kind: 'event', id: 'away_colony', context: 'away', weight: 6, title: 'Colony visit', start: 'team',
  requires: { planet: { colony: true } },
  nodes: {
    team: { type: 'away_team', image: 'surface_colony', text: 'The colonists invite you down.', size: [1, 3], recommend: ['diplomacy', 'medicine'], next: 'a' },
    a: {
      type: 'scene', image: 'surface_colony',
      text: 'The colony is a cluster of prefab domes and fields. Everyone turns out to greet you. The colony leader pulls {away.leader} aside: they have a problem with water contamination, and a dispute between two families that is turning ugly.',
      choices: [
        { label: 'Treat the water supply', check: { skill: 'medicine', difficulty: 'easy', team: 'away' }, success: 'water', failure: 'water_bad' },
        { label: 'Mediate the family dispute', check: { skill: 'diplomacy', difficulty: 'moderate', team: 'away' }, success: 'peace', failure: 'feud' }
      ]
    },
    water: { type: 'end', text: 'A simple bacterial bloom, easily treated. The colonists load the team down with fresh produce.', effects: { renown: 3, morale: 5 } },
    water_bad: { type: 'end', text: 'It takes longer than expected, but you get there.', effects: { renown: 2, time: 0.5 } },
    peace: { type: 'end', text: 'A marriage is arranged, an old grudge forgiven, and the whole colony holds a party. Your officer is invited back for the wedding.', effects: { renown: 4, morale: 6, xp: 12 } },
    feud: { type: 'end', text: 'Your attempt at mediation only makes things worse. The colony leader thanks you through clenched teeth.', effects: { renown: -1 } }
  }
});

ST.content.register({
  kind: 'event', id: 'away_prewarp', context: 'away', weight: 8, title: 'Duck blind', start: 'a',
  requires: { planet: { life: 'prewarp' } },
  nodes: {
    a: {
      type: 'scene', image: '@location',
      text: 'The planet below is home to a pre-warp civilisation, roughly equivalent to Earth\'s bronze age. The Prime Directive is clear: no contact. But a small observation post, hidden in the hills, would teach Starfleet a great deal.',
      choices: [
        { label: 'Send a disguised observation team', next: 'team' },
        { label: 'Observe from orbit only', effects: { renown: 2 }, next: 'orbit' }
      ]
    },
    team: { type: 'away_team', text: 'The team will be surgically altered to pass as locals. Choose carefully.', size: [1, 2], recommend: ['science', 'diplomacy'], next: 'b' },
    b: {
      type: 'scene', image: '@location',
      text: 'The observation goes well until a local child wanders into the hidden post and sees the equipment. The child stares at {away.leader}, wide-eyed.',
      choices: [
        { label: 'Calmly convince the child it was a dream', check: { skill: 'diplomacy', difficulty: 'moderate', team: 'away' }, success: 'saved', failure: 'exposed' },
        { label: 'Beam out immediately, equipment and all', check: { skill: 'engineering', difficulty: 'easy' }, success: 'vanish', failure: 'exposed' }
      ]
    },
    saved: { type: 'end', text: 'The child wanders home and tells everyone about the strange dream. Nobody believes a word. The data you gathered is priceless.', effects: { renown: 6, xp: 15 } },
    vanish: { type: 'end', text: 'The post vanishes in a shimmer. The child will grow up telling stories about the spirits in the hills. You hope that is all.', effects: { renown: 2 } },
    exposed: { type: 'end', text: 'The child runs for the village, shouting. By nightfall there are torches in the hills. The team gets out, but a culture has been contaminated. Starfleet will want a report.', effects: { renown: -6, morale: -4 } },
    orbit: { type: 'end', text: 'The long-range scans are a treasure trove for Starfleet\'s anthropologists, and nobody below ever knows you were there.' }
  }
});

ST.content.register({
  kind: 'event', id: 'away_geology', context: 'away', weight: 3, title: 'Geological survey', start: 'team',
  requires: { planet: { class: ['K', 'H', 'P', 'N', 'Y'], life: ['none', 'microbial'] } },
  nodes: {
    team: { type: 'away_team', text: 'A barren world. Environment suits and a geological survey kit.', size: [1, 3], recommend: ['science', 'engineering'], next: 'a' },
    a: {
      type: 'scene', image: '@location',
      text: 'The surface is harsh and silent. Core samples show an unusual mineral seam. Then the ground begins to shake.',
      choices: [
        { label: 'Finish the survey fast', check: { skill: 'science', difficulty: 'moderate', team: 'away' }, success: 'data', failure: 'quake' },
        { label: 'Beam out with what you have', effects: { renown: 1 }, next: 'safe' }
      ]
    },
    data: { type: 'end', text: 'The team gets clear just before a fissure opens where they were standing. The samples contain rare minerals, useful for repairs.', effects: { spares: 3, renown: 2, xp: 10 } },
    quake: { type: 'end', text: 'The quake knocks the team off their feet. Someone is hurt badly.', effects: { injure: { who: 'away', severity: 'injured' }, spares: 1 } },
    safe: { type: 'end', text: 'Better safe.' }
  }
});

ST.content.register({
  kind: 'event', id: 'away_ocean', context: 'away', weight: 3, title: 'Beneath the waves', start: 'team',
  requires: { planet: { class: 'O' } },
  nodes: {
    team: { type: 'away_team', text: 'An ocean world. The team will beam to a floating ice shelf and survey the waters below.', size: [1, 3], recommend: ['science'], next: 'a' },
    a: {
      type: 'scene', image: 'planet_o',
      text: 'Deep below the ice, sensors pick up a slow, rhythmic sound, like whale song but vastly more complex. {away.leader} thinks it might be language.',
      choices: [
        { label: 'Try to communicate', check: { skill: 'science', difficulty: 'hard', team: 'away' }, success: 'song', failure: 'silence' },
        { label: 'Record it for Starfleet\'s xenolinguists', effects: { renown: 3 }, next: 'record' }
      ]
    },
    song: { type: 'end', text: 'After hours of patient work, the song answers. They are intelligent, ancient and entirely uninterested in space travel. It is a first contact of the gentlest kind.', effects: { renown: 8, morale: 6, xp: 20 } },
    silence: { type: 'end', text: 'The song stops. Whatever was singing has gone deeper.', effects: { renown: 1 } },
    record: { type: 'end', text: 'The recordings go out on the next subspace packet.' }
  }
});

ST.content.register({
  kind: 'event', id: 'away_natives', context: 'away', weight: 6, title: 'Visiting a homeworld', start: 'team',
  requires: { planet: { life: 'sentient' } },
  nodes: {
    team: { type: 'away_team', text: 'This world belongs to a warp-capable species. A visit requires tact.', size: [1, 3], recommend: ['diplomacy', 'science'], next: 'a' },
    a: {
      type: 'scene', image: 'portrait_alien2',
      text: 'The locals receive the team with cautious formality. There is a feast, then speeches, then an awkward moment when the host offers {away.leader} a live, wriggling delicacy.',
      choices: [
        { label: 'Eat it with gusto', check: { skill: 'command', difficulty: 'moderate', team: 'away' }, success: 'feast', failure: 'sick' },
        { label: 'Politely explain your dietary customs', check: { skill: 'diplomacy', difficulty: 'moderate', team: 'away' }, success: 'polite', failure: 'offend' }
      ]
    },
    feast: { type: 'end', text: 'The hall erupts in cheers. You are now, apparently, honorary kin.', effects: { renown: 4, morale: 3 } },
    sick: { type: 'end', text: 'It goes down. It does not stay down. The hosts are amused rather than offended.', effects: { renown: 2, injure: { who: 'away', severity: 'injured' } } },
    polite: { type: 'end', text: 'Your hosts are fascinated by Federation customs and ask a thousand questions. A cultural exchange is agreed.', effects: { renown: 4, xp: 10 } },
    offend: { type: 'end', text: 'Something got lost in translation. The team is shown out, politely but firmly.', effects: { renown: -1 } }
  }
});
