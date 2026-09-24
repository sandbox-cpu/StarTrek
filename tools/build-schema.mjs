#!/usr/bin/env node
/*
 * Regenerates docs/mission.schema.json from the engine's own vocabulary
 * (js/schema.js, js/data.js, assets/manifest.js) so it never drifts.
 *   node tools/build-schema.mjs
 * The JSON Schema is for editors and LLM structured output. Cross-references
 * (node ids, slot names, placeholders) are checked by tools/validate-content.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sb = { console };
sb.globalThis = sb;
vm.createContext(sb);
for (const f of ['js/core.js', 'js/data.js', 'assets/manifest.js', 'js/schema.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sb);
const { schema: V, DATA: D, ART, ART_ALIAS } = sb.ST;

const str = { type: 'string', minLength: 1 };
const num = { type: 'number' };
const enumOf = (a) => ({ enum: [...a] });
const oneOrMany = (s) => ({ anyOf: [s, { type: 'array', items: s }] });
const factionIds = Object.keys(D.factions);
const imageKeys = Object.keys(ART).concat(Object.keys(ART_ALIAS));
const featureOrPoi = { anyOf: [enumOf(V.POI_TYPES.concat(V.FEATURES)), { type: 'string', pattern: '^planet:[A-Z](,[A-Z])*$' }] };

const effects = {
  type: 'object', additionalProperties: false,
  properties: Object.assign(
    Object.fromEntries(V.NUM_EFFECTS.map(k => [k, num])),
    {
      relation: { type: 'object', additionalProperties: num, description: 'Keys: faction id, slot name or "them"' },
      injure: { type: 'object', additionalProperties: false, required: ['who'], properties: { who: enumOf(V.INJURE_WHO), count: { type: 'integer', minimum: 1 }, severity: enumOf(V.SEVERITIES) } },
      damage: { type: 'object', additionalProperties: false, required: ['system', 'amount'], properties: { system: enumOf(V.SYSTEMS.concat(['random'])), amount: { type: 'number', exclusiveMinimum: 0 } } },
      items: { type: 'object', additionalProperties: false, properties: { add: { type: 'array', items: str }, remove: { type: 'array', items: str } } },
      setFlags: { type: 'array', items: str }, clearFlags: { type: 'array', items: str },
      reveal: { type: 'string', description: '"nearby" or a system slot name' },
      startMission: str, log: str,
      contact: enumOf(['leave', 'hostile', 'neutral', 'friendly']),
      openTrade: { type: 'boolean' },
      heal: enumOf(['all', 'away'])
    })
};
const resourceCost = { type: 'object', additionalProperties: false, properties: Object.fromEntries(V.RESOURCES.map(k => [k, { type: 'number', exclusiveMinimum: 0 }])) };

const condition = {
  type: 'object', additionalProperties: false,
  properties: {
    flag: oneOrMany(str), notFlag: oneOrMany(str), item: str, notItem: str,
    min: { type: 'object', additionalProperties: false, properties: Object.fromEntries(V.RESOURCES.map(k => [k, num])) },
    relationAtLeast: { type: 'object', additionalProperties: num }, relationBelow: { type: 'object', additionalProperties: num },
    twist: str, notTwist: str, trait: enumOf(Object.keys(D.TRAITS)),
    skillAtLeast: { type: 'object', additionalProperties: false, properties: Object.fromEntries(D.SKILLS.map(k => [k, num])) },
    locationFaction: oneOrMany(enumOf(V.LOCATION_FACTIONS)), locationHas: oneOrMany(featureOrPoi),
    factionIs: { type: 'object', required: ['slot', 'oneOf'], properties: { slot: str, oneOf: { type: 'array', items: enumOf(factionIds.concat(['species'])) } } },
    planet: { type: 'object', additionalProperties: false, properties: { class: oneOrMany(enumOf(Object.keys(D.planets))), life: oneOrMany(enumOf(Object.keys(D.LIFE_LABELS))), ruins: { type: 'boolean' }, dilithium: { type: 'boolean' }, colony: { type: 'boolean' } } },
    poi: { type: 'object', additionalProperties: false, properties: { type: oneOrMany(enumOf(V.POI_TYPES)), kind: oneOrMany(enumOf(D.ANOMALY_KINDS.map(a => a.id))) } },
    day: { type: 'object', properties: { min: num, max: num } }, chance: { type: 'number', minimum: 0, maximum: 1 },
    any: { type: 'array', items: { $ref: '#/$defs/condition' } }, not: { $ref: '#/$defs/condition' },
    renownAtLeast: num, missionActive: str, shipClass: oneOrMany(enumOf(Object.keys(D.playerClasses)))
  }
};

const choice = {
  type: 'object', required: ['label'],
  properties: {
    label: str, requires: { $ref: '#/$defs/condition' }, cost: resourceCost, effects: { $ref: '#/$defs/effects' },
    check: { type: 'object', required: ['skill', 'difficulty'], additionalProperties: false, properties: { skill: enumOf(D.SKILLS), difficulty: enumOf(Object.keys(D.DIFFICULTIES)), team: enumOf(['away', 'bridge']) } },
    next: str, success: str, failure: str,
    style: enumOf(['fight', 'neutral', 'diplomacy', 'command', 'tactics', 'engineering', 'science', 'medicine'])
  },
  oneOf: [{ required: ['check', 'success', 'failure'], not: { required: ['next'] } }, { required: ['next'], not: { required: ['check'] } }]
};

const image = { anyOf: [enumOf(imageKeys.concat(['@location', '@ship'])), { type: 'string', pattern: '^\\{[A-Za-z_][A-Za-z0-9_]*(\\.(portrait|ship))?\\}$' }] };
const common = { text: str, title: str, speaker: str, image, effects: { $ref: '#/$defs/effects' } };
const nodeOf = (type, req, props) => ({ type: 'object', required: ['type'].concat(req), properties: Object.assign({ type: { const: type } }, common, props) });
const factionRef = { anyOf: [enumOf(factionIds.concat(['them'])), { type: 'string', pattern: '^\\{[A-Za-z_][A-Za-z0-9_]*\\}$' }] };
const node = {
  oneOf: [
    Object.assign(nodeOf('scene', ['text'], { choices: { type: 'array', minItems: 1, items: { $ref: '#/$defs/choice' } }, next: str }), { anyOf: [{ required: ['choices'] }, { required: ['next'] }] }),
    nodeOf('end', [], { result: enumOf(['success', 'failure']) }),
    nodeOf('advance', [], { stage: str }),
    nodeOf('branch', ['if', 'then', 'else'], { if: { $ref: '#/$defs/condition' }, then: str, else: str }),
    nodeOf('random', ['branches'], { branches: { type: 'array', minItems: 1, items: { type: 'object', required: ['weight', 'next'], properties: { weight: { type: 'number', minimum: 0 }, next: str } } } }),
    nodeOf('combat', ['enemies', 'win'], {
      enemies: { type: 'array', minItems: 1, items: { type: 'object', required: ['faction', 'ship'], properties: { faction: factionRef, ship: enumOf(V.TIERS.concat(Object.keys(D.ships))), count: { type: 'integer', minimum: 1, maximum: 4 } } } },
      win: str, flee: str, surrender: str, canFlee: { type: 'boolean' }, canHail: { type: 'boolean' }
    }),
    nodeOf('negotiation', ['party', 'win', 'lose'], { party: factionRef, rounds: { type: 'integer', minimum: 3, maximum: 10 }, difficulty: enumOf(Object.keys(D.DIFFICULTIES)), topic: str, win: str, lose: str }),
    nodeOf('away_team', ['next'], { size: { type: 'array', items: { type: 'integer', minimum: 1, maximum: 4 }, minItems: 2, maxItems: 2 }, recommend: { type: 'array', items: enumOf(D.SKILLS) }, next: str })
  ]
};

const slot = {
  oneOf: [
    { type: 'object', required: ['type'], properties: { type: { const: 'system' }, minJumps: num, maxJumps: num, unvisited: { type: 'boolean' }, faction: { type: 'string' }, has: { type: 'string', description: 'Feature or POI type; "a|b" means any of' }, allowCurrent: { type: 'boolean' }, homeOf: str, reveal: { type: 'boolean' } } },
    { type: 'object', required: ['type'], properties: { type: { const: 'faction' }, oneOf: oneOrMany(enumOf(factionIds)), prefer: enumOf(['hostile', 'friendly', 'random']), present: { type: 'boolean' }, fromLocation: { type: 'boolean' } } },
    { type: 'object', required: ['type'], properties: { type: { const: 'species' }, prewarp: { type: 'boolean' }, met: { type: 'boolean' } } },
    { type: 'object', required: ['type', 'system'], properties: { type: { const: 'planet' }, system: str, class: oneOrMany(enumOf(Object.keys(D.planets))), ruins: { type: 'boolean' }, colony: { type: 'boolean' } } },
    { type: 'object', required: ['type', 'skill'], properties: { type: { const: 'officer' }, skill: enumOf(D.SKILLS) } },
    { type: 'object', required: ['type', 'min', 'max'], properties: { type: { const: 'number' }, min: num, max: num } },
    { type: 'object', required: ['type', 'options'], properties: { type: { const: 'text' }, options: { type: 'array', minItems: 1, items: str } } },
    { type: 'object', required: ['type'], properties: { type: { const: 'name' }, species: enumOf(Object.keys(D.SPECIES)) } }
  ]
};

const base = {
  id: { type: 'string', pattern: '^[a-z0-9_]+$' }, weight: { type: 'number', minimum: 0 },
  requires: { $ref: '#/$defs/condition' },
  slots: { type: 'object', additionalProperties: { $ref: '#/$defs/slot' } },
  nodes: { type: 'object', minProperties: 1, additionalProperties: { $ref: '#/$defs/node' } },
  items: { type: 'object', additionalProperties: { type: 'object', required: ['name'], properties: { name: str, desc: { type: 'string' } } } }
};
const mission = {
  type: 'object', required: ['kind', 'id', 'title', 'briefing', 'category', 'stages', 'nodes'],
  properties: Object.assign({}, base, {
    kind: { const: 'mission' }, title: str, briefing: str, category: enumOf(V.CATEGORIES), giver: { type: 'string' }, image,
    deadline: { anyOf: [{ type: 'null' }, { type: 'array', items: { type: 'number', exclusiveMinimum: 0 }, minItems: 2, maxItems: 2 }] },
    onAccept: { $ref: '#/$defs/effects' }, rewards: { $ref: '#/$defs/effects' }, penalties: { $ref: '#/$defs/effects' },
    twists: { type: 'array', items: { type: 'object', required: ['id', 'chance'], properties: { id: str, chance: { type: 'number', minimum: 0, maximum: 1 } } } },
    crisis: { type: 'boolean' },
    stages: { type: 'array', minItems: 1, items: { type: 'object', required: ['id', 'objective', 'trigger', 'node'], properties: { id: str, objective: str, node: str, trigger: { type: 'object', required: ['on'], properties: { on: enumOf(V.TRIGGERS), slot: str } } } } }
  })
};
const event = {
  type: 'object', required: ['kind', 'id', 'context', 'start', 'nodes'],
  properties: Object.assign({}, base, { kind: { const: 'event' }, context: enumOf(V.CONTEXTS), start: str, title: str, once: { type: 'boolean' } })
};

const out = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'frontier-command/content.schema.json',
  title: 'Frontier Command mission or event definition',
  description: 'The object passed to ST.content.register(...). Generated by tools/build-schema.mjs — do not edit by hand. See docs/MISSION_AUTHORING.md. Cross-references are checked by tools/validate-content.mjs.',
  oneOf: [{ $ref: '#/$defs/mission' }, { $ref: '#/$defs/event' }],
  $defs: { mission, event, slot, node, choice, effects, condition }
};
fs.writeFileSync(path.join(root, 'docs/mission.schema.json'), JSON.stringify(out, null, 2) + '\n');
console.log('Wrote docs/mission.schema.json');
