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

// ── Default XP curve for all weapons ──────────────────────────────────────
const DEFAULT_XP_CURVE = [0, 50, 150, 350, 700];
const DEFAULT_MAX_LEVEL = 5;

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
        {
            id: 'sword', name: 'Sword', attack: 18,
            attackStyle: { type: 'melee', range: 48, arc: 90, knockback: 1.0 },
            maxLevel: DEFAULT_MAX_LEVEL, xpCurve: DEFAULT_XP_CURVE,
            perks: [
                { level: 2, id: 'sword_wide', name: 'Wide Sweep', desc: '+20 arc', effect: { arc: 20 } },
                { level: 4, id: 'sword_reach', name: 'Long Blade', desc: '+8 range', effect: { range: 8 } },
            ],
            levelBonuses: { attack: 2, knockback: 0.05 },
        },
        {
            id: 'throwing_axe', name: 'Throwing Axe', attack: 22,
            attackStyle: { type: 'projectile', range: 220, speed: 260, pierces: false, knockback: 0.8, multiShot: 1 },
            maxLevel: DEFAULT_MAX_LEVEL, xpCurve: DEFAULT_XP_CURVE,
            perks: [
                { level: 2, id: 'taxe_ricochet', name: 'Ricochet', desc: 'Pierces enemies', effect: { pierces: true } },
                { level: 4, id: 'taxe_heavy', name: 'Heavy Axe', desc: '+0.4 knockback', effect: { knockback: 0.4 } },
            ],
            levelBonuses: { attack: 3, speed: 10, multiShot: 1 },
        },
        {
            id: 'mace', name: 'Mace', attack: 20,
            attackStyle: { type: 'melee', range: 44, arc: 80, knockback: 1.3, stunChance: 0.20 },
            maxLevel: DEFAULT_MAX_LEVEL, xpCurve: DEFAULT_XP_CURVE,
            perks: [
                { level: 2, id: 'mace_stagger', name: 'Stagger', desc: '+10% stun', effect: { stunChance: 0.10 } },
                { level: 4, id: 'mace_shockwave', name: 'Shockwave', desc: 'AoE on stun', effect: { onStun: 'aoe', radius: 40 } },
            ],
            levelBonuses: { attack: 2, stunChance: 0.02 },
        },
    ],
    wizard: [
        {
            id: 'staff', name: 'Staff', attack: 22,
            attackStyle: { type: 'projectile', range: 300, speed: 250, pierces: true, knockback: 0.5 },
            maxLevel: DEFAULT_MAX_LEVEL, xpCurve: DEFAULT_XP_CURVE,
            perks: [
                { level: 2, id: 'staff_range', name: 'Far Reach', desc: '+40 range', effect: { range: 40 } },
                { level: 4, id: 'staff_burn', name: 'Ignite', desc: 'Burns on hit', effect: { onHit: 'burn' } },
            ],
            levelBonuses: { attack: 2, speed: 15 },
        },
        {
            id: 'tome', name: 'Tome', attack: 18,
            attackStyle: { type: 'projectile', range: 260, speed: 220, pierces: false, knockback: 0.3, multiShot: 3 },
            maxLevel: DEFAULT_MAX_LEVEL, xpCurve: DEFAULT_XP_CURVE,
            perks: [
                { level: 2, id: 'tome_spread', name: 'Fan Shot', desc: '+2 projectiles', effect: { multiShot: 2 } },
                { level: 4, id: 'tome_pierce', name: 'Pierce', desc: 'Projectiles pierce', effect: { pierces: true } },
            ],
            levelBonuses: { attack: 2 },
        },
        {
            id: 'orb', name: 'Orb', attack: 20,
            attackStyle: { type: 'projectile', range: 280, speed: 200, pierces: false, knockback: 0.3, homing: true },
            maxLevel: DEFAULT_MAX_LEVEL, xpCurve: DEFAULT_XP_CURVE,
            perks: [
                { level: 2, id: 'orb_speed', name: 'Swift Orb', desc: '+40 speed', effect: { speed: 40 } },
                { level: 4, id: 'orb_chain', name: 'Chain Hit', desc: 'Pierces enemies', effect: { pierces: true } },
            ],
            levelBonuses: { attack: 2, speed: 10 },
        },
    ],
    archer: [
        {
            id: 'shortbow', name: 'Shortbow', attack: 14,
            attackStyle: { type: 'projectile', range: 280, speed: 350, pierces: false, knockback: 0.3, multiShot: 1 },
            maxLevel: DEFAULT_MAX_LEVEL, xpCurve: DEFAULT_XP_CURVE,
            perks: [
                { level: 2, id: 'shortbow_rapid', name: 'Rapid Fire', desc: '+15% attack speed', effect: { attackSpeedMult: 1.15 } },
                { level: 4, id: 'shortbow_pierce', name: 'Piercing Arrow', desc: 'Arrows pierce', effect: { pierces: true } },
            ],
            levelBonuses: { attack: 2, speed: 15, multiShot: 1 },
        },
        {
            id: 'longbow', name: 'Longbow', attack: 20,
            attackStyle: { type: 'projectile', range: 340, speed: 320, pierces: true, knockback: 0.4, multiShot: 1 },
            maxLevel: DEFAULT_MAX_LEVEL, xpCurve: DEFAULT_XP_CURVE,
            perks: [
                { level: 2, id: 'longbow_range', name: 'Sniper', desc: '+50 range', effect: { range: 50 } },
                { level: 4, id: 'longbow_crit', name: 'Headshot', desc: '+15% crit', effect: { critChance: 0.15 } },
            ],
            levelBonuses: { attack: 3, multiShot: 1 },
        },
        {
            id: 'crossbow', name: 'Crossbow', attack: 28,
            attackStyle: { type: 'projectile', range: 260, speed: 280, pierces: false, knockback: 0.6, multiShot: 1 },
            maxLevel: DEFAULT_MAX_LEVEL, xpCurve: DEFAULT_XP_CURVE,
            perks: [
                { level: 2, id: 'crossbow_heavy', name: 'Heavy Bolt', desc: '+0.3 knockback', effect: { knockback: 0.3 } },
                { level: 4, id: 'crossbow_stun', name: 'Stun Bolt', desc: '15% stun', effect: { stunChance: 0.15 } },
            ],
            levelBonuses: { attack: 4, multiShot: 1 },
        },
    ],
    valkyrie: [
        {
            id: 'spear', name: 'Spear', attack: 16,
            attackStyle: { type: 'melee', range: 56, arc: 30, knockback: 0.7 },
            maxLevel: DEFAULT_MAX_LEVEL, xpCurve: DEFAULT_XP_CURVE,
            perks: [
                { level: 2, id: 'spear_thrust', name: 'Pierce Thrust', desc: '+12 range', effect: { range: 12 } },
                { level: 4, id: 'spear_impale', name: 'Impale', desc: '15% stun', effect: { stunChance: 0.15 } },
            ],
            levelBonuses: { attack: 2, range: 2 },
        },
        {
            id: 'halberd', name: 'Halberd', attack: 20,
            attackStyle: { type: 'melee', range: 52, arc: 50, knockback: 0.9 },
            maxLevel: DEFAULT_MAX_LEVEL, xpCurve: DEFAULT_XP_CURVE,
            perks: [
                { level: 2, id: 'halberd_cleave', name: 'Cleave', desc: '+15 arc', effect: { arc: 15 } },
                { level: 4, id: 'halberd_heavy', name: 'Heavy Blow', desc: '+0.3 knockback', effect: { knockback: 0.3 } },
            ],
            levelBonuses: { attack: 3 },
        },
        {
            id: 'lance', name: 'Lance', attack: 14,
            attackStyle: { type: 'melee', range: 64, arc: 20, knockback: 0.5 },
            maxLevel: DEFAULT_MAX_LEVEL, xpCurve: DEFAULT_XP_CURVE,
            perks: [
                { level: 2, id: 'lance_precision', name: 'Precision', desc: '+10% crit', effect: { critChance: 0.10 } },
                { level: 4, id: 'lance_lunge', name: 'Lunge', desc: '+20 range', effect: { range: 20 } },
            ],
            levelBonuses: { attack: 2, knockback: 0.03 },
        },
    ],
    necromancer: [
        {
            // NOTE: Cone weapons use attackStyle.damage (not top-level attack) for damage calc.
            // levelBonuses.damage scales the cone damage; top-level attack is unused for cones.
            id: 'scythe', name: 'Scythe', attack: 14,
            attackStyle: { type: 'cone', range: 100, arc: 60, knockback: 0.4, damage: 14 },
            maxLevel: DEFAULT_MAX_LEVEL, xpCurve: DEFAULT_XP_CURVE,
            perks: [
                { level: 2, id: 'scythe_reap', name: 'Reap', desc: '+15 arc', effect: { arc: 15 } },
                { level: 4, id: 'scythe_siphon', name: 'Soul Siphon', desc: '5% lifesteal', effect: { onHit: 'lifesteal', value: 0.05 } },
            ],
            levelBonuses: { damage: 2 },
        },
        {
            id: 'cursed_tome', name: 'Cursed Tome', attack: 12,
            attackStyle: { type: 'projectile', range: 240, speed: 200, pierces: true, knockback: 0.3 },
            maxLevel: DEFAULT_MAX_LEVEL, xpCurve: DEFAULT_XP_CURVE,
            perks: [
                { level: 2, id: 'ctome_decay', name: 'Decay', desc: 'Poisons on hit', effect: { onHit: 'poison' } },
                { level: 4, id: 'ctome_split', name: 'Soul Split', desc: '3-way shot', effect: { multiShot: 3 } },
            ],
            levelBonuses: { attack: 2 },
        },
        {
            id: 'bone_wand', name: 'Bone Wand', attack: 10,
            attackStyle: { type: 'projectile', range: 260, speed: 280, pierces: false, knockback: 0.2, homing: true },
            maxLevel: DEFAULT_MAX_LEVEL, xpCurve: DEFAULT_XP_CURVE,
            perks: [
                { level: 2, id: 'wand_lifetap', name: 'Life Tap', desc: '+3 mana on kill', effect: { onKill: 'mana', value: 3 } },
                { level: 4, id: 'wand_seeker', name: 'Bone Seeker', desc: 'Pierces enemies', effect: { pierces: true } },
            ],
            levelBonuses: { attack: 1, speed: 10 },
        },
    ],
    // Default fallback
    any: [
        {
            id: 'dagger', name: 'Dagger', attack: 12,
            attackStyle: { type: 'melee', range: 40, arc: 60, knockback: 0.5 },
            maxLevel: DEFAULT_MAX_LEVEL, xpCurve: DEFAULT_XP_CURVE,
            perks: [
                { level: 2, id: 'dagger_quick', name: 'Quick Stab', desc: '+10% attack speed', effect: { attackSpeedMult: 1.10 } },
                { level: 4, id: 'dagger_poison', name: 'Envenom', desc: 'Poisons on hit', effect: { onHit: 'poison' } },
            ],
            levelBonuses: { attack: 1 },
        },
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

    // Deep copy attackStyle so rarity doesn't mutate the base definition
    if (base.attackStyle) {
        item.attackStyle = { ...base.attackStyle };
    }

    // Weapon runtime state for XP system
    if (slot === 'weapon') {
        item.xp = 0;
        item.level = 1;
        item.unlockedPerks = [];
    }

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
