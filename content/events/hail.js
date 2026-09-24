/* Hailing ("hail") and hostile arrivals ("encounter"). In these contexts the
   engine provides a slot called "them" for the other party, e.g. {them.leader},
   {them.vessel}, {them.portrait} as an image, relation keys like { them: 5 },
   and combat enemies like { faction: 'them', ship: 'contact' }. */

// ================================================================ hails
ST.content.register({
  kind: 'event', id: 'hail_klingon', context: 'hail', weight: 5, start: 'a', title: 'Klingon vessel',
  requires: { factionIs: { slot: 'them', oneOf: ['klingon'] } },
  nodes: {
    a: { type: 'branch', if: { relationBelow: { them: -30 } }, then: 'cold', else: 'warm' },
    cold: {
      type: 'scene', image: '{them.portrait}', speaker: '{them.leader} · {them.vessel}',
      text: '"Federation. You have the stench of politicians about you. Speak quickly, before I lose interest and find out how well your shields hold."',
      choices: [
        { label: '"We have no quarrel with the Empire."', check: { skill: 'diplomacy', difficulty: 'hard' }, success: 'calm', failure: 'insult' },
        { label: '"Try it, and you will learn exactly how well."', check: { skill: 'command', difficulty: 'moderate' }, success: 'respect', failure: 'fight' },
        { label: 'Open formal negotiations', next: 'talks' },
        { label: 'Close the channel', next: 'bye' }
      ]
    },
    warm: {
      type: 'scene', image: '{them.portrait}', speaker: '{them.leader} · {them.vessel}',
      text: '"Ha! A Starfleet ship this far out. Your captain must either be very brave or very lost. Which is it?"',
      choices: [
        { label: '"Brave. And looking for a drinking partner."', check: { skill: 'command', difficulty: 'moderate' }, success: 'drink', failure: 'drunk' },
        { label: 'Ask what they have seen on the frontier', next: 'news' },
        { label: 'Open formal negotiations', next: 'talks' },
        { label: 'Wish them good hunting and close the channel', next: 'bye' }
      ]
    },
    calm: { type: 'end', text: '"...Perhaps not. Today." The channel closes, and the warship keeps its distance.', effects: { relation: { them: 3 }, contact: 'neutral' } },
    insult: { type: 'end', text: '"You talk like a Ferengi." The channel closes with a snarl.', effects: { relation: { them: -3 } } },
    respect: { type: 'end', text: 'A long pause. Then laughter. "You have a warrior\'s tongue, Captain. Very well. We will not trouble you today."', effects: { relation: { them: 6 }, contact: 'neutral' } },
    fight: { type: 'combat', text: '"Then let us see it!"', enemies: [{ faction: 'them', ship: 'contact' }], win: 'won', flee: 'fled', surrender: 'spared' },
    won: { type: 'end', text: 'The Klingon ship is defeated. Word of the battle will spread through the Empire, and not all of it will be bitter.', effects: { relation: { them: -6 }, renown: 3 } },
    spared: { type: 'end', text: 'You let the Klingons go. Some will call it weakness. Others will remember it.', effects: { relation: { them: 4 } } },
    fled: { type: 'end', text: 'You break off. The Klingons will be singing about this one.', effects: { relation: { them: -2 } } },
    drink: { type: 'end', text: 'You beam over with a bottle of Saurian brandy. It becomes a long night of bloodwine, songs and exaggerated stories. You wake up with a headache and a friend.', effects: { relation: { them: 10 }, morale: 4, time: 0.5 } },
    drunk: { type: 'end', text: 'The bloodwine wins. You are carried back to the transporter room, to the delight of the Klingon crew. They seem to like you more for it.', effects: { relation: { them: 4 }, injure: { who: 'captain', severity: 'injured' } } },
    news: { type: 'end', text: '"Orion jackals, a few Romulan ghosts, and a nebula that ate a scout ship. Here, our star charts. Don\'t get lost."', effects: { reveal: 'nearby', relation: { them: 1 } } },
    talks: { type: 'negotiation', party: 'them', topic: 'a non-aggression pact', text: 'The Klingon captain agrees to hear you out, arms folded.', rounds: 6, difficulty: 'moderate', win: 'talk_win', lose: 'talk_lose' },
    talk_win: { type: 'end', text: '"Your words have weight, Captain. The High Council will hear of this."', effects: { relation: { them: 8 }, renown: 3, contact: 'friendly' } },
    talk_lose: { type: 'end', text: '"Enough talk." The channel closes.' },
    bye: { type: 'end', text: '"Qapla\'!"' }
  }
});

