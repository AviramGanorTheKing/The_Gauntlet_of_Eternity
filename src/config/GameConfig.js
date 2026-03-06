/**
 * Game-wide constants and balance numbers.
 * All tunable values live here — never hardcode in logic.
 */
export const GameConfig = {
    // Display
    TILE_SIZE: 32,
    CAMERA_ZOOM: 1.5,

    // Player defaults
    PLAYER_SPEED_SLOW: 120,
    PLAYER_SPEED_MEDIUM: 150,
    PLAYER_SPEED_FAST: 180,

    // Dodge
    DODGE_DISTANCE: 96,   // ~3 tiles
    DODGE_DURATION: 250,   // ms
    DODGE_COOLDOWN: 1500,   // ms
    DODGE_IFRAME_RATIO: 0.6,

    // Combat
    KNOCKBACK_FORCE: 200,
    KNOCKBACK_DURATION: 150,  // ms
    DAMAGE_NUMBER_DURATION: 800,  // ms
    WHITE_FLASH_DURATION: 100,  // ms
    ATTACK_COOLDOWN_BASE: 1000,  // ms ÷ attack speed

    // Mana
    MANA_MAX: 100,
    MANA_REGEN_PER_SECOND: 2,

    // Potions — per GDD biome scarcity
    HEALTH_POTION_HEAL_PERCENT: 0.30,
    MANA_POTION_RESTORE: 30,

    // Max carry limits — GDD section 3 (Crypt default)
    MAX_HP_POTIONS: 6,
    MAX_MP_POTIONS: 4,

    // Enemy spawning
    MAX_ENEMIES_PER_ROOM: 50,
    SWARMER_SPAWN_INTERVAL: 3000, // ms

    // ── Phase 3 additions ────────────────────────────────────────────────
    // Loot drop rates
    LOOT_GOLD_CHANCE: 0.70,   // chance per enemy death
    LOOT_GOLD_MIN: 8,
    LOOT_GOLD_MAX: 30,
    LOOT_GEAR_CHANCE: 0.18,   // chance per enemy death
    LOOT_POTION_RATES: {
        crypt: 0.18,   // fairly common
        caves: 0.14,
        fortress: 0.10,
        inferno: 0.07,
        abyss: 0.04,
        default: 0.15,
    },

    // Shrine
    SHRINE_INTERACT_RANGE: 80,   // px, square zone side

    // Trap counts per floor
    TRAPS_PER_FLOOR: [2, 5],    // min, max
    SHRINES_PER_FLOOR: [1, 2],  // min, max

    // Weapon progression
    WEAPON_XP_PER_KILL: 10,
    WEAPON_XP_PER_KILL_ELITE: 25,
    WEAPON_XP_PER_KILL_BOSS: 100,
    WEAPON_SWAP_COOLDOWN: 300,  // ms

    // Test room
    TEST_ROOM_WIDTH: 20,
    TEST_ROOM_HEIGHT: 15,
};
