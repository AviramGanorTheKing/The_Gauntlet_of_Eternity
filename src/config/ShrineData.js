/**
 * ShrineData — definitions for all shrine types.
 * Shrines are risk/reward interaction points in the dungeon.
 */
export const ShrineData = {
    power: {
        id: 'power',
        label: 'Shrine of Power',
        description: '+20% Attack / −10 Max HP',
        color: 0xff6600,
        icon: '⚔',
        effect(player) {
            player.attackPower = Math.round(player.attackPower * 1.20);
            player.maxHp = Math.max(10, player.maxHp - 10);
            player.hp = Math.min(player.hp, player.maxHp);
        },
    },

    fate: {
        id: 'fate',
        label: 'Shrine of Fate',
        description: 'Random blessing or curse…',
        color: 0xaa44ff,
        icon: '🎲',
        effect(player, scene) {
            const positive = Math.random() > 0.5;
            if (positive) {
                // Positive: full heal
                player.hp = player.maxHp;
                player.mana = player.maxMana;
            } else {
                // Negative: lose 25% HP
                const loss = Math.floor(player.maxHp * 0.25);
                player.hp = Math.max(1, player.hp - loss);
            }
            return positive;
        },
    },

    sacrifice: {
        id: 'sacrifice',
        label: 'Shrine of Sacrifice',
        description: 'Pay 30% HP → Rare loot guaranteed',
        color: 0xcc2222,
        icon: '💀',
        cost: 0.30,             // % of max HP
        effect(player, scene) {
            const cost = Math.floor(player.maxHp * 0.30);
            if (player.hp <= cost) return false; // can't afford
            player.hp -= cost;
            // LootSystem will handle spawning the rare item
            return true;
        },
    },

    forgotten: {
        id: 'forgotten',
        label: 'Shrine of the Forgotten',
        description: 'Reveal full map + spawn 1 Elite',
        color: 0x4488ff,
        icon: '👁',
        effect(player, scene) {
            // Reveal entire fog — done in ShrineSystem
            // Spawn elite — done in ShrineSystem
        },
    },
};
