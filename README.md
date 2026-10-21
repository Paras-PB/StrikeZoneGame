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
| 1 / 2 / 3 | AR / SMG / Shotgun |

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
