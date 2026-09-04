import { create } from "zustand";

export type WeaponId = "ar" | "smg";
export type Phase = "menu" | "playing" | "dead" | "victory";

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
};

interface GameState {
  phase: Phase;
  health: number;
  maxHealth: number;
  kills: number;
  score: number;
  wave: number;
  enemiesLeft: number;
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
  startGame: () => void;
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
  ammo: {
    ar: { mag: 30, reserve: 180 },
    smg: { mag: 40, reserve: 240 },
  },
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
  startGame: () =>
    set({
      phase: "playing",
      health: 100,
      kills: 0,
      score: 0,
      wave: 0,
      enemiesLeft: 0,
      killfeed: [],
      timeSurvived: 0,
      activeWeapon: "ar",
      reloading: false,
      ammo: {
        ar: { mag: 30, reserve: 180 },
        smg: { mag: 40, reserve: 240 },
      },
    }),
  set: (p) => set(p),
  addKillfeed: (text) =>
    set((s) => ({
      killfeed: [{ id: feedId++, text }, ...s.killfeed].slice(0, 5),
    })),
  resetAmmo: () =>
    set({
      ammo: {
        ar: { mag: 30, reserve: 180 },
        smg: { mag: 40, reserve: 240 },
      },
    }),
}));