ST.content.register({
  kind: 'event', id: 'hail_romulan', context: 'hail', weight: 5, start: 'a', title: 'Romulan vessel',
  requires: { factionIs: { slot: 'them', oneOf: ['romulan'] } },
  nodes: {
    a: {
      type: 'scene', image: '{them.portrait}', speaker: '{them.leader} · {them.vessel}',
      text: '"Captain. How... unexpected. I trust you are not lost. The Neutral Zone treaties are so easy to misunderstand, and so hard to forgive."',
      choices: [
        { label: 'Propose an exchange of sensor data', check: { skill: 'science', difficulty: 'moderate' }, success: 'data', failure: 'suspicious' },
        { label: '"We are exactly where we mean to be, Commander."', check: { skill: 'command', difficulty: 'moderate' }, success: 'wary', failure: 'suspicious' },
        { label: 'Open formal negotiations', requires: { relationAtLeast: { them: -40 } }, next: 'talks' },
        { label: 'Close the channel', next: 'bye' }
      ]
    },
    data: { type: 'end', text: 'The Romulan considers, then agrees. What she sends is carefully incomplete, and so is what you send. It is a start.', effects: { relation: { them: 5 }, reveal: 'nearby' } },
    wary: { type: 'end', text: '"Indeed." She studies you a moment longer, then her ship shimmers and vanishes.', effects: { relation: { them: 2 }, contact: 'leave' } },
    suspicious: { type: 'end', text: '"I will be watching you, Captain." Her ship cloaks.', effects: { relation: { them: -3 }, contact: 'leave' } },
    talks: { type: 'negotiation', party: 'them', topic: 'border protocols', text: 'The Romulan commander agrees to talk, though her eyes never stop calculating.', rounds: 6, difficulty: 'hard', win: 'talk_win', lose: 'talk_lose' },
    talk_win: { type: 'end', text: '"A reasonable arrangement. The Senate may even approve it." From a Romulan, that is almost warmth.', effects: { relation: { them: 8 }, renown: 4 } },
    talk_lose: { type: 'end', text: '"We are done here." The warbird cloaks.', effects: { contact: 'leave' } },
    bye: { type: 'end', text: '"Jolan tru, Captain."' }
  }
});

ST.content.register({
  kind: 'event', id: 'hail_cardassian', context: 'hail', weight: 5, start: 'a', title: 'Cardassian vessel',
  requires: { factionIs: { slot: 'them', oneOf: ['cardassian'] } },
  nodes: {
    a: {
      type: 'scene', image: '{them.portrait}', speaker: '{them.leader} · {them.vessel}',
      text: '"Federation starship. Under Cardassian security protocols, I am obliged to request an inspection of your cargo holds. Purely a formality, of course."',
      choices: [
        { label: 'Permit the inspection', effects: { time: 0.25, relation: { them: 4 } }, next: 'inspect' },
        { label: '"Federation ships are not subject to Cardassian inspection."', check: { skill: 'command', difficulty: 'moderate' }, success: 'back', failure: 'tense' },
        { label: 'Offer a "processing fee" to skip the formality', cost: { latinum: 20 }, next: 'bribe' },
        { label: 'Open formal negotiations', next: 'talks' }
      ]
    },
    inspect: { type: 'end', text: 'Cardassian officers pore over your cargo manifest for two hours and find nothing. They seem almost disappointed.' },
    back: { type: 'end', text: 'A thin smile. "As you wish, Captain. For now." The channel closes.', effects: { relation: { them: -2 } } },
    tense: { type: 'end', text: '"Then you will not mind if we accompany you out of the system." They do, closely, all the way.', effects: { relation: { them: -4 }, time: 0.25 } },
    bribe: { type: 'end', text: 'The Gul accepts the fee with the air of a man doing you a favour.', effects: { relation: { them: 2 } } },
    talks: { type: 'negotiation', party: 'them', topic: 'trade and security', text: 'The Gul settles back in his chair. "By all means. Let us talk."', rounds: 6, difficulty: 'moderate', win: 'talk_win', lose: 'talk_lose' },
    talk_win: { type: 'end', text: '"The Central Command will find this... acceptable."', effects: { relation: { them: 7 }, renown: 3 } },
    talk_lose: { type: 'end', text: '"How disappointing." The channel closes.' }
  }
});

