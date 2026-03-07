/**
 * Enemy type definitions.
 * Stats and behavior config for all enemy archetypes.
 */
export const EnemyData = {
    swarmer: {
        name: 'Swarmer',
        hp: 8,
        speed: 100,
        damage: 5,
        defense: 0,
        attackCooldown: 800, // ms between contact damage ticks
        aggroRange: 300, // pixels
        color: 0x88cc88, // greenish for placeholder
        size: 10,
        scoreValue: 10,
        knockbackResistance: 0 // 0 = full knockback, 1 = immune
    },

    bruiser: {
        name: 'Bruiser',
        hp: 40,
        speed: 50,
        damage: 12,
        defense: 4,
        attackCooldown: 1500,
        aggroRange: 200,
        chargeSpeed: 200,
        chargeRange: 150,
        color: 0xcc8844,
        size: 16,
        scoreValue: 25,
        knockbackResistance: 0.5
    },

    ranged: {
        name: 'Ranged',
        hp: 12,
        speed: 70,
        damage: 8,
        defense: 1,
        attackCooldown: 2000,
        aggroRange: 250,
        preferredDistance: 180,
        projectileSpeed: 200,
        color: 0xcc44cc,
        size: 11,
        scoreValue: 20,
        knockbackResistance: 0
    },

    bomber: {
        name: 'Bomber',
        hp: 5,
        speed: 130,
        damage: 20,
        defense: 0,
        explosionRadius: 48,
        fuseTime: 500, // ms after reaching target
        color: 0xcccc44,
        size: 9,
        scoreValue: 15,
        knockbackResistance: 0
    }
};
