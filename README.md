# STRIKEZONE — Tactical Browser FPS

A fast, COD-style wave shooter that runs entirely in the browser. Built with **Next.js 14 + React Three Fiber / Three.js + Zustand + Tailwind**. No downloaded assets — every 3D model is built from primitives and every sound effect is synthesized live with the Web Audio API.

**Survive 10 waves. Earn a perk after every wave. Kill the Juggernaut.**

## Play

```bash
npm install
npm run dev   # http://localhost:3000
```

Production: `npm run build && npm start`. Desktop Chrome/Edge recommended (pointer lock aiming). Add `?lowfx` to the URL for a low-spec mode (shadows off) on weak GPUs.

## Controls

| Input | Action |
|---|---|
| WASD | Move |
| SHIFT | Sprint |
| SPACE | Jump (slide-jump preserves momentum) |
| C / CTRL | Slide (needs momentum — chain it) |
| Mouse | Aim (pointer lock) |
| LMB / RMB | Fire / Aim down sights |
| R | Reload |
| G | Throw frag grenade |
| 1 / 2 / 3 / 4 | AR / SMG / Shotgun / Sniper |

## What's in V3 — AIRBORNE

- **Drone enemies** — flying units (from wave 5) that hover at ~3.3m, circle you and fire down. Aim up, and hit the glowing core for a "headshot". They crash out of the sky when killed.
- **Juggernaut Phase 2** — at 40% HP the boss enrages (+55% speed, +30% damage) and calls in 3 escorts. The HUD boss bar shows ENRAGED.
- **Defend-the-zone waves** (4, 8, then every 7th in endless) — hold the glowing zone for 60 seconds while reinforcements trickle in. The timer only counts down while you're inside the zone.
- **Endless mode** — after clearing wave 10, extract for victory or continue: waves scale forever, a Juggernaut returns every 5 waves, your best endless wave is saved.
- **Supply drops** — one per wave from wave 2: a crate parachutes in under a beacon. Reach it for a random reward — medkit, full ammo, +2 grenades, or 20s of **Overdrive** (double damage).
- **Frag grenades (G)** — arcing, bouncing, 1.6s fuse, big radial damage. Start with 3, +1 per cleared wave, and they chain beautifully with barrels and Exploders.
- **Sniper — L96 WHISPER** (key **4**): 150 damage, bolt-action pace, and a true 8× scope on ADS (zoomed FOV, scope overlay, fine aim sensitivity).
- **XP & ranks** — runs earn persistent XP: Recruit → Corporal → Sergeant → Lieutenant → Captain → Major → Colonel → Commander, with a progress bar in the menu.
- **8 achievements** — First Blood, Demolitionist, Sharpshooter, Untouchable, Night Owl, Boss Slayer, Rampage, Survivor. Toast popups in-game, checklist in the menu, saved across sessions.

## What's in V2

- **5 enemy types** — Soldiers, fast **Runners**, tanky **Heavies**, **Exploders** that sprint at you and detonate (shoot them from far away, or use their blast against their friends), and a **Wave 10 boss: the Juggernaut**, with its own HUD health bar.
- **Perk draft** — after every cleared wave, pick 1 of 3 stacking upgrades: damage, speed, fast reload, max health, ammo logistics, or faster regen.
- **Explosive barrels** — the red/yellow-banded barrels actually explode now: radial damage to enemies (and you, if you're careless), chain kills included. They respawn each wave.
- **Shotgun (BR-12 Breaker)** — 8-pellet hitscan, devastating up close.
- **Combo system** — chained kills within 3.5s multiply score up to ×5, with DOUBLE KILL / TRIPLE KILL / RAMPAGE announcements.
- **Night ops** — every 3rd wave is fought at night under floodlights and stars.
- **Game feel** — final-kill slow-motion, floating damage numbers, a distinct headshot *ping*, accuracy / headshot stats on the end screen, and a persistent best score (localStorage).
- **Game feel (from V1)** — momentum sliding with camera roll + FOV kick, bunny-hop chains, health regen, tracers, hitmarkers, killfeed, synthesized gunshots/footsteps/reloads.

## Architecture

- `lib/game.ts` — shared mutable runtime (colliders, enemy/barrel registries, FX queues, explosions, slow-mo). Kept outside React so the render loop never re-renders at 60fps.
- `lib/store.ts` — Zustand store for UI state only: phase (`menu → playing → perk → dead/victory`), health, ammo, weapons, perks, combo, stats, boss HP.
- `lib/audio.ts` — all SFX synthesized with WebAudio; zero audio files.
- `components/` — `Player` (movement, hitscan, pellets, barrels), `Enemies` (AI, waves, kinds, boss), `World` (arena, day/night lighting), `Barrels`, `WeaponModel`, `Effects` (tracers, impacts, explosions), `HUD`, `MainMenu`, `PerkDraft`.

Wave scaling: enemy count `3 + wave × 2` (cap 14), HP `90 + wave × 14`, speed and fire rate scale per wave, with kind-specific multipliers on top.

## Tech

Next.js 14 · React 18 · Three.js · @react-three/fiber · @react-three/drei · Zustand · Tailwind CSS · TypeScript