ST.content.register({
  kind: 'event', id: 'hail_ferengi', context: 'hail', weight: 5, start: 'a', title: 'Ferengi vessel',
  requires: { factionIs: { slot: 'them', oneOf: ['ferengi'] } },
  nodes: {
    a: {
      type: 'scene', image: '{them.portrait}', speaker: '{them.leader} · {them.vessel}',
      text: '"Greetings, Starfleet! {them.leader}, at your service, for a very reasonable fee. Are you buying? Selling? Buying is better."',
      choices: [
        { label: 'Open trade', effects: { openTrade: true }, next: 'trade' },
        { label: 'Buy information about the sector', cost: { latinum: 15 }, next: 'info' },
        { label: 'Negotiate a standing trade agreement', next: 'talks' },
        { label: 'Close the channel', next: 'bye' }
      ]
    },
    trade: { type: 'end', text: '"Rule of Acquisition number three: never spend more for an acquisition than you have to. Please ignore that one today."' },
    info: { type: 'end', text: 'The DaiMon sells you star charts, rumours and a very good tip about where not to go.', effects: { reveal: 'nearby' } },
    talks: { type: 'negotiation', party: 'them', topic: 'a trade agreement', text: 'The DaiMon rubs his hands together. "Negotiation! My favourite."', rounds: 5, difficulty: 'moderate', win: 'talk_win', lose: 'talk_lose' },
    talk_win: { type: 'end', text: '"A pleasure doing business! My Nagus will hear of your... generosity."', effects: { relation: { them: 6 }, latinum: 25 } },
    talk_lose: { type: 'end', text: '"You drive a hard bargain, hew-mon. Too hard."' },
    bye: { type: 'end', text: '"Come back when you have more latinum!"' }
  }
});

ST.content.register({
  kind: 'event', id: 'hail_orion', context: 'hail', weight: 5, start: 'a', title: 'Orion vessel',
  requires: { factionIs: { slot: 'them', oneOf: ['orion'] } },
  nodes: {
    a: {
      type: 'scene', image: 'portrait_orion', speaker: '{them.leader} · {them.vessel}',
      text: '"Starfleet. Of course. Let me guess, you want to lecture me about the law. Or maybe you\'d like to buy something the Federation doesn\'t sell."',
      choices: [
        { label: 'Browse the black market', effects: { openTrade: true, renown: -1 }, next: 'trade' },
        { label: '"Leave this system and stop raiding the colonies."', check: { skill: 'command', difficulty: 'hard' }, success: 'leave', failure: 'laugh' },
        { label: 'Offer amnesty in exchange for information', check: { skill: 'diplomacy', difficulty: 'moderate' }, success: 'intel', failure: 'laugh' },
        { label: 'Close the channel', next: 'bye' }
      ]
    },
    trade: { type: 'end', text: '"Smart captain. No questions asked."' },
    leave: { type: 'end', text: 'The pirate weighs your ship against hers and decides discretion is profitable. She leaves.', effects: { renown: 2, contact: 'leave' } },
    intel: { type: 'end', text: 'For a promise to look the other way, once, she tells you where a rival crew is hiding.', effects: { reveal: 'nearby', relation: { them: 3 } } },
    laugh: { type: 'end', text: 'She laughs in your face and cuts the channel.', effects: { relation: { them: -2 } } },
    bye: { type: 'end', text: '"See you around, Starfleet."' }
  }
});

