/**
 * Character class definitions.
 * Stats, attack styles, and special abilities for all classes.
 */
export const ClassData = {
    warrior: {
        name: 'Warrior',
        hp: 120,
        mana: 100,
        speed: 'medium', // maps to GameConfig speed values
        attack: 18,
        attackSpeed: 1.2, // attacks per second
        defense: 8,
        dodgeDistance: 'medium',

        // Attack style
        attackStyle: {
            type: 'melee',
            range: 48, // pixels from player center
            arc: 90, // degrees, wide arc
            knockback: 1.0 // multiplier
        },

        // Special ability
        special: {
            name: 'Shield Bash',
            cooldown: 8000, // ms
            manaCost: 15,
            stunDuration: 1000, // ms
            range: 40,
            arc: 120,
            damage: 12
        },

        // Visual
        color: 0xcc4444, // red tint for placeholder
        size: 14 // sprite half-size for placeholder
    },

    wizard: {
        name: 'Wizard',
        hp: 70,
        mana: 100,
        speed: 'slow',
        attack: 22,
        attackSpeed: 0.8,
        defense: 2,
        dodgeDistance: 'long',

        attackStyle: {
            type: 'projectile',
            range: 300,
            speed: 250,
            pierces: true,
            knockback: 0.5
        },

        special: {
            name: 'Teleport Blink',
            cooldown: 6000,
            manaCost: 25,
            distance: 128
        },

        color: 0x4444cc,
        size: 12
    },

    archer: {
        name: 'Archer',
        hp: 85,
        mana: 100,
        speed: 'fast',
        attack: 14,
        attackSpeed: 1.8,
        defense: 4,
        dodgeDistance: 'long',

        attackStyle: {
            type: 'projectile',
            range: 280,
            speed: 350,
            pierces: false,
            knockback: 0.3
        },

        special: {
            name: 'Place Trap',
            cooldown: 12000,
            manaCost: 20
        },

        color: 0x44cc44,
        size: 12
    },

    valkyrie: {
        name: 'Valkyrie',
        hp: 100,
        mana: 100,
        speed: 'medium',
        attack: 16,
        attackSpeed: 1.0,
        defense: 6,
        dodgeDistance: 'medium',

        attackStyle: {
            type: 'melee',
            range: 56,       // slightly longer than warrior
            arc: 40,         // narrow thrust line
            knockback: 0.7
        },

        special: {
            name: 'Shield Throw',
            cooldown: 10000,
            manaCost: 20,
            damage: 14,
            range: 200,      // max throw distance
            speed: 280,
            stunDuration: 1500,
            bounceTargets: 1 // bounces to 1 extra enemy
        },

        color: 0xddaa22,    // golden
        size: 13
    },

    necromancer: {
        name: 'Necromancer',
        hp: 80,
        mana: 100,
        speed: 'slow',
        attack: 12,
        attackSpeed: 0.7,
        defense: 3,
        dodgeDistance: 'short',

        attackStyle: {
            type: 'cone',        // dark-wave cone spread
            range: 100,
            arc: 60,             // cone angle
            knockback: 0.4,
            damage: 12
        },

        special: {
            name: 'Raise Skeleton',
            cooldown: 10000,
            manaCost: 30,
            skeletonDuration: 30000, // 30 seconds
            maxSkeletons: 2
        },

        color: 0x8844aa,    // purple
        size: 12
    }
};
