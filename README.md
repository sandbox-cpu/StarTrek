# Frontier Command

A Star Trek-style starship command game played entirely through LCARS console screens. You command a lone Starfleet ship on a randomly generated frontier. Explore solar systems, send away teams, negotiate with the great powers, fight real-time battles and handle whatever the sector throws at you. Missions and events are randomised every game, and it all builds toward a sector-wide crisis.

*Unofficial fan project. Star Trek and LCARS are trademarks of CBS Studios and Paramount; this project is not affiliated with or endorsed by them.*

## Play

No build step and no install. Either:

- open `index.html` in a browser, or
- serve the folder, e.g. `python3 -m http.server 8000`, then visit http://localhost:8000

The game autosaves to the browser after every action. **Continue command** on the title screen picks up where you left off.

**Controls**

- Click the stations on the left, or press `1`–`8`.
- In combat, `Space` pauses and resumes.
- Every risky choice shows its odds and which officer will attempt it before you commit.

## What's in the game

| Station | What you do there |
|---|---|
| **Bridge** | Main viewscreen, captain's log, current system, quick orders, active missions |
| **Navigation** | Sector map with warp lanes, faction territory and fog of war. Plot a course, pick a warp factor, engage. |
| **Science** | System sensor display. Scan the system and its planets, enter orbit, mine dilithium, send away teams, investigate anomalies and derelicts. |
| **Tactical** | Real-time-with-pause combat console. Outside battle: weapon status, power presets and contacts you can engage. |
| **Engineering** | Power distribution, repairs with spare parts, refits bought at starbases and trading posts |
| **Operations** | Senior staff (skills, traits, injuries, levels), cargo, and starbase services when docked |
| **Comms** | Hail ships and worlds, the Starfleet mission board, diplomatic relations |
| **Mission log** | Objectives, deadlines, campaign progress, service record |

- **Exploration**:
  - About 24 procedurally generated systems joined by warp lanes.
  - Nine planet classes, plus nebulae, asteroid fields, derelicts, anomalies, wormholes, pulsars, black holes and ancient megastructures.
  - Uncharted space is revealed as you travel.
- **Crew**:
  - Six officers drawn from a range of Federation species, each with traits such as empath, telepath or miracle worker.
  - Six skills: command, tactics, engineering, science, medicine and diplomacy.
  - Officers gain experience and rank. They can also be injured or killed.
- **Diplomacy**:
  - Relations run from −100 to +100 with the Klingons, Romulans, Cardassians, Ferengi, Orion pirates and newly contacted species.
  - Formal talks are a negotiation minigame: answer each concern with something the other side values.
- **Combat**:
  - Allocate reactor power, target subsystems, fire phasers and torpedoes.
  - Officer abilities include evasive patterns, attack patterns, rerouting power and remodulating shields.
  - You can hail mid-battle to demand surrender or a ceasefire, or retreat by spooling the warp drive.
  - Romulans cloak, and the Borg adapt.
- **Replayability**:
  - The seed changes the sector layout and which powers appear.
  - 17 randomised mission templates with hidden twists.
  - 54 random events.
  - 4 crisis finales.
  - 3 ship classes and 3 difficulty levels.
- **Sound**: every console chirp, klaxon, phaser and warp effect is synthesised live with Web Audio.

## Adding missions and events

All missions and events are **pure data** in `content/`, so new ones can be written without touching the engine, including by another LLM.

- **[docs/MISSION_AUTHORING.md](docs/MISSION_AUTHORING.md)** is the full format reference, with worked examples and a ready-to-paste prompt for another LLM.
- `node tools/validate-content.mjs` checks every pack (or `node tools/validate-content.mjs path/to/pack.js` for one). It uses the same rules as the game. Invalid content is skipped at runtime and never crashes the game.
- **[docs/mission.schema.json](docs/mission.schema.json)** is a JSON Schema for editors and structured output. Regenerate it with `node tools/build-schema.mjs` after changing the vocabulary in `js/schema.js`.

To add a pack: save it in `content/`, add a `<script>` line for it in `index.html` next to the others, then run the validator.

## Art

Scenes use a library of 16:9 images: planets by class, space phenomena, faction ships and viewscreen portraits. They were generated with Higgsfield (GPT Image 2.5).

- `assets/art-sources.json` lists every image's prompt and download link, so new art can match the style.
- `python3 tools/fetch-art.py` downloads the generated images into `assets/img/` as web-sized JPEGs (needs `pip install pillow` and network access to the image host).
- `assets/manifest.js` maps art keys to files. Any image that is missing is drawn procedurally on canvas, so the game is fully playable without them.

The console font is [Antonio](https://fonts.google.com/specimen/Antonio) (SIL Open Font License), bundled in `assets/fonts/`.

## Project layout

```
index.html              page shell and script list
css/lcars.css           LCARS styling, alert states, layout
js/core.js              namespace, seeded RNG, helpers
js/data.js              factions, ships, planets, species, names, refits, negotiation data
js/schema.js            content vocabulary, validator, registry
js/state.js             new game, crew, skill checks, time, save/load
js/galaxy.js            sector generation, lanes, routing, contacts
js/art.js               image lookup and procedural stand-in art
js/story.js             the content interpreter: slots, text, conditions, effects, dialog runner
js/missions.js          mission board, stages, deadlines, rewards, crisis
js/diplomacy.js         negotiation minigame, trading
js/combat.js            real-time combat engine and tactical display
js/ui.js                LCARS shell, overlays, toasts, actions
js/stations/*.js        one file per console station
js/main.js              title screen, new game, briefing
content/events/*.js     random events (travel, arrival, away, anomaly, derelict, hail, encounter)
content/missions/*.js   missions and crisis finales
tools/                  validator, schema builder, art fetcher
docs/                   authoring guide and JSON Schema
```
