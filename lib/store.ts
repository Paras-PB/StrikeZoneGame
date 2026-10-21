import { create } from "zustand";

export type WeaponId = "ar" | "smg" | "sg";
export type Phase = "menu" | "playing" | "perk" | "dead" | "victory";

export interface WeaponDef {
  id: WeaponId;
  name: string;
  damage: number;
  headMult: number;
  rpm: number;
  mag: number;
  reserve: number;
  reloadTime: number;
  spreadHip: number;
  spreadAds: number;
  auto: boolean;
  range: number;
  pellets?: number;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  ar: {
    id: "ar",
    name: "MK-7 PHANTOM",
    damage: 26,
    headMult: 2.0,
    rpm: 750,
    mag: 30,
    reserve: 180,
    reloadTime: 1.7,
    spreadHip: 0.028,
    spreadAds: 0.004,
    auto: true,
    range: 120,
  },
  smg: {
    id: "smg",
    name: "VK-9 HORNET",
    damage: 19,
    headMult: 1.8,
    rpm: 950,
    mag: 40,
    reserve: 240,
    reloadTime: 1.45,
    spreadHip: 0.035,
    spreadAds: 0.008,
    auto: true,
    range: 80,
  },
  sg: {
    id: "sg",
    name: "BR-12 BREAKER",
    damage: 11,
    headMult: 1.5,
    rpm: 82,
    mag: 6,
    reserve: 36,
    reloadTime: 2.4,
    spreadHip: 0.085,
    spreadAds: 0.05,
    auto: true,
    range: 42,
    pellets: 8,
  },
};

const fullAmmo = (): Record<WeaponId, { mag: number; reserve: number }> => ({
  ar: { mag: WEAPONS.ar.mag, reserve: WEAPONS.ar.reserve },
  smg: { mag: WEAPONS.smg.mag, reserve: WEAPONS.smg.reserve },
  sg: { mag: WEAPONS.sg.mag, reserve: WEAPONS.sg.reserve },
});

// ---- perks (chosen between waves) ----
export type PerkId = "damage" | "speed" | "reload" | "vitality" | "ammo" | "regen";

export const PERK_DEFS: Record<PerkId, { name: string; icon: string; desc: string }> = {
  damage: { name: "HIGH-VELOCITY ROUNDS", icon: "💥", desc: "+25% weapon damage, permanently. Stacks." },
  speed: { name: "LIGHTWEIGHT FRAME", icon: "🏃", desc: "+12% move & sprint speed. Stacks." },
  reload: { name: "FAST HANDS", icon: "⚡", desc: "Reload 20% faster. Stacks." },
  vitality: { name: "COMBAT STIMS", icon: "❤️", desc: "+25 max health and heal 25 now." },
  ammo: { name: "EXTENDED LOGISTICS", icon: "🎒", desc: "Refill all magazines + big reserve top-up." },
  regen: { name: "NANO REPAIR", icon: "✚", desc: "Health regenerates 70% faster. Stacks." },
};
export const PERK_POOL: PerkId[] = ["damage", "speed", "reload", "vitality", "ammo", "regen"];

function loadBest(): number {
  try {
    return Number(localStorage.getItem("strikezone-best") || 0) || 0;
  } catch {
    return 0;
  }
}

interface GameState {
  phase: Phase;
  health: number;
  maxHealth: number;
  kills: number;
  score: number;
  wave: number;
  enemiesLeft: number;
  pendingWave: number;
  ammo: Record<WeaponId, { mag: number; reserve: number }>;
  activeWeapon: WeaponId;
  reloading: boolean;
  ads: boolean;
  sprinting: boolean;
  sliding: boolean;
  hitmarker: number;
  hitmarkerKill: boolean;
  killfeed: { id: number; text: string }[];
  damageFlash: number;
  timeSurvived: number;
  // V2: combo & stats
  combo: number;
  lastKillAt: number;
  shots: number;
  hits: number;
  headshots: number;
  lastHitDmg: number;
  lastHitAt: number;
  bestScore: number;
  newBest: boolean;
  // V2: boss
  bossHealth: number;
  bossMax: number;
  // V2: perk multipliers
  damageMult: number;
  moveMult: number;
  reloadMult: number;
  regenMult: number;
  perkChoices: PerkId[];
  perksOwned: string[];
  startGame: () => void;
  finish: (phase: "dead" | "victory") => void;
  set: (p: Partial<GameState>) => void;
  addKillfeed: (text: string) => void;
  resetAmmo: () => void;
}

let feedId = 1;

export const useGameStore = create<GameState>((set) => ({
  phase: "menu",
  health: 100,
  maxHealth: 100,
  kills: 0,
  score: 0,
  wave: 0,
  enemiesLeft: 0,
  pendingWave: 0,
  ammo: fullAmmo(),
  activeWeapon: "ar",
  reloading: false,
  ads: false,
  sprinting: false,
  sliding: false,
  hitmarker: 0,
  hitmarkerKill: false,
  killfeed: [],
  damageFlash: 0,
  timeSurvived: 0,
  combo: 0,
  lastKillAt: 0,
  shots: 0,
  hits: 0,
  headshots: 0,
  lastHitDmg: 0,
  lastHitAt: 0,
  bestScore: typeof window !== "undefined" ? loadBest() : 0,
  newBest: false,
  bossHealth: 0,
  bossMax: 0,
  damageMult: 1,
  moveMult: 1,
  reloadMult: 1,
  regenMult: 1,
  perkChoices: [],
  perksOwned: [],
  startGame: () =>
    set({
      phase: "playing",
      health: 100,
      maxHealth: 100,
      kills: 0,
      score: 0,
      wave: 0,
      enemiesLeft: 0,
      pendingWave: 0,
      killfeed: [],
      timeSurvived: 0,
      activeWeapon: "ar",
      reloading: false,
      combo: 0,
      lastKillAt: 0,
      shots: 0,
      hits: 0,
      headshots: 0,
      lastHitDmg: 0,
      newBest: false,
      bossHealth: 0,
      bossMax: 0,
      damageMult: 1,
      moveMult: 1,
      reloadMult: 1,
      regenMult: 1,
      perkChoices: [],
      perksOwned: [],
      ammo: fullAmmo(),
    }),
  finish: (phase) =>
    set((s) => {
      const best = Math.max(s.bestScore, s.score);
      try {
        localStorage.setItem("strikezone-best", String(best));
      } catch {
        /* storage unavailable */
      }
      return { phase, bestScore: best, newBest: s.score > s.bestScore && s.score > 0, bossHealth: 0 };
    }),
  set: (p) => set(p),
  addKillfeed: (text) =>
    set((s) => ({
      killfeed: [{ id: feedId++, text }, ...s.killfeed].slice(0, 5),
    })),
  resetAmmo: () => set({ ammo: fullAmmo() }),
}));
