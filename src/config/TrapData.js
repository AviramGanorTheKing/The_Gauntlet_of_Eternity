/**
 * TrapData — trap definitions per biome.
 * Each trap entry describes its behaviour, timing, and damage.
 */
export const TrapData = {
    // ── Universal traps ───────────────────────────────────────────────────
    spike_tile: {
        id: 'spike_tile',
        label: 'Spike Tile',
        damagePercent: 0.15,   // % of max HP
        cycleTime: 1500,       // ms for full extend+retract cycle
        activeTime: 600,       // ms spikes are extended (dangerous window)
        color: 0x888888,
        activeColor: 0xcc2222,
        knockback: 0.5,
        affectsEnemies: true,
        dodgeable: true,
    },

    pressure_plate: {
        id: 'pressure_plate',
        label: 'Pressure Plate',
        damagePercent: 0.10,
        projectileSpeed: 200,
        projectileCount: 4,    // darts fired in 4 directions
        color: 0x885500,
        affectsEnemies: true,
        dodgeable: true,
        resetTime: 5000,       // ms before plate resets
    },

    pit_trap: {
        id: 'pit_trap',
        label: 'Pit',
        damagePercent: 0.20,
        fallDuration: 600,     // ms of fall animation
        color: 0x111111,
        affectsEnemies: false, // enemies don't fall
        dodgeable: true,
    },

    // ── Crypt-specific traps ──────────────────────────────────────────────
    coffin_burst: {
        id: 'coffin_burst',
        label: 'Coffin',
        damagePercent: 0,       // spawns a swarmer instead of direct damage
        spawnEnemy: 'swarmer',
        triggerRadius: 64,
        color: 0x553333,
        affectsEnemies: false,
        dodgeable: false,
    },

    cursed_tile: {
        id: 'cursed_tile',
        label: 'Cursed Tile',
        damagePercent: 0,
        appliesStatus: 'curse',
        color: 0x553366,
        affectsEnemies: false,
        dodgeable: true,
    },
};

/**
 * Traps usable in each biome (by key list).
 */
export const BiomeTrapSets = {
    crypt: ['spike_tile', 'pressure_plate', 'pit_trap', 'coffin_burst', 'cursed_tile'],
    caves: ['spike_tile', 'pressure_plate', 'pit_trap'],
    fortress: ['spike_tile', 'pressure_plate'],
    inferno: ['spike_tile', 'pit_trap'],
    abyss: ['spike_tile', 'pressure_plate', 'pit_trap'],
};
