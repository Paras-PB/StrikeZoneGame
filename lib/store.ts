import { create } from "zustand";

export type WeaponId = "ar" | "smg" | "sg" | "sn";
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
  sn: {
    id: "sn",
    name: "L96 WHISPER",
    damage: 150,
    headMult: 2.0,
    rpm: 42,
    mag: 5,
    reserve: 30,
    reloadTime: 2.8,
    spreadHip: 0.06,
    spreadAds: 0.0005,
    auto: true,
    range: 240,
  },
};

const fullAmmo = (): Record<WeaponId, { mag: number; reserve: number }> => ({
  ar: { mag: WEAPONS.ar.mag, reserve: WEAPONS.ar.reserve },
  smg: { mag: WEAPONS.smg.mag, reserve: WEAPONS.smg.reserve },
  sg: { mag: WEAPONS.sg.mag, reserve: WEAPONS.sg.reserve },
  sn: { mag: WEAPONS.sn.mag, reserve: WEAPONS.sn.reserve },
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

// ---- XP & ranks (persistent) ----
export const RANKS: { xp: number; name: string }[] = [
  { xp: 0, name: "RECRUIT" },
  { xp: 200, name: "CORPORAL" },
  { xp: 500, name: "SERGEANT" },
  { xp: 1000, name: "LIEUTENANT" },
  { xp: 1800, name: "CAPTAIN" },
  { xp: 3000, name: "MAJOR" },
  { xp: 5000, name: "COLONEL" },
  { xp: 8000, name: "COMMANDER" },
];

export function rankFor(xp: number): { current: string; next: string | null; nextXp: number | null; progress: number } {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].xp) idx = i;
  const cur = RANKS[idx];
  const nxt = RANKS[idx + 1] ?? null;
  const progress = nxt ? (xp - cur.xp) / (nxt.xp - cur.xp) : 1;
  return { current: cur.name, next: nxt?.name ?? null, nextXp: nxt?.xp ?? null, progress: Math.min(1, Math.max(0, progress)) };
}

// ---- achievements (persistent) ----
export type AchId = "firstblood" | "demolitionist" | "sharpshooter" | "untouchable" | "nightowl" | "bossslayer" | "rampage" | "survivor";

export const ACH_DEFS: Record<AchId, { name: string; icon: string; desc: string }> = {
  firstblood: { name: "FIRST BLOOD", icon: "🩸", desc: "Get your first elimination." },
  demolitionist: { name: "DEMOLITIONIST", icon: "💣", desc: "5 barrel kills in a single run." },
  sharpshooter: { name: "SHARPSHOOTER", icon: "🎯", desc: "10 headshot kills in a single run." },
  untouchable: { name: "UNTOUCHABLE", icon: "🛡️", desc: "Clear a wave without taking damage." },
  nightowl: { name: "NIGHT OWL", icon: "🦉", desc: "Clear a night wave." },
  bossslayer: { name: "BOSS SLAYER", icon: "☠️", desc: "Kill the Juggernaut." },
  rampage: { name: "RAMPAGE", icon: "🔥", desc: "Reach a ×5 combo chain." },
  survivor: { name: "SURVIVOR", icon: "🪖", desc: "Reach wave 7." },
};

