/**
 * StatusEffectData — definitions for all status effects.
 * Referenced by StatusEffects.js manager.
 */
export const StatusEffectData = {
    poison: {
        id: 'poison',
        label: 'Poison',
        duration: 5000,        // ms
        tickInterval: 500,     // ms between damage ticks
        tickDamage: 2,         // HP per tick (at 500ms = ~4 HP/s ≈ 3 HP/s from GDD)
        color: 0x44cc44,       // tint color
        icon: '☠',
        stackable: false,
        refreshable: true,     // re-applying resets timer
    },
    burn: {
        id: 'burn',
        label: 'Burn',
        duration: 4000,
        tickInterval: 400,
        tickDamage: 2,
        color: 0xff6600,
        icon: '🔥',
        stackable: false,
        refreshable: true,
        spreadRadius: 48,      // px — burns nearby enemies
    },
    freeze: {
        id: 'freeze',
        label: 'Freeze',
        duration: 2000,
        tickInterval: 0,       // no tick damage
        tickDamage: 0,
        color: 0x88ccff,
        icon: '❄',
        stackable: false,
        refreshable: false,
        speedMult: 0,          // full stop
        nextHitMult: 2.0,      // next hit does 2×
    },
    slow: {
        id: 'slow',
        label: 'Slow',
        duration: 3000,
        tickInterval: 0,
        tickDamage: 0,
        color: 0x6688cc,
        icon: '⏱',
        stackable: false,
        refreshable: true,
        speedMult: 0.60,       // 60% speed
    },
    stun: {
        id: 'stun',
        label: 'Stun',
        duration: 1500,
        tickInterval: 0,
        tickDamage: 0,
        color: 0xffcc00,
        icon: '★',
        stackable: false,
        refreshable: false,
        speedMult: 0,
    },
    curse: {
        id: 'curse',
        label: 'Curse',
        duration: 10000,
        tickInterval: 0,
        tickDamage: 0,
        color: 0xaa44cc,
        icon: '👁',
        stackable: false,
        refreshable: true,
        damageMult: 0.75,      // −25% damage dealt
    },
};
