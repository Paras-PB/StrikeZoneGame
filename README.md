# 🎯 STRIKEZONE — Tactical Browser FPS

[![Play it live](https://img.shields.io/badge/▶_PLAY_IT_LIVE-strike--zone--game--pink.vercel.app-orange?style=for-the-badge)](https://strike-zone-game-pink.vercel.app)
[![Docker image](https://github.com/Paras-PB/StrikeZoneGame/actions/workflows/main.yml/badge.svg)](https://github.com/Paras-PB/StrikeZoneGame/actions)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-black)](https://threejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)

A fast, COD-style **wave shooter that runs entirely in your browser** — no downloads. Every 3D model is built from primitives and every sound effect is synthesized live with the Web Audio API.

**Survive 10 waves. Draft a perk after every wave. Kill the Juggernaut. Then decide: extract, or push into endless.**

> 3 maps · 9 enemy types · 2 bosses · 6 weapons · 13 achievements · 8 ranks · ~100 kB first load

---

## ▶ Play

**Online:** **[strike-zone-game-pink.vercel.app](https://strike-zone-game-pink.vercel.app)** — just open it and click **PLAY**. Desktop Chrome/Edge recommended (mouse aiming uses pointer lock).

**Locally:**

```bash
git clone https://github.com/Paras-PB/StrikeZoneGame.git
cd StrikeZoneGame
npm install
npm run dev        # http://localhost:3000
```

Production: `npm run build && npm start`. Weak GPU? Add `?lowfx` to the URL (shadows off), or set Quality to Low in Settings.

**Docker** — every push to `main` publishes an image to GitHub Packages (GHCR):

```bash
docker pull ghcr.io/paras-pb/strikezonegame:latest
docker run -p 3000:3000 ghcr.io/paras-pb/strikezonegame:latest
# → http://localhost:3000
```

Or build it yourself from the repo root: `docker build -t strikezone .`

---

## 🕹️ How to play

You hold an arena against escalating waves. Clear a wave → **draft 1 of 3 stacking perks** → next wave hits harder. Some waves change the rules: fight at **night** (every 3rd wave), in a **storm** (rain, fog), or **defend the zone** (hold the glowing ring for 60 s — the timer only ticks while you're inside). One **supply drop** parachutes in per wave with a medkit, ammo, grenades, or 20 s of double-damage **Overdrive**.

Wave 10 is a boss. Clear it and you win — or keep going: **endless mode** scales forever, with a boss every 5 waves and your best wave saved. Kills build a **combo multiplier** (up to ×5) and earn killstreak tools: a sentry turret, health bags, and an airstrike every 25 kills.

## ⌨️ Controls

| Input | Action |
|---|---|
| WASD | Move |
| SHIFT | Sprint |
| SPACE | Jump (slide-jumps and bunny-hops preserve momentum) |
| C / CTRL | Slide (needs momentum — chain it out of a sprint) |
| Mouse | Aim (pointer lock) |
| LMB / RMB | Fire / Aim down sights |
| R | Reload |
| 1 – 6 | Select weapon (see arsenal below) |
| G | Throw frag grenade |
| F | Deploy sentry turret |
| H | Deploy health bag |
| X | Call airstrike (earned every 25 kills) |
| ESC | Pause menu (resume / settings / restart / quit) |

## 🔫 Arsenal

| Key | Weapon | Role |
|---|---|---|
| 1 | **MK-7 PHANTOM** | Assault rifle — the all-rounder |
| 2 | **VK-9 HORNET** | SMG — fastest fire rate, close range |
| 3 | **BR-12 BREAKER** | Shotgun — 8 pellets, devastating up close |
| 4 | **L96 WHISPER** | Sniper — 150 dmg, true 8× scope on ADS |
| 5 | **M249 SAW** | LMG — 100-round belt, 800 rpm, built for crowds |
| 6 | **FIM-92 STINGER** | Lock-on launcher — hold RMB on air targets 0.8 s, fire a homing rocket |

Plus **frag grenades** (arc, bounce, 1.6 s fuse), **explosive barrels** that chain-react, a deployable **sentry turret** (45 s, auto-fires, +1 charge every 2 waves) and **health bags** (heal 15 HP/s inside the ring, 12 s).

## 👾 Enemies & bosses

- **Soldier** — standard rifleman. **Runner** — fast and light. **Heavy** — slow tank.
- **Exploder** — sprints at you and detonates. Shoot him early, or let his blast clear his friends.
- **Marksman** (wave 6+) — holds ~24 m, paints you with a red laser for ~1.15 s, then one heavy shot. Break line of sight to cancel the aim.
- **Drone** (wave 5+) — hovers at ~3.3 m and fires down. Hit the glowing core for a "headshot"; it crashes when killed.
- **Stalker** (woods maps, wave 7+) — ghillie ambusher, near-invisible (16% opacity) while still. Stray within 9 m or wound him and he rushes you.
- **JUGGERNAUT** (boss, wave 10) — huge HP bar, and at 40% health he **enrages**: +55% speed, +30% damage, and calls in 3 escorts.
- **GUNSHIP** (boss, alternating boss waves from 15) — an attack helicopter that orbits the arena, strafes with a minigun, and fires telegraphed rocket salvos (red rings shrink before impact). Ground explosions can't reach it — shoot it, or lock it with the Stinger. At 50% HP it speeds up both.

## 🗺️ Maps

- **🏙️ Bermuda Town** — a Free Fire-style town (V9): a climbable **Clock Tower** at the plaza, an enterable **Factory**, five houses, and a **Container Yard** — with named locations that announce themselves as you enter them.
- **🌲 Forest Outpost** — dawn mist, 46 trees, log cabins, a watchtower and a palisade.
- **🍂 Autumn Ridge** — the outpost at sunset: golden canopy, leaf-litter ground, falling leaves.

## 📈 Progression & polish

- **Perk draft** after every wave: damage, speed, reload, max health, ammo, regen — they stack all run.
- **XP & 8 ranks** — Recruit → Corporal → Sergeant → Lieutenant → Captain → Major → Colonel → Commander, persistent across sessions.
- **13 achievements** with in-game toasts and a menu checklist (First Blood, Demolitionist, Sharpshooter, Night Owl, Boss Slayer, Skyfall, Storm Rider, Timber, Bermuda Regular, …).
- **Combo system** — chained kills within 3.5 s multiply score up to ×5, with DOUBLE KILL / TRIPLE KILL / RAMPAGE callouts.
- **Live tactical minimap** — enemies in real time (bosses and marksmen marked), zone, barrels, sentry and airstrike markers.
- **Game feel** — final-kill slow-motion, floating damage numbers, headshot *ping*, tracers, hitmarkers, killfeed, damage flash, camera roll + FOV kick on slides.
- **Pause & settings** — Esc freezes the whole simulation (timers included). Settings, saved to your browser: mouse sensitivity ×0.3–2.5, master volume, invert-Y, and High/Low quality.

---

## 🏗️ Architecture

The game state is split so the render loop never re-renders React at 60 fps:

- `lib/game.ts` — shared mutable runtime: colliders, enemy/barrel registries, FX queues, explosions, slow-mo, pause deadline-shifting. Pure data + math, no React.
- `lib/store.ts` — Zustand store for UI state only: phase (`menu → playing → perk → paused → dead/victory`), health, ammo, weapons, perks, combo, stats, boss HP, settings, XP/achievements.
- `lib/audio.ts` — every SFX synthesized with WebAudio (shots, reloads, explosions, footsteps, UI); zero audio files.
- `components/` — `Player` (movement, hitscan, lock-on), `Enemies` (AI, waves, kinds, both bosses), `World` (maps, day/night/storm lighting), `WeaponModel`, `Effects` (tracers, impacts, explosions), `HUD`, `Minimap`, `CompassBar`, `WaveBanner`, `MainMenu`, `PauseMenu`, `SettingsPanel`, `PerkDraft`, plus one component per system (turret, grenades, rockets, airstrike, zone, supply drops, health bag).

Wave scaling: enemy count `3 + wave × 2` (cap 14), HP `90 + wave × 14`, speed and fire rate scale per wave, with kind-specific multipliers on top.

## 🛠️ Tech

Next.js 14 · React 18 · Three.js · @react-three/fiber · @react-three/drei · Zustand · Tailwind CSS · TypeScript · Docker (standalone output) · deployed on Vercel

## 🖥️ V8 — HOLOGRAM UI

V8 is a full frontend overhaul — every screen rebuilt on one **cyan military-hologram design system**, the old orange UI removed in one go. Gameplay is untouched.

- **Design system** — deep-navy glass panels with hairline cyan borders, L-shaped corner brackets, scanline texture, and a shared set of holo panel/button/chip/keycap styles. **Orbitron** for titles and numbers, **Rajdhani** for UI text.
- **Main menu** — glowing Orbitron title, staggered panel entrances, maps as selectable holo cards with a lit selected state, and the cabin backdrop retinted toward navy so the hologram sits on it.
- **HUD rebuilt** — segmented health bar (one segment per 10 HP; cyan → amber → pulsing red as it drops, with a heartbeat vignette under 20%), a big Orbitron ammo readout with low-ammo/reloading states, holo ability chips with key caps, and restyled boss bar, killfeed, combo and toasts.
- **NEW compass bar** — a top-center tick strip (N/E/S/W + degrees) that scrolls with your heading, plus a live degree readout.
- **NEW wave banner** — an animated "WAVE N" splash as each wave begins, calling out NIGHT OPS, STORM WARNING, DEFEND THE ZONE, the FINAL WAVE, boss inbounds, and the start of ENDLESS MODE.
- Perk draft, pause menu, settings (cyan sliders/toggles), minimap frame and the Stinger lock readout all speak the same holo language now.

## 🏙️ V9 — BERMUDA TOWN

The Arena is gone — in its place, a Free Fire (Bermuda-style) town built around named locations, all geometry generated from one shared layout table so rendering, collision and the minimap can never disagree.

- **Clock Tower** — a 9 m brick tower on the central plaza with a glowing clock face and an open railed platform on top. An external staircase (two flights, 24 steps) wraps the east and north sides — climb it and snipe the whole town.
- **Factory** — a 24×15 m enterable warehouse west: two 3.5 m doorways, window strips, a color-block sign, crates and a barrel inside, and a defend-the-zone spot on its floor.
- **Houses** — five enterable houses (door gaps, pitched roofs, warm windows) in FF pastels: a three-house **Residential** cluster in the north-east plus two more south.
- **Container Yard** — rows of ribbed containers in red/blue/green/orange/purple, one stack two high, with lanes to fight through.
- **Named locations** — entering **CLOCK TOWER**, **FACTORY**, **CONTAINER YARD** or **RESIDENTIAL** splashes the name on screen, Free Fire style. Streets, sidewalks, crosswalks and the plaza are painted into a new world-aligned ground texture, and the town gets a brighter daytime sky.
- Barrels, defend zones, supply drops and the minimap all moved to match the town. New achievement: **BERMUDA REGULAR** (win a run on Bermuda Town) — 13 total.

## 📜 Version history

| Version | Highlights |
|---|---|
| V1 | The original: 10 waves, AR/SMG, sprint/slide/jump, hitscan, synthesized SFX |
| V2 | Enemy types + Juggernaut boss, BR-12 shotgun, perk draft, combo system, night waves |
| V3 — AIRBORNE | Drones, defend-the-zone, endless mode, grenades, L96 sniper, XP/ranks, achievements |
| V4 — FRONTIER | Forest Outpost map, sentry turret, Marksman, M249 SAW, airstrike, tactical minimap |
| V5 — GUNSHIP | Gunship boss, FIM-92 Stinger lock-on, storm waves |
| V6 — EVERFALL | Leafy broadleaf trees, Autumn Ridge map, Stalker ambusher |
| V7 — PAUSE & SETTINGS | Esc pause menu that truly freezes the sim; sensitivity / volume / invert-Y / quality settings |
| V8 — HOLOGRAM UI | Full UI overhaul: cyan holo design system, rebuilt HUD, compass bar, wave banner, Orbitron/Rajdhani type |
| V9 — BERMUDA TOWN | Arena reshaped into a Free Fire-style town: climbable clock tower, enterable factory + houses, container yard, named-location popups |

---

Built by **Paras Dwivedi** — CSE (AI & ML) student at VIT. PRs and issues welcome.
