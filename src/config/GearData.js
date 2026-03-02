/**
 * GearData — all equipment definitions.
 * Weapon types per class, armor types, accessories, rarity tiers, and property pools.
 * Rarity: common(0), uncommon(1), rare(2), epic(3), legendary(4)
 */

// ── Rarity config ──────────────────────────────────────────────────────────
export const RARITY = {
    COMMON: 0,
    UNCOMMON: 1,
    RARE: 2,
    EPIC: 3,
    LEGENDARY: 4
};

export const RARITY_NAMES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
export const RARITY_COLORS = [0xaaaaaa, 0x44cc44, 0x4488ff, 0xaa44ff, 0xffcc00];

// Drop weights (must sum to 100)
export const RARITY_WEIGHTS = [60, 25, 10, 4, 1];

// Stat multipliers per rarity
export const RARITY_BONUS = [0, 0.20, 0.40, 0.67, 1.00];

// ── Property pools ──────────────────────────────────────────────────────────
export const MINOR_PROPERTIES = [
    { id: 'speed_bonus', label: '+10% Move Speed', effect: { stat: 'moveSpeed', mult: 1.10 } },
    { id: 'hp_bonus', label: '+10 Max HP', effect: { stat: 'maxHp', flat: 10 } },
    { id: 'slight_knockback', label: 'Extra Knockback', effect: { stat: 'knockbackMult', mult: 1.25 } },
    { id: 'poison_resist', label: 'Poison Resist', effect: { stat: 'poisonResist', flat: 1 } },
    { id: 'mana_regen', label: '+1 Mana/s', effect: { stat: 'manaRegen', flat: 1 } },
];

export const MAJOR_PROPERTIES = [
    { id: 'burn_on_hit', label: 'Burns on Hit', effect: { onHit: 'burn' } },
    { id: 'lifesteal', label: 'Life Steal 5%', effect: { onHit: 'lifesteal', value: 0.05 } },
    { id: 'crit_chance', label: '+20% Crit Chance', effect: { stat: 'critChance', flat: 0.20 } },
    { id: 'aoe_on_hit', label: 'AoE Shockwave', effect: { onHit: 'aoe', radius: 48 } },
    { id: 'mana_on_kill', label: 'Mana on Kill (+5)', effect: { onKill: 'mana', value: 5 } },
];

// ── Weapon tables per class ─────────────────────────────────────────────────
export const WEAPON_TABLES = {
    warrior: [
        { id: 'sword', name: 'Sword', attack: 18, type: 'melee', range: 48, arc: 90 },
        { id: 'axe', name: 'Axe', attack: 24, type: 'melee', range: 44, arc: 60 },
        { id: 'mace', name: 'Mace', attack: 20, type: 'melee', range: 44, arc: 80, stunChance: 0.20 },
    ],
    wizard: [
        { id: 'staff', name: 'Staff', attack: 22, type: 'projectile', range: 300, speed: 250, pierces: true },
        { id: 'tome', name: 'Tome', attack: 18, type: 'projectile', range: 260, speed: 220, multiShot: 3 },
        { id: 'orb', name: 'Orb', attack: 20, type: 'projectile', range: 280, speed: 200, homing: true },
    ],
    archer: [
        { id: 'shortbow', name: 'Shortbow', attack: 14, type: 'projectile', range: 280, speed: 350, pierces: false },
        { id: 'longbow', name: 'Longbow', attack: 20, type: 'projectile', range: 340, speed: 320, pierces: true },
        { id: 'crossbow', name: 'Crossbow', attack: 28, type: 'projectile', range: 260, speed: 280, pierces: false },
    ],
    // Default fallback
    any: [
        { id: 'dagger', name: 'Dagger', attack: 12, type: 'melee', range: 40, arc: 60 },
    ]
};

// ── Armor table ─────────────────────────────────────────────────────────────
export const ARMOR_TABLE = [
    { id: 'leather', name: 'Leather Armor', defense: 3 },
    { id: 'chainmail', name: 'Chainmail', defense: 6 },
    { id: 'platemail', name: 'Plate Armor', defense: 9 },
    { id: 'robe', name: 'Mage Robe', defense: 1, manaRegen: 1 },
];

// ── Accessory table ─────────────────────────────────────────────────────────
export const ACCESSORY_TABLE = [
    { id: 'ring_hp', name: 'Ring of Vitality', maxHp: 15 },
    { id: 'ring_speed', name: 'Ring of Swiftness', speedMult: 1.10 },
    { id: 'ring_mana', name: 'Ring of Focus', manaRegen: 2 },
    { id: 'amulet_att', name: 'Battle Amulet', attackMult: 1.10 },
];

/**
 * Roll a random gear item of a given slot and rarity.
 * @param {'weapon'|'armor'|'accessory'} slot
 * @param {number} rarity - RARITY constant
 * @param {string} [classKey] - player class for class-specific weapons
 * @returns {object} gear item with rarity/slot attached
 */
export function rollGearItem(slot, rarity, classKey = 'warrior') {
    let table;
    if (slot === 'weapon') {
        table = WEAPON_TABLES[classKey] || WEAPON_TABLES.any;
    } else if (slot === 'armor') {
        table = ARMOR_TABLE;
    } else {
        table = ACCESSORY_TABLE;
    }

    const base = Phaser.Utils.Array.GetRandom(table);
    const bonusMult = 1 + RARITY_BONUS[rarity];

    const item = {
        ...base,
        slot,
        rarity,
        rarityName: RARITY_NAMES[rarity],
        rarityColor: RARITY_COLORS[rarity],
        // Scale attack/defense with rarity
        attack: base.attack ? Math.round(base.attack * bonusMult) : undefined,
        defense: base.defense ? Math.round(base.defense * bonusMult) : undefined,
        properties: [],
    };

    // Grant properties based on rarity
    if (rarity >= RARITY.UNCOMMON) {
        item.properties.push(Phaser.Utils.Array.GetRandom(MINOR_PROPERTIES));
    }
    if (rarity >= RARITY.RARE) {
        item.properties.push(Phaser.Utils.Array.GetRandom(MAJOR_PROPERTIES));
    }

    return item;
}

/**
 * Roll a random rarity based on drop weights.
 */
export function rollRarity() {
    const roll = Math.random() * 100;
    let cumulative = 0;
    for (let i = 0; i < RARITY_WEIGHTS.length; i++) {
        cumulative += RARITY_WEIGHTS[i];
        if (roll < cumulative) return i;
    }
    return RARITY.COMMON;
}