function loadNum(key: string): number {
  try {
    return Number(localStorage.getItem(key) || 0) || 0;
  } catch {
    return 0;
  }
}
function loadAch(): string[] {
  try {
    const raw = localStorage.getItem("strikezone-achievements");
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
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
  // combo & stats
  combo: number;
  lastKillAt: number;
  shots: number;
  hits: number;
  headshots: number;
  lastHitDmg: number;
  lastHitAt: number;
  bestScore: number;
  newBest: boolean;
  // boss
  bossHealth: number;
  bossMax: number;
  bossEnraged: boolean;
  // perk multipliers
  damageMult: number;
  moveMult: number;
  reloadMult: number;
  regenMult: number;
  perkChoices: PerkId[];
  perksOwned: string[];
  // V3: grenades & overdrive
  grenades: number;
  overdriveUntil: number;
  // V3: objective waves
  objective: "elim" | "defend";
  objectiveTimeLeft: number;
  zoneX: number;
  zoneZ: number;
  playerInZone: boolean;
  // V3: endless
  endless: boolean;
  bestEndlessWave: number;
  // V3: meta
  xp: number;
  lastRunXp: number;
  achievements: string[];
  achToast: { id: string; name: string; icon: string; at: number } | null;
  barrelKills: number;
  tookDamageThisWave: boolean;
  startGame: () => void;
  finish: (phase: "dead" | "victory") => void;
  unlockAch: (id: AchId) => void;
  set: (p: Partial<GameState>) => void;
  addKillfeed: (text: string) => void;
  resetAmmo: () => void;
}

let feedId = 1;

export const useGameStore = create<GameState>((set, get) => ({
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
  bestScore: typeof window !== "undefined" ? loadNum("strikezone-best") : 0,
  newBest: false,
  bossHealth: 0,
  bossMax: 0,
  bossEnraged: false,
  damageMult: 1,
  moveMult: 1,
  reloadMult: 1,
  regenMult: 1,
  perkChoices: [],
  perksOwned: [],
  grenades: 3,
  overdriveUntil: 0,
  objective: "elim",
  objectiveTimeLeft: 0,
  zoneX: 0,
  zoneZ: 10,
  playerInZone: false,
  endless: false,
  bestEndlessWave: typeof window !== "undefined" ? loadNum("strikezone-best-endless") : 0,
  xp: typeof window !== "undefined" ? loadNum("strikezone-xp") : 0,
  lastRunXp: 0,
  achievements: typeof window !== "undefined" ? loadAch() : [],
  achToast: null,
  barrelKills: 0,
  tookDamageThisWave: false,
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
      bossEnraged: false,
      damageMult: 1,
      moveMult: 1,
      reloadMult: 1,
      regenMult: 1,
      perkChoices: [],
      perksOwned: [],
      grenades: 3,
      overdriveUntil: 0,
      objective: "elim",
      objectiveTimeLeft: 0,
      playerInZone: false,
      endless: false,
      lastRunXp: 0,
      barrelKills: 0,
      tookDamageThisWave: false,
      ammo: fullAmmo(),
    }),
  finish: (phase) =>
    set((s) => {
      const best = Math.max(s.bestScore, s.score);
      save("strikezone-best", String(best));
      let bestEndless = s.bestEndlessWave;
      if (s.endless && s.wave > bestEndless) {
        bestEndless = s.wave;
        save("strikezone-best-endless", String(bestEndless));
      }
      const xpGain =
        s.kills * 10 +
        s.headshots * 5 +
        Math.floor(s.score / 50) +
        s.wave * 25 +
        (phase === "victory" ? 150 : 0);
      const xp = s.xp + xpGain;
      save("strikezone-xp", String(xp));
      return {
        phase,
        bestScore: best,
        newBest: s.score > s.bestScore && s.score > 0,
        bossHealth: 0,
        bossEnraged: false,
        bestEndlessWave: bestEndless,
        xp,
        lastRunXp: xpGain,
      };
    }),
  unlockAch: (id) => {
    const s = get();
    if (s.achievements.includes(id)) return;
    const achievements = [...s.achievements, id];
    save("strikezone-achievements", JSON.stringify(achievements));
    const d = ACH_DEFS[id];
    set({ achievements, achToast: { id, name: d.name, icon: d.icon, at: Date.now() } });
  },
  set: (p) => set(p),
  addKillfeed: (text) =>
    set((s) => ({
      killfeed: [{ id: feedId++, text }, ...s.killfeed].slice(0, 5),
    })),
  resetAmmo: () => set({ ammo: fullAmmo() }),
}));