ST.content.register({
  kind: 'event', id: 'hail_federation', context: 'hail', weight: 5, start: 'a', title: 'Starfleet vessel',
  requires: { factionIs: { slot: 'them', oneOf: ['federation'] } },
  nodes: {
    a: {
      type: 'scene', image: 'starbase', speaker: '{them.leader} · {them.vessel}',
      text: '"Good to see a friendly face out here, {captain}. We\'re heading home for refit. Anything we can do for you before we go?"',
      choices: [
        { label: 'Ask them to share spare parts', effects: { spares: 3, contact: 'leave' }, next: 'parts' },
        { label: 'Ask for their sensor logs of the sector', effects: { reveal: 'nearby', contact: 'leave' }, next: 'logs' },
        { label: 'Exchange crew letters and news', effects: { morale: 6, contact: 'leave' }, next: 'news' }
      ]
    },
    parts: { type: 'end', text: 'A cargo transfer later, and you are a little better supplied. "Good hunting."' },
    logs: { type: 'end', text: 'Their logs fill in several gaps in your charts.' },
    news: { type: 'end', text: 'Letters from home, gossip from Starfleet Command and a crate of real coffee. Morale jumps.' }
  }
});

ST.content.register({
  kind: 'event', id: 'hail_species', context: 'hail', weight: 5, start: 'a', title: 'Unknown civilisation',
  requires: { factionIs: { slot: 'them', oneOf: ['species'] } },
  nodes: {
    a: {
      type: 'scene', image: '{them.portrait}', speaker: '{them.leader} · {them.name}',
      text: 'The {them.plural} are {them.look}. Their envoy regards you with open curiosity.\n\n"You are the travellers from the Federation. We have heard your transmissions for some time. Tell us why you are here."',
      choices: [
        { label: '"To learn, and to offer friendship."', check: { skill: 'diplomacy', difficulty: 'moderate' }, success: 'friend', failure: 'cautious' },
        { label: 'Propose a cultural and scientific exchange', check: { skill: 'science', difficulty: 'moderate' }, success: 'exchange', failure: 'cautious' },
        { label: 'Open formal negotiations', next: 'talks' }
      ]
    },
    friend: { type: 'end', text: '"Friendship. A good word. We will remember it."', effects: { relation: { them: 8 }, renown: 2 } },
    exchange: { type: 'end', text: 'Libraries are exchanged. Your scientists are delighted. So, apparently, are theirs.', effects: { relation: { them: 6 }, renown: 3, xp: 10 } },
    cautious: { type: 'end', text: '"We will consider your words." The channel closes politely.', effects: { relation: { them: 1 } } },
    talks: { type: 'negotiation', party: 'them', topic: 'formal relations', text: 'The envoy settles in to listen.', rounds: 6, difficulty: 'moderate', win: 'talk_win', lose: 'talk_lose' },
    talk_win: { type: 'end', text: 'The {them.name} agrees to formal relations with the Federation. It is the kind of day Starfleet exists for.', effects: { relation: { them: 10 }, renown: 6, contact: 'friendly' } },
    talk_lose: { type: 'end', text: '"Not yet. Perhaps another time."', effects: { relation: { them: -2 } } }
  }
});

ST.content.register({
  kind: 'event', id: 'hail_generic', context: 'hail', weight: 0.05, start: 'a', title: 'Open channel',
  nodes: {
    a: {
      type: 'scene', image: '{them.portrait}', speaker: '{them.leader}',
      text: 'The channel opens. The {them} captain watches you warily.',
      choices: [
        { label: 'Exchange greetings', check: { skill: 'diplomacy', difficulty: 'easy' }, success: 'ok', failure: 'meh' },
        { label: 'Close the channel', next: 'meh' }
      ]
    },
    ok: { type: 'end', text: 'A polite exchange. Nothing more, nothing less.', effects: { relation: { them: 2 } } },
    meh: { type: 'end', text: 'The channel closes.' }
  }
});

