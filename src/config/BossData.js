/**
 * Boss configuration data.
 * Each boss has 3 phases with HP thresholds, attack patterns, and summon rules.
 */
export const BossData = {
    boneSovereign: {
        name: 'The Bone Sovereign',
        title: 'Lord of the Restless Dead',
        biome: 'crypt',
        bossFloor: 5,
        hp: 800,
        defense: 4,
        color: 0xddddbb,
        size: 24,
        speed: 60,
        arenaSize: { w: 16, h: 12 }, // tiles

        phases: [
            {
                name: 'Phase 1',
                hpThreshold: 0.6, // transitions when HP drops below 60%
                attacks: [
                    { type: 'slam', damage: 20, range: 64, arc: 120, cooldown: 2500, telegraph: 800 },
                    { type: 'summon', enemy: 'swarmer', count: 3, cooldown: 8000 }
                ]
            },
            {
                name: 'Phase 2',
                hpThreshold: 0.3,
                attacks: [
                    { type: 'slam', damage: 25, range: 64, arc: 120, cooldown: 2000, telegraph: 600 },
                    { type: 'projectile', damage: 18, speed: 180, cooldown: 3000 },
                    { type: 'summon', enemy: 'swarmer', count: 5, cooldown: 7000 }
                ]
            },
            {
                name: 'Phase 3',
                hpThreshold: 0,
                attacks: [
                    { type: 'slam', damage: 30, range: 72, arc: 140, cooldown: 1500, telegraph: 500 },
                    { type: 'homing', damage: 22, speed: 130, cooldown: 4000, duration: 3000 },
                    { type: 'summon', enemy: 'swarmer', count: 4, cooldown: 5000 }
                ]
            }
        ],
        reward: {
            gear: 'uncommon',
            shards: 150,
            heal: { hp: true, mana: true }
        }
    },

    sporemind: {
        name: 'The Sporemind',
        title: 'Keeper of the Fungal Depths',
        biome: 'fungalCaves',
        bossFloor: 10,
        hp: 1200,
        defense: 5,
        color: 0x66aa44,
        size: 28,
        speed: 0,  // stationary
        arenaSize: { w: 18, h: 14 },

        phases: [
            {
                name: 'Phase 1',
                hpThreshold: 0.6,
                attacks: [
                    { type: 'aoe_zone', damage: 3, radius: 80, count: 3, cooldown: 4000, duration: 3000 },
                    { type: 'tendril', damage: 15, range: 120, cooldown: 2500, telegraph: 600 }
                ]
            },
            {
                name: 'Phase 2',
                hpThreshold: 0.3,
                attacks: [
                    { type: 'aoe_zone', damage: 4, radius: 90, count: 4, cooldown: 3500, duration: 3000 },
                    { type: 'tendril', damage: 18, range: 140, cooldown: 2000, telegraph: 500 },
                    { type: 'summon', enemy: 'swarmer', count: 4, cooldown: 6000 }
                ]
            },
            {
                name: 'Phase 3',
                hpThreshold: 0,
                attacks: [
                    { type: 'tendril', damage: 22, range: 160, cooldown: 1500, telegraph: 400 },
                    { type: 'aoe_zone', damage: 5, radius: 100, count: 5, cooldown: 3000, duration: 2500 },
                    { type: 'pulse', damage: 12, radius: 200, cooldown: 5000 }
                ]
            }
        ],
        reward: {
            gear: 'rare',
            shards: 250,
            heal: { hp: true, mana: true, potions: 2 }
        }
    },

    ironWarden: {
        name: 'The Iron Warden',
        title: 'Eternal Guardian of the Fortress',
        biome: 'ironFortress',
        bossFloor: 15,
        hp: 1600,
        defense: 8,
        color: 0x8888aa,
        size: 26,
        speed: 80,
        arenaSize: { w: 20, h: 14 },

        phases: [
            {
                name: 'Phase 1 – Sword & Shield',
                hpThreshold: 0.6,
                attacks: [
                    { type: 'charge', damage: 25, speed: 200, cooldown: 4000, telegraph: 1000 },
                    { type: 'slam', damage: 20, range: 60, arc: 90, cooldown: 2500, telegraph: 700 }
                ]
            },
            {
                name: 'Phase 2 – Dual Axes',
                hpThreshold: 0.3,
                attacks: [
                    { type: 'spin', damage: 18, radius: 56, duration: 1500, cooldown: 4000 },
                    { type: 'projectile', damage: 22, speed: 200, cooldown: 3000 },
                    { type: 'slam', damage: 24, range: 64, arc: 110, cooldown: 2000, telegraph: 600 }
                ]
            },
            {
                name: 'Phase 3 – Cannon Arm',
                hpThreshold: 0,
                attacks: [
                    { type: 'barrage', damage: 15, count: 5, speed: 180, spread: 40, cooldown: 3500 },
                    { type: 'slam', damage: 28, range: 72, arc: 120, cooldown: 2000, telegraph: 500 },
                    { type: 'charge', damage: 30, speed: 240, cooldown: 3500, telegraph: 800 }
                ]
            }
        ],
        reward: {
            gear: 'rare',
            shards: 400,
            heal: { hp: true, mana: true, potions: 3 }
        }
    },

    emberTyrant: {
        name: 'The Ember Tyrant',
        title: 'Wrathful Flame of the Abyss',
        biome: 'inferno',
        bossFloor: 20,
        hp: 2000,
        defense: 6,
        color: 0xff4422,
        size: 26,
        speed: 100,
        arenaSize: { w: 20, h: 16 },

        phases: [
            {
                name: 'Phase 1',
                hpThreshold: 0.6,
                attacks: [
                    { type: 'combo', damage: 22, hits: 3, range: 56, arc: 90, cooldown: 3000 },
                    { type: 'cone_breath', damage: 5, range: 120, arc: 60, duration: 1500, cooldown: 5000 }
                ]
            },
            {
                name: 'Phase 2',
                hpThreshold: 0.3,
                attacks: [
                    { type: 'teleport_slash', damage: 28, cooldown: 3000 },
                    { type: 'barrage', damage: 12, count: 8, speed: 150, spread: 360, cooldown: 4000 },
                    { type: 'combo', damage: 26, hits: 3, range: 60, arc: 100, cooldown: 2500 }
                ]
            },
            {
                name: 'Phase 3',
                hpThreshold: 0,
                attacks: [
                    { type: 'teleport_slash', damage: 32, cooldown: 2500 },
                    { type: 'barrage', damage: 14, count: 10, speed: 160, spread: 360, cooldown: 3500 },
                    { type: 'summon', enemy: 'bomber', count: 2, cooldown: 8000 }
                ]
            }
        ],
        reward: {
            gear: 'epic',
            shards: 600,
            heal: { hp: true, mana: true, potions: 5 }
        }
    },

    voidArchitect: {
        name: 'The Void Architect',
        title: 'Architect of Eternal Darkness',
        biome: 'abyss',
        bossFloor: 25,
        hp: 2500,
        defense: 7,
        color: 0xaa44ff,
        size: 28,
        speed: 70,
        arenaSize: { w: 22, h: 16 },

        phases: [
            {
                name: 'Phase 1',
                hpThreshold: 0.6,
                attacks: [
                    { type: 'beam', damage: 8, duration: 2000, rotationSpeed: 0.8, cooldown: 5000 },
                    { type: 'summon', enemy: 'ranged', count: 3, cooldown: 8000 }
                ]
            },
            {
                name: 'Phase 2',
                hpThreshold: 0.3,
                attacks: [
                    { type: 'beam', damage: 10, duration: 2500, rotationSpeed: 1.0, cooldown: 4000 },
                    { type: 'gravity_well', damage: 5, radius: 100, pullForce: 80, cooldown: 6000, duration: 3000 },
                    { type: 'summon', enemy: 'ranged', count: 4, cooldown: 7000 }
                ]
            },
            {
                name: 'Phase 3',
                hpThreshold: 0,
                attacks: [
                    { type: 'beam', damage: 12, duration: 3000, rotationSpeed: 1.2, cooldown: 3500 },
                    { type: 'gravity_well', damage: 6, radius: 120, pullForce: 100, cooldown: 5000, duration: 3000 },
                    { type: 'barrage', damage: 16, count: 12, speed: 140, spread: 360, cooldown: 4000 },
                    { type: 'summon', enemy: 'bruiser', count: 1, cooldown: 10000 }
                ]
            }
        ],
        reward: {
            gear: 'legendary',
            shards: 1000
        }
    }
};

/**
 * Get boss data for a specific floor.
 * @returns {object|null} boss config or null if no boss on this floor
 */
export function getBossForFloor(floor) {
    for (const [key, boss] of Object.entries(BossData)) {
        if (boss.bossFloor === floor) {
            return { key, ...boss };
        }
    }
    return null;
}
