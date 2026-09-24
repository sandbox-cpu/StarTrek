# Writing missions and events for Frontier Command

Everything the player reads in Frontier Command is **data**: missions, random events, hails, away-team scenes and the crisis finales. The engine never needs to change to add more. Each piece of content is a plain object passed to `ST.content.register({...})` in a file under `content/`.

This guide is the complete reference. It is written so you can hand it to another LLM (or a human) and get back a pack that drops straight into the game. The prompt to paste is in [Prompt for another LLM](#prompt-for-another-llm).

- The rules are enforced by `js/schema.js`. The game skips any definition with errors, with a console warning, and never crashes on bad content.
- Check a pack before adding it: `node tools/validate-content.mjs content/missions/my-pack.js`
- A JSON Schema for editors and structured output lives at [`docs/mission.schema.json`](mission.schema.json). The JavaScript validator is the source of truth if they ever disagree.

## Contents

1. [Quick start](#quick-start)
2. [How content works](#how-content-works)
3. [Missions](#missions)
4. [Events](#events)
5. [Slots](#slots)
6. [Nodes](#nodes)
7. [Choices and skill checks](#choices-and-skill-checks)
8. [Effects](#effects)
9. [Conditions](#conditions)
10. [Text placeholders](#text-placeholders)
11. [Images](#images)
12. [Vocabulary lists](#vocabulary-lists)
13. [Balance guide](#balance-guide)
14. [Worked examples](#worked-examples)
15. [Prompt for another LLM](#prompt-for-another-llm)
16. [Checklist](#checklist)

## Quick start

1. Create a file, for example `content/missions/my-pack.js`.
2. Call `ST.content.register({...})` once per mission or event. Use plain object literals only: no functions, no variables, no imports.
3. Add one line to `index.html`, next to the other packs:
   `<script src="content/missions/my-pack.js"></script>`
4. Run `node tools/validate-content.mjs`. Fix every error it lists.
5. Open `index.html` and play.

## How content works

There are two kinds of content.

| Kind | What it is | How it starts |
|---|---|---|
| `mission` | Orders with objectives, spread over one or more **stages** | Offered on the Starfleet mission board in Comms. The player accepts it. Crisis missions start by themselves. |
| `event` | A single self-contained scene tree | Picked at random when something happens: travel, arrival, an away team, hailing, and so on (its **context**). |

Both are built from the same parts:

- **Slots**: random values filled in when the content starts, such as a target system, a faction, a species, a name or a number. This is what makes each run different.
- **Nodes**: the scene graph. A node is a scene with choices, an ending, a skill-check branch, a battle, a negotiation, an away-team selection, and so on.
- **Effects**: what changes when a node is entered or a choice is taken, such as `{ hull: -10, renown: 3 }`.
- **Conditions**: when something is allowed, such as `{ min: { latinum: 20 } }` or `{ twist: 'trap' }`.
- **Placeholders**: `{target}`, `{officer.science}`, `{enemy.leader}` and so on, filled into any text.

## Missions

```js
ST.content.register({
  kind: 'mission',
  id: 'unique_snake_case_id',       // lowercase letters, digits, underscores. Must be unique.
  category: 'rescue',               // see Vocabulary lists
  weight: 3,                        // optional, default 1. Relative chance of being offered.
  giver: 'starfleet',               // optional: 'starfleet' (default) or a faction id. Success adds +8 relations with that faction.
  requires: { relationAtLeast: { klingon: -20 } },   // optional condition checked when offering
  title: 'Distress call from {target}',              // shown on the board and in the log
  briefing: 'A freighter at {target} has sent a mayday...',
  image: 'portrait_admiral',        // optional default image for its scenes
  slots: { target: { type: 'system', minJumps: 1, maxJumps: 3 } },
  deadline: [5, 8],                 // optional [min, max] days after accepting. Omit for no deadline.
  onAccept: { items: { add: ['medical_supplies'] } },   // optional effects applied on accept
  rewards: { renown: 10, latinum: 20 },   // applied on a success ending (default { renown: 8 })
  penalties: { renown: -5 },              // applied on failure or expiry (default { renown: -4 })
  twists: [{ id: 'trap', chance: 0.3 }],  // optional hidden variations, rolled when offered
  items: { my_item: { name: 'Glowing shard', desc: 'Hums when held.' } },  // optional new cargo items
  stages: [
    { id: 'reach', objective: 'Reach {target}', trigger: { on: 'arrive', slot: 'target' }, node: 'arrive' }
  ],
  nodes: { /* see Nodes */ }
});
```

### Stages and triggers

A mission runs one stage at a time. Each stage has an objective, shown to the player, and a trigger that starts its first node.

| `trigger.on` | Fires when | Needs `slot` |
|---|---|---|
| `arrive` | The ship arrives in the slot's system. If it is already there when the stage begins, it fires at once. | yes, a system slot |
| `scan` | The player runs a full sensor scan in the slot's system. The Science station always offers the scan while a mission is waiting for it. | yes, a system slot |
| `dock` | The player docks at a station in the slot's system (use `has: 'starbase'` on the slot). | yes, a system slot |
| `immediate` | As soon as the stage begins. Use it for crisis briefings or chained scenes. | no |

A stage's scene tree must finish in one of these nodes:

- `advance`: move to the next stage, or to the stage named in `stage`.
- `end`: finish the mission with `result: 'success'` or `result: 'failure'`.

If the player is shown a dead end (every choice hidden or disabled), the engine offers "Stand down". The stage then stays active and triggers again next time.

### Mission rules the engine applies

- A success `end` applies `rewards`, plus `+8` relations with a faction `giver`. A failure `end`, or the deadline passing, applies `penalties`.
- Items added in `onAccept` are removed automatically when the mission ends. Remove other items yourself.
- Twists are rolled once when the offer is created and are never shown to the player. Branch on them with `{ type: 'branch', if: { twist: 'trap' } ... }`.
- Crisis missions add `crisis: true` and `category: 'crisis'`. One is chosen at random when the player's renown reaches the difficulty's threshold, or on a set day. A success ending **wins the game**. A failure ending, or its deadline passing, **ends the game**. Give crises a first stage with `trigger: { on: 'immediate' }` for the briefing.

## Events

```js
ST.content.register({
  kind: 'event',
  id: 'ion_storm',
  context: 'travel',            // when it can fire; see the table below
  weight: 3,                    // optional relative chance, default 1. Repeat events are automatically less likely.
  once: false,                  // optional: true = at most once per game
  title: 'Ion storm',           // optional dialog title
  requires: { locationFaction: 'none' },   // optional condition
  slots: { n: { type: 'number', min: 3, max: 8 } },
  start: 'a',                   // first node
  nodes: { /* ... */ }
});
```

Events end at any `end` node. `result` is ignored for events.

| `context` | When it fires | Extra data available |
|---|---|---|
| `travel` | Randomly between systems during warp travel | |
| `arrival` | Randomly on arriving in a system | location conditions |
| `encounter` | On arrival when a **hostile** ship is present | slot `them` (the hostile faction), the contact |
| `hail` | When the player hails a ship or an inhabited planet | slot `them` (who you hailed), the contact if it is a ship |
| `away` | When the player sends an away team to a planet | `planet` conditions |
| `anomaly` | When the player investigates an anomaly, wormhole or megastructure | `poi` conditions |
| `derelict` | When the player boards a derelict | `poi` conditions |

In `hail` and `encounter` events the other party is the built-in slot `them`.

- Use `{them}`, `{them.leader}` and `{them.vessel}` in text, and `image: '{them.portrait}'` for their picture.
- Use `relation: { them: 5 }` to change relations with them.
- Use `factionIs: { slot: 'them', oneOf: ['klingon'] }` to restrict an event to one faction.
- In combat, `{ faction: 'them', ship: 'contact' }` fights the actual ship you hailed.
- The effect `contact: 'leave' | 'hostile' | 'neutral' | 'friendly'` changes what that ship does next.

## Slots

Slots are filled in the order you write them, so a slot can refer to an earlier one. If any slot cannot be filled, the mission is not offered or the event is not picked. Nothing breaks.

| `type` | Options | Placeholders |
|---|---|---|
| `system` | `minJumps` (default 1), `maxJumps` (default 5), `unvisited: true`, `faction: 'none' \| 'federation' \| 'foreign' \| 'any' \| <faction id> \| '{slot}'`, `has: 'feature\|feature'` (any of), `allowCurrent: true` (with `minJumps: 0`), `homeOf: '<faction or species slot>'` (their capital or homeworld), `reveal: false` (don't chart it on accept) | `{s}` name, `{s.planet}` a notable planet, `{s.faction}` who owns it, `{s.star}` star type |
| `faction` | `oneOf: [ids]`, `prefer: 'hostile' \| 'friendly' \| 'random'`, `present: false` (allow factions not in this sector), `fromLocation: true` (the faction that owns the current system) | `{f}` adjective ("Klingon"), `{f.name}` "Klingon Empire", `{f.short}`, `{f.adj}`, `{f.plural}` "Klingons", `{f.leader}` "Captain Kargh", `{f.title}`, `{f.ship}` ship class, `{f.vessel}` ship name |
| `species` | `prewarp: true/false`, `met: true/false` (default: not yet met). If none fits, a new species is generated with a homeworld. | as faction, plus `{sp.look}` a short physical description |
| `planet` | `system: '<system slot>'` (required), `class: ['M','L']`, `ruins: true`, `colony: true` | `{p}` name, `{p.class}` "Class M", `{p.kind}` "terrestrial", `{p.system}` |
| `officer` | `skill: 'science'` (the best officer at that skill) | `{o}` "Lt. T'Vel", `{o.name}`, `{o.rank}`, `{o.role}` |
| `number` | `min`, `max` | `{n}` |
| `text` | `options: ['...', '...']` (one is chosen) | `{t}` |
| `name` | `species: 'human'` (optional, any key from the species list) | `{nm}` a random personal name |

Names that are reserved and cannot be used for slots: `ship`, `captain`, `stardate`, `system`, `sector`, `shipclass`, `officer`, `away`, `them`.

## Nodes

`nodes` is an object of `id: node`. Every node has a `type`. Optional on every node:

- `text`: paragraphs separated by a blank line (`\n\n`). `*word*` renders highlighted.
- `title`: overrides the dialog title.
- `speaker`: a small caption above the text, such as `'{them.leader} · {them.vessel}'`.
- `image`: see [Images](#images).
- `effects`: applied when the node is entered.

| `type` | Required fields | Notes |
|---|---|---|
| `scene` | `text`, and either `choices` (non-empty) or `next` | Choices are covered in the next section. With `next` and no choices, it shows a Continue button. |
| `end` | missions: `result: 'success' \| 'failure'` | Closes the story. For missions, finishes the mission. |
| `advance` | none. `stage: '<stage id>'` is optional. | Missions only. Shows `text` if given, then moves on to the next (or named) stage. |
| `branch` | `if` (condition), `then`, `else` | Instant, invisible branch. |
| `random` | `branches: [{ weight, next }]` | Instant weighted random branch. |
| `combat` | `enemies`, `win`, `flee`. Optional: `surrender`, `canFlee: false`, `canHail: false`. | See below. |
| `negotiation` | `party`, `win`, `lose`. Optional: `rounds` (3–10, default 6), `difficulty`, `topic`. | Starts the diplomacy minigame. |
| `away_team` | `next`. Optional: `size: [min, max]` (1–4, default [1, 3]), `recommend: ['science', ...]` | The player picks officers. Later checks use only those officers. |

### Combat nodes

```js
battle: {
  type: 'combat', text: 'The raiders open fire.',
  enemies: [{ faction: 'orion', ship: 'medium' }, { faction: '{enemy}', ship: 'light', count: 2 }],
  win: 'won', flee: 'fled', surrender: 'spared'
}
```

- `faction` takes a faction id, `'{slot}'` for a faction or species slot, or `'them'`.
- `ship` takes a tier (`light`, `medium`, `heavy`, `boss`), a ship id (see [Vocabulary lists](#vocabulary-lists)), or `contact` for the ship being hailed or encountered.
- `count` can be 1–4.
- Where the fight leads next:
  - `win`: every enemy was destroyed, fled or stood down.
  - `surrender`: nobody was destroyed and at least one enemy surrendered or agreed a ceasefire. Defaults to `win`.
  - `flee`: the player spooled the warp drive and escaped. The ship pulls back to the previous system.
- If the player's ship is destroyed, the game ends. There is no "lose" branch.
- `canFlee: false` removes the retreat option.

### Negotiation nodes

`party` takes a faction id, `'{slot}'` or `'them'`. `difficulty` raises the starting tension (see Vocabulary lists). The minigame is built into the engine:

- Each round the envoy raises a concern: one of their values (honour, profit, security, knowledge, autonomy, tradition).
- The player answers with an approach card. Cards that match what the party values build Agreement. Cards that clash raise Tension.
- It is won at 100 Agreement, or at 70 or more when the rounds run out. It is lost at 100 Tension.
- The engine adds a small relation change of +6 or −4. Add more in your `win` and `lose` nodes if the stakes call for it.

## Choices and skill checks

```js
choices: [
  { label: 'Beam them out', check: { skill: 'engineering', difficulty: 'moderate' }, success: 'saved', failure: 'lost' },
  { label: 'Pay them off', cost: { latinum: 40 }, next: 'paid' },
  { label: 'Use the node', requires: { item: 'borg_node' }, check: { skill: 'science', difficulty: 'hard', team: 'away' }, success: 'win', failure: 'fight' },
  { label: 'Leave', effects: { morale: -3 }, next: 'bye' }
]
```

- `label` (required): what the player says or does. Write it as an order or a quote.
- Use either `next` (no check), or `check` with both `success` and `failure`.
- `check.skill` is one of the six skills. `check.difficulty` is one of the five difficulties.
- `check.team` is optional: `'away'` uses only the away team, `'bridge'` uses the whole crew. When an away team is on the ground, checks use the away team by default.
- `cost` takes resources to spend, as positive numbers. The choice is disabled if the player can't pay.
- `requires` takes a condition.
  - If the condition only checks resources (`min`), the choice is shown **disabled** with the reason.
  - If it checks anything else (flags, items, factions, traits, and so on), the choice is **hidden** when not met.
- `effects` are applied when the choice is taken, before any check.
- `style` is an optional colour hint: `fight`, `neutral`, `diplomacy`, `command`, `tactics`, `engineering`, `science`, `medicine`. By default it follows the check's skill, and a choice that leads straight into combat is styled `fight`.

**How a check works.** The best available officer's skill is used, plus a ship class bonus.

- The chance is the difficulty's base chance, plus 8% per skill point above 3 (minus 8% per point below).
- Small modifiers apply for morale, for the game's difficulty setting, and for traits (`lucky` +4%, `warrior` +5% on tactics).
- The result is clamped between 5% and 95%.
- The player always sees the percentage and who is attempting it.
- The officer gains experience either way.

## Effects

Effects are one object. Every key is optional and you can combine them freely.

| Key | Value | Meaning |
|---|---|---|
| `hull`, `shields`, `dilithium`, `torpedoes`, `spares`, `latinum`, `crew`, `morale`, `renown` | number | Add or subtract, clamped to the ship's limits |
| `time` | number (days) | Advance the clock. Deadlines tick, crew heal. |
| `xp` | number | Experience to the away team, or else the last officer who made a check, or else the whole crew |
| `repair` | number | Restore that many percent to every system, and half that to the hull |
| `relation` | `{ klingon: 5, enemy: -3, them: 2 }` | Keys are faction ids, slot names or `them`. Range −100 to 100. |
| `injure` | `{ who, count, severity }` | `who`: `random`, `away`, `bridge`, `captain`, or a skill name (the best officer at it). `severity`: `injured` (default), `critical` or `killed`. The captain is never killed; critical at worst. |
| `damage` | `{ system, amount }` | `system`: `phasers`, `torpedoes`, `shields`, `engines`, `sensors` or `random`. Amount is percent. |
| `items` | `{ add: [...], remove: [...] }` | Cargo and passengers. Ids come from the item list or your pack's `items`. |
| `setFlags`, `clearFlags` | `['my_flag']` | Permanent game-wide flags. Prefix them with your mission id. |
| `reveal` | `'nearby'` or a system slot name | Chart systems on the map |
| `startMission` | mission id | Start another mission immediately, as a follow-up chain |
| `log` | text | Add a line to the captain's log |
| `contact` | `'leave' \| 'hostile' \| 'neutral' \| 'friendly'` | Hail and encounter events only: change the ship's attitude, or make it leave |
| `openTrade` | `true` | Open the trade screen with `them` when the scene ends |
| `heal` | `'all' \| 'away'` | Heal injured officers |

Special engine flags:

- `borg_weak` weakens the Borg cube.
- `doomsday_weak` weakens the Planet Killer.

## Conditions

A condition is one object. **Every key must be true** (AND). Use `any: [...]` for OR and `not: {...}` for NOT.

| Key | Value | True when |
|---|---|---|
| `flag` / `notFlag` | string or array | Every flag is set / none of them is set |
| `item` / `notItem` | item id | The item is aboard / not aboard |
| `min` | `{ latinum: 20, torpedoes: 1 }` | The player has at least this much |
| `relationAtLeast` / `relationBelow` | `{ klingon: 10, them: -30 }` | Relations are at least / below the value |
| `twist` / `notTwist` | twist id | Missions only: the twist was rolled / was not rolled |
| `trait` | trait id | An available officer (or someone on the away team) has the trait |
| `skillAtLeast` | `{ science: 5 }` | The best available officer has at least that skill |
| `locationFaction` | `'none' \| 'major' \| 'foreign' \| <id>`, or an array | Who owns the current system |
| `locationHas` | a feature or POI type, or an array | The current system has it |
| `factionIs` | `{ slot: 'them', oneOf: ['klingon', 'species'] }` | The slot's faction is one of these. `species` matches any generated species. |
| `planet` | `{ class, life, ruins, dilithium, colony }` | Away events: the planet matches every key given |
| `poi` | `{ type, kind }` | Anomaly and derelict events: the investigated object matches |
| `day` | `{ min, max }` | The game day is in range |
| `chance` | 0–1 | A random roll succeeds |
| `renownAtLeast` | number | Renown is at least this |
| `missionActive` | mission id | That mission is active |
| `shipClass` | `'intrepid' \| 'galaxy' \| 'defiant'`, or an array | The player's ship class |
| `any` | `[condition, ...]` | At least one is true |
| `not` | condition | The condition is false |

## Text placeholders

Placeholders work in every text field: `title`, `briefing`, `objective`, `text`, `speaker`, `label`, `topic` and `log`.

| Placeholder | Becomes |
|---|---|
| `{ship}` | "U.S.S. Aurora" |
| `{shipclass}` | "Intrepid-class" |
| `{captain}` / `{captain.name}` | "Captain Reyes" / "Elena Reyes" |
| `{stardate}`, `{system}`, `{sector}` | Current stardate, current system, sector name |
| `{officer.<skill>}` | The best officer at that skill, e.g. `{officer.medicine}` → "Lt. Tavek" |
| `{officer.<role>}` | By role: `xo`, `tac`, `eng`, `sci`, `med`, `cns` |
| `{officer.random}` | Any available officer |
| `{away.leader}` / `{away.any}` | Away-team members |
| `{slot}` / `{slot.prop}` | See the Slots table |
| `{them...}` | Hail and encounter events: the other party, with faction properties |

The validator rejects unknown placeholders, so typos are caught.

## Images

`image` accepts:

- An art key: `planet_m` `planet_l` `planet_o` `planet_h` `planet_p` `planet_k` `planet_n` `planet_y` `planet_j` `warp` `nebula` `ion_storm` `rift` `wormhole` `asteroids` `derelict` `starbase` `trade_station` `pulsar` `megastructure` `entity` `black_hole` `ship_player` `ship_intrepid` `ship_galaxy` `ship_defiant` `ship_klingon` `ship_romulan` `ship_cardassian` `ship_ferengi` `ship_orion` `ship_unknown` `ship_cube` `doomsday` `portrait_admiral` `portrait_klingon` `portrait_romulan` `portrait_cardassian` `portrait_ferengi` `portrait_orion` `portrait_alien1` `portrait_alien2` `portrait_borg` `surface_ruins` `surface_colony` `surface_caves`
- `'@location'`: the current system or planet. This is the default for events.
- `'@ship'`: the player's own ship, matching the ship class they chose.
- `'{slot}'`: a system or planet slot's picture, or a faction's portrait.
- `'{slot.portrait}'` / `'{slot.ship}'`: a faction or species' person or ship.

Missing pictures are drawn procedurally, so an image key never breaks anything. To add art, put a 16:9 JPG in `assets/img/` and add a line to `assets/manifest.js`.

## Vocabulary lists

- **Skills:** `command`, `tactics`, `engineering`, `science`, `medicine`, `diplomacy`
- **Difficulties** (base chance at skill 3): `trivial` 92%, `easy` 78%, `moderate` 62%, `hard` 46%, `extreme` 30%
- **Mission categories:** `survey`, `first_contact`, `rescue`, `delivery`, `escort`, `patrol`, `investigate`, `recover`, `hunt`, `mediate`, `archaeology`, `medical`, `trade`, `crisis`
- **Event contexts:** `travel`, `arrival`, `encounter`, `away`, `anomaly`, `derelict`, `hail`
- **Factions:** `federation`, `klingon`, `romulan`, `cardassian`, `ferengi`, `orion` (pirates, always present), `borg` and `ancient` (crisis only). Each game uses 3–4 of the four majors (Klingon, Romulan, Cardassian, Ferengi). Slots only pick factions present in the sector unless `present: false`.
- **Ships, by faction and tier:**
  - Klingon: `bop` (light), `ktinga` (medium), `vorcha` (heavy)
  - Romulan: `rom_scout` (light), `mogai` (medium), `dderidex` (heavy). All Romulan ships cloak.
  - Cardassian: `hideki` (light), `galor` (medium), `keldon` (heavy)
  - Ferengi: `fer_raider` (light), `dkora` (medium), `dkora_refit` (heavy)
  - Orion: `orion_int` (light), `orion_raider` (medium), `orion_corsair` (heavy)
  - Borg: `borg_probe` (heavy), `borg_cube` (boss)
  - Ancient: `doomsday` (boss)
  - Generated species use tiers only.
- **Officer traits:** `empath`, `telepath`, `joined`, `warrior`, `brilliant`, `veteran`, `diplomat`, `miracle_worker`, `field_medic`, `daredevil`, `lucky`
- **Items:** `medical_supplies`, `ambassador`, `data_core`, `artifact`, `cure_sample`, `trade_goods`, `refugees`, `prisoner`, `borg_node`, `tachyon_data`, `probe_logs`, `spare_core`, or define your own in `items`
- **POI types** (for `has` and `locationHas`): `starbase`, `outpost`, `trade`, `colony`, `anomaly`, `derelict`, `asteroids`, `nebula`, `megastructure`, `wormhole`
- **System features** (for `has` and `locationHas`): `dilithium`, `ruins`, `habitable`, `life`, `station`, `pulsar`, `blackhole`, `star:collapsed`, `planet:M,L` (any listed class)
- **Anomaly kinds** (for `poi.kind`): `rift`, `ion`, `entity`, `wormhole`
- **Planet classes:** `M` terrestrial, `L` marginal forest, `O` ocean, `H` desert, `P` glaciated, `K` barren, `N` volcanic, `Y` toxic, `J` gas giant
- **Planet life:** `none`, `microbial`, `flora`, `fauna`, `sentient`, `prewarp`

## Balance guide

| Thing | Typical range |
|---|---|
| Mission renown reward | 6–16. Crisis: 30. The crisis threshold is 70 / 90 / 100 renown by difficulty. |
| Event renown | 1–8 for good outcomes, −1 to −6 for bad ones |
| Latinum reward | 15–90. A refit costs 70–160. |
| Hull damage in a scene | 5–20. The hull is 100–140. |
| Spares | ±1–5. They repair systems and the hull. |
| Dilithium | ±2–12. One jump costs about 1–2. |
| Deadline | About 2 days per jump to the farthest target, plus 3–5 days of slack |
| Checks | Most choices `moderate`. Use `hard` for big payoffs. Keep `extreme` for long shots. Always give a no-check fallback somewhere, or a failure path that still moves the story on. |

Good content:

- Offers **2–4 meaningful choices** per scene, each tied to a different skill, so different crews shine.
- Makes **failure interesting**: it costs something and the story carries on.
- Uses **twists** so a mission played twice can go differently.
- Keeps each text block to about 30–90 words. This is a console, not a novel.
- Sounds like Star Trek: curious, principled, dryly funny under pressure. Uses the Prime Directive, first contact and diplomacy as often as phasers.

## Worked examples

### A mission with a twist, two stages and a fight

```js
ST.content.register({
  kind: 'mission', id: 'lost_convoy', category: 'rescue', weight: 2,
  title: 'The missing convoy',
  briefing: 'A three-ship supply convoy bound for {colony} has vanished near {last}. Find it.',
  slots: {
    last: { type: 'system', minJumps: 1, maxJumps: 3, faction: 'none' },
    colony: { type: 'system', minJumps: 1, maxJumps: 5, has: 'colony' }
  },
  deadline: [10, 14],
  rewards: { renown: 10, spares: 3 },
  penalties: { renown: -4 },
  twists: [{ id: 'pirates', chance: 0.4 }],
  stages: [
    { id: 'search', objective: 'Search for the convoy at {last}', trigger: { on: 'arrive', slot: 'last' }, node: 'search' },
    { id: 'escort', objective: 'Escort the convoy to {colony}', trigger: { on: 'arrive', slot: 'colony' }, node: 'arrive' }
  ],
  nodes: {
    search: {
      type: 'scene', image: 'asteroids',
      text: 'Faint warp trails lead into an asteroid field. {officer.science} thinks the convoy is hiding in there.',
      choices: [
        { label: 'Sweep the field with sensors', check: { skill: 'science', difficulty: 'moderate' }, success: 'found', failure: 'found_late' },
        { label: 'Broadcast a Starfleet recognition code', next: 'found' }
      ]
    },
    found_late: { type: 'scene', text: 'It takes most of a day, but you find them.', effects: { time: 1 }, next: 'found' },
    found: { type: 'branch', if: { twist: 'pirates' }, then: 'ambush', else: 'safe' },
    ambush: { type: 'combat', text: 'Raiders were waiting for them, and now for you.', enemies: [{ faction: 'orion', ship: 'light', count: 2 }], win: 'safe', flee: 'lost' },
    safe: { type: 'advance', text: 'The convoy forms up behind you. Next stop: {colony}.' },
    lost: { type: 'end', result: 'failure', text: 'You escape, but the convoy does not.' },
    arrive: { type: 'end', result: 'success', image: 'surface_colony', text: 'The convoy unloads at {colony} to cheering crowds.' }
  }
});
```

### A hail event for one faction

```js
ST.content.register({
  kind: 'event', id: 'hail_cardassian_poet', context: 'hail', weight: 2, start: 'a', title: 'An unusual Gul',
  requires: { factionIs: { slot: 'them', oneOf: ['cardassian'] } },
  nodes: {
    a: {
      type: 'scene', image: '{them.portrait}', speaker: '{them.leader} · {them.vessel}',
      text: '"Captain. Before we discuss borders, may I ask your opinion of *The Never-Ending Sacrifice*? It is our finest novel."',
      choices: [
        { label: '"Repetitive, but powerfully so."', check: { skill: 'diplomacy', difficulty: 'moderate' }, success: 'friend', failure: 'huff' },
        { label: '"I haven\'t read it."', next: 'huff' }
      ]
    },
    friend: { type: 'end', text: '"A critic! Finally." The Gul looks almost happy.', effects: { relation: { them: 6 } } },
    huff: { type: 'end', text: '"How very Federation." The channel closes.', effects: { relation: { them: -1 } } }
  }
});
```

## Prompt for another LLM

Copy everything in this block. Paste it into another LLM together with **this whole document**. Edit the request line at the end.

```text
You are writing new content for "Frontier Command", a browser game in the style of Star Trek played on LCARS console screens. The attached document (MISSION_AUTHORING.md) is the complete specification of the content format. Follow it exactly.

Output ONE JavaScript file and nothing else. The file must:
- contain only calls of the form ST.content.register({ ... }); with plain object literals (no functions, variables, imports, template literals or comments that contain code),
- use only the kinds, categories, contexts, node types, triggers, slot types, effects, conditions, placeholders, image keys, ship ids, item ids, traits and other values listed in the document,
- give every definition a unique snake_case id with a prefix for this pack (for example "pack2_"), and prefix any new flags the same way,
- make every node reachable, with every path ending in an `end` node (missions: result "success" or "failure") or, for missions, an `advance` node,
- use `success` and `failure` (not `next`) on any choice that has a `check`,
- define any new cargo item in a top-level `items` field of the definition that uses it,
- keep each text block to roughly 30–90 words, in the tone of Star Trek: curious, principled, humane, a little dry,
- give most scenes 2–4 choices that use different skills, and make failures cost something without ending the story,
- follow the Balance guide for rewards, damage and deadlines,
- use slots and twists so the content plays differently each time.

Before answering, check your own output against the Checklist at the end of the document.

Request: write 5 new missions (at least one diplomatic, one exploration, one with combat) and 6 new random events (2 travel, 2 away, 1 arrival, 1 hail).
```

When you get the file back:

1. Save it under `content/`.
2. Add its `<script>` tag to `index.html`.
3. Run `node tools/validate-content.mjs`.
4. Paste any errors back to the LLM and ask it to fix them. They are written to be self-explanatory.

## Checklist

- [ ] Only `ST.content.register({...})` calls with plain data
- [ ] Unique ids, prefixed per pack
- [ ] Missions have `title`, `briefing`, `category`, `stages` and at least one `end` with `result: 'success'`
- [ ] Every stage's `trigger.slot` is a system slot, and its `node` exists
- [ ] Events have a valid `context` and `start`
- [ ] Every choice has `label`, and either `next` or `check` plus `success` and `failure`
- [ ] Every referenced node id exists; no node is unreachable or trapped in a loop
- [ ] Placeholders match slots or built-ins; image keys come from the list
- [ ] New items are declared in `items`; flags are prefixed
- [ ] `node tools/validate-content.mjs` reports **All content is valid**
