# Turbo Tales — 3D Kart Racing

A browser arcade racer inspired by Mario Kart. Everything is procedural: tracks, karts,
characters, textures, and audio. No build step, no downloads at runtime except the local
Three.js module.

## Run it

ES modules need to be served over HTTP (opening `index.html` directly will not work).

```bash
# From the repository root
ruby -run -e httpd . -p 8787
```

Open <http://localhost:8787/kart/>. Any static file server works:
`npx serve .`, `python3 -m http.server 8787`, etc.

## Controls

| Action | Keyboard |
| --- | --- |
| Accelerate | `W` / `↑` |
| Brake / reverse | `S` / `↓` |
| Steer | `A` `D` / `←` `→` |
| Drift (hold while steering, release for mini-turbo) | `Shift` / `Z` |
| Use item | `Space` / `X` |
| Recover to track | `R` |
| Pause | `Esc` / `P` |
| Mute | `M` |
| Confirm / start race | `Enter` |

On touch devices, on-screen steering, drift, and item buttons appear automatically and the
kart accelerates by itself.

## Tracks

1. **Sunbeam Speedway** — sunny seaside circuit
2. **Frostbite Fjord** — dusk ice canyon
3. **Neon Nexus** — night city with holographic signs
4. **Dino Jungle** — temple ruins, palms, waterfalls, and a T-rex
5. **Molten Circuit** — lava caldera finale
6. **Coral Cove** — sunset sandbars and sea cliffs
7. **Cloudtop Climb** — floating islands above the clouds
8. **Scorched Dunes** — blind crests and a sandstorm sprint
9. **Cosmic Colosseum** — a neon ring above the planet

Each track has its own spline geometry, scenery set, lighting, sky, weather, item boxes,
boost pads, coins, and minimap. Every circuit climbs and dips through elevation changes, and
each one hides a shortcut: a wide inner-corner apron with its own surface, edge glow, arrows,
and a boost pad. Cut the inside line to shave time, but stay on the apron — the regular
off-road penalty still applies outside it. Painted corner arrows appear on the approach to
the sharpest turns, and boost pads sit flush on the road surface instead of floating.

## Grand Prix cups

| Cup | Races |
| --- | --- |
| **Coast Cup** | Sunbeam Speedway, Coral Cove, Dino Jungle |
| **Sky Cup** | Cloudtop Climb, Frostbite Fjord, Neon Nexus |
| **Ember Cup** | Scorched Dunes, Molten Circuit, Cosmic Colosseum |

Switch to **Grand Prix** in the menu, pick a cup, and race all three rounds against the same
seven rivals. Points use the standard `10-8-6-5-4-3-2-1` table. Standings appear after every
round and the final classification is saved locally.

## CPU difficulty

Pick **Easy**, **Normal**, **Hard**, or **Expert** in the menu before launching. Difficulty
changes AI top speed, cornering confidence, rubber-band strength, and how quickly rivals use
items. The choice is saved with your racer and track.

## Graphics settings

Choose **Low**, **Medium**, **High**, or **Ultra** in the menu or pause screen.

| Preset | Render scale | Shadows | Effects | Weather |
| --- | --- | --- | --- | --- |
| Low | 0.72× | Off | 45% | 40% |
| Medium | up to 1.1× DPR | 1024 map | 75% | 70% |
| High | up to 1.5× DPR | 2048 map | 100% | 100% |
| Ultra | up to 2.5× DPR | 4096 map | 135% | 135% |

Ultra is the **Ultra High Realism** preset for this browser-native build: high render scale,
large soft shadow maps, full particle/weather density, and tuned fog/exposure. It is not
hardware ray tracing or DLSS — those require platform-specific renderer support.

## Features

- 12 racers with distinct procedural animal/robot drivers and hand-drawn SVG portraits
- 9 circuits, 3 Grand Prix cups, 3-lap races, and 7 AI opponents with rubber-banding
- Drift mini-turbos with visible slip angle, lean, sparks, and a glowing drift HUD
- Boost pads (including one on every shortcut), coins, off-road slowdown, barrier collisions
- Items: mushroom, banana, shell, red shell, star, lightning — all with custom vector icons
- Floating item roulette, lap/best-lap tracking, live standings, final results
- Menu showcase that renders the actual selected track with all 8 karts
- Weather systems: snow, rain, embers, fireflies, dust, and cosmic sparks
- PBR-style standard materials, ACES tone mapping, dynamic sun shadows, and animated skies
- WebAudio engine, music, countdown, item, hit, and finish sounds
- Quality scaling for device pixel ratio, shadows, particles, weather, and fog


## Layout

```
kart/
  index.html
  style.css
  fonts/               local Bungee + Outfit woff2
  vendor/three.module.js
  js/
    tracks.js          track, cup, racer, item + difficulty data
    settings.js        Low / Medium / High / Ultra graphics presets
    icons.js           inline SVG racer, item, flag, sound, and pause icons
    textures.js        procedural canvas textures
    world*.js          spline world, terrain, road, shortcuts, props, scenery dispatch
    scenery*.js        per-theme scenery builders
    karts.js           kart, driver, projectile meshes
    effects.js         shader particle pool
    audio.js           procedural audio engine
    race.js            physics, AI, items, laps, cameras, results
    ui.js              menu, HUD, minimap, modals
    game.js            app orchestration and main loop
```