// ================================================================ hostile arrivals
ST.content.register({
  kind: 'event', id: 'encounter_orion', context: 'encounter', weight: 5, start: 'a', title: 'Raiders',
  requires: { factionIs: { slot: 'them', oneOf: ['orion'] } },
  nodes: {
    a: {
      type: 'scene', image: 'ship_orion', speaker: '{them.leader} · {them.vessel}',
      text: 'The {them.vessel} comes about on an intercept course, weapons charged. "Starfleet. This is our territory. Drop your cargo or we take it off your wreck."',
      choices: [
        { label: 'Pay them off', cost: { latinum: 35 }, effects: { contact: 'leave' }, next: 'paid' },
        { label: '"Stand down or be destroyed."', check: { skill: 'command', difficulty: 'moderate' }, success: 'back', failure: 'fight' },
        { label: 'Fire first', next: 'fight' }
      ]
    },
    paid: { type: 'end', text: 'The latinum changes hands and the raider departs. The crew is not impressed.', effects: { morale: -4 } },
    back: { type: 'end', text: 'The pirate decides you are not worth it and sheers away.', effects: { contact: 'leave', renown: 1 } },
    fight: { type: 'combat', enemies: [{ faction: 'them', ship: 'contact' }], win: 'won', flee: 'fled', surrender: 'won' },
    won: { type: 'end', text: 'The raider is dealt with. The system is a little safer tonight.', effects: { renown: 2 } },
    fled: { type: 'end', text: 'You withdraw under fire.' }
  }
});

ST.content.register({
  kind: 'event', id: 'encounter_warship', context: 'encounter', weight: 4, start: 'a', title: 'Hostile warship',
  requires: { factionIs: { slot: 'them', oneOf: ['klingon', 'romulan', 'cardassian', 'ferengi', 'species'] } },
  nodes: {
    a: {
      type: 'scene', image: '{them.portrait}', speaker: '{them.leader} · {them.vessel}',
      text: 'Red alert. The {them.vessel}, a {them.ship}, is locking weapons on you. On the viewscreen, its commander is not smiling.\n\n"Federation vessel. You are not welcome here. Leave now, or we will remove you."',
      choices: [
        { label: '"We mean no harm. Let us talk."', check: { skill: 'diplomacy', difficulty: 'moderate' }, success: 'talk', failure: 'fight' },
        { label: '"Fire on us, and you start a war you can\'t win." (Bluff)', check: { skill: 'command', difficulty: 'hard' }, success: 'bluff', failure: 'fight' },
        { label: 'Withdraw from the system', check: { skill: 'command', difficulty: 'easy' }, success: 'withdraw', failure: 'fight' },
        { label: 'Raise shields and fire', next: 'fight' }
      ]
    },
    talk: { type: 'end', text: 'Tension drains from the bridge. The warship holds position but lowers its weapons.', effects: { relation: { them: 3 }, contact: 'neutral' } },
    bluff: { type: 'end', text: 'The commander hesitates, then gives the order to stand down.', effects: { relation: { them: -1 }, contact: 'neutral', renown: 2 } },
    withdraw: { type: 'end', text: 'You back off to the edge of the system. The warship lets you go and turns away.', effects: { contact: 'leave' } },
    fight: { type: 'combat', enemies: [{ faction: 'them', ship: 'contact' }], win: 'won', flee: 'fled', surrender: 'calm' },
    won: { type: 'end', text: 'The warship is defeated. Their government will not forget this.', effects: { renown: 2 } },
    calm: { type: 'end', text: 'The fighting stops. Nobody is quite sure who won.', effects: { relation: { them: 2 } } },
    fled: { type: 'end', text: 'You escape the system.' }
  }
});

ST.content.register({
  kind: 'event', id: 'encounter_generic', context: 'encounter', weight: 0.1, start: 'a', title: 'Hostile contact',
  nodes: {
    a: {
      type: 'scene', image: '{them.ship}',
      text: 'The {them.vessel} is closing fast with weapons armed.',
      choices: [
        { label: 'Hail them', check: { skill: 'diplomacy', difficulty: 'moderate' }, success: 'calm', failure: 'fight' },
        { label: 'Battle stations', next: 'fight' }
      ]
    },
    calm: { type: 'end', text: 'They lower their weapons, reluctantly.', effects: { contact: 'neutral' } },
    fight: { type: 'combat', enemies: [{ faction: 'them', ship: 'contact' }], win: 'won', flee: 'fled', surrender: 'won' },
    won: { type: 'end', text: 'The threat is over.' },
    fled: { type: 'end', text: 'You escape.' }
  }
});
