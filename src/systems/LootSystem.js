import { Pickup } from '../entities/Pickup.js';
import { rollRarity, rollGearItem, RARITY_WEIGHTS, RARITY } from '../config/GearData.js';
import { EventBus, Events } from '../utils/EventBus.js';
import { GameConfig } from '../config/GameConfig.js';
import { FeatureFlags } from '../config/FeatureFlags.js';

/**
 * LootSystem — handles loot drops on enemy death and floor pickups.
 *
 * Drop rules (from GDD):
 *  - Every enemy has a chance to drop gold
 *  - Gear drops at fixed probability per enemy type
 *  - Potions drop by biome scarcity curve
 */
export class LootSystem {
    /**
     * @param {Phaser.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;

        /** [FEATURE: LOOT_PITY] Non-legendary gear drops since last legendary. Guaranteed at 50. */
        this._pityCounter = 0;

        // Listen for enemy death events
        EventBus.on(Events.ENEMY_DIED, this.onEnemyDied, this);
        EventBus.on(Events.PICKUP_COLLECTED, this.onPickupCollected, this);
    }

    /**
     * When an enemy dies, potentially drop loot.
     */
    onEnemyDied({ enemy, x, y }) {
        if (!enemy) return;

        const pickupGroup = this.scene.pickups;
        if (!pickupGroup) return;

        const biome = this.scene.dungeonManager?.getBiome();
        const classKey = this.scene.player?.classKey || 'warrior';

        // ── Gold drop ────────────────────────────────────────────────────
        if (Math.random() < GameConfig.LOOT_GOLD_CHANCE) {
            const amount = Phaser.Math.Between(
                GameConfig.LOOT_GOLD_MIN,
                GameConfig.LOOT_GOLD_MAX
            );
            const pickup = new Pickup(this.scene, x + Phaser.Math.Between(-12, 12), y + Phaser.Math.Between(-12, 12), 'gold', { amount });
            pickupGroup.add(pickup);
        }

        // ── Gear drop ────────────────────────────────────────────────────
        if (Math.random() < GameConfig.LOOT_GEAR_CHANCE) {
            let rarity = rollRarity();

            // [FEATURE: LOOT_PITY] Guarantee a legendary after 50 non-legendary drops
            if (FeatureFlags.LOOT_PITY) {
                if (this._pityCounter >= 50) {
                    rarity = RARITY.LEGENDARY;
                }
                if (rarity === RARITY.LEGENDARY) {
                    this._pityCounter = 0;
                } else {
                    this._pityCounter++;
                }
            }

            const slot = Phaser.Utils.Array.GetRandom(['weapon', 'armor', 'accessory']);
            const item = rollGearItem(slot, rarity, classKey);
            const pickup = new Pickup(this.scene, x + Phaser.Math.Between(-8, 8), y + Phaser.Math.Between(-8, 8), 'gear', item);
            pickupGroup.add(pickup);
        }

        // ── Potion drop (biome-scaled) ────────────────────────────────────
        const potionRate = biome
            ? (GameConfig.LOOT_POTION_RATES[biome.key] ?? GameConfig.LOOT_POTION_RATES.default)
            : GameConfig.LOOT_POTION_RATES.default;

        if (Math.random() < potionRate) {
            const type = Math.random() > 0.4 ? 'health_potion' : 'mana_potion';
            const pickup = new Pickup(this.scene, x + Phaser.Math.Between(-10, 10), y + Phaser.Math.Between(-10, 10), type, {});
            pickupGroup.add(pickup);
        }
    }

    /**
     * Apply the effect of a collected pickup to the player.
     */
    onPickupCollected({ player, type, data }) {
        if (!player) return;

        switch (type) {
            case 'gold':
                player.gold = (player.gold || 0) + data.amount;
                EventBus.emit(Events.GOLD_CHANGED, { gold: player.gold, amount: data.amount });
                break;

            case 'health_potion': {
                const maxPotions = GameConfig.MAX_HP_POTIONS;
                if (player.hpPotions < maxPotions) {
                    player.hpPotions++;
                    EventBus.emit(Events.POTION_PICKED_UP, { type: 'health', count: player.hpPotions });
                }
                break;
            }

            case 'mana_potion': {
                const maxPotions = GameConfig.MAX_MP_POTIONS;
                if (player.mpPotions < maxPotions) {
                    player.mpPotions++;
                    EventBus.emit(Events.POTION_PICKED_UP, { type: 'mana', count: player.mpPotions });
                }
                break;
            }

            case 'gear':
                this.tryEquipGear(player, data);
                break;
        }
    }

    /**
     * Auto-equip gear if it's better than what's currently equipped.
     */
    tryEquipGear(player, item) {
        if (item.slot === 'weapon') {
            this._tryEquipWeapon(player, item);
            return;
        }

        const slot = item.slot;
        const current = player.gear[slot];

        const isBetter = !current || item.rarity > current.rarity ||
            (item.attack && item.attack > (current.attack || 0)) ||
            (item.defense && item.defense > (current.defense || 0));

        if (isBetter) {
            // Remove old gear bonuses
            if (current) this.removeGearStats(player, current);

            player.gear[slot] = item;
            this.applyGearStats(player, item);

            EventBus.emit(Events.GEAR_EQUIPPED, { player, item, slot });
        }
    }

    /**
     * Dual-weapon equip logic: fill empty slot, then replace inactive if better.
     */
    _tryEquipWeapon(player, item) {
        // Fill empty slots first
        if (!player.weapons[0]) {
            player.weapons[0] = item;
            player.activeWeaponIndex = 0;
            player._recalcWeaponStats();
            EventBus.emit(Events.GEAR_EQUIPPED, { player, item, slot: 'weapon', weaponIndex: 0 });
            return;
        }
        if (!player.weapons[1]) {
            player.weapons[1] = item;
            EventBus.emit(Events.GEAR_EQUIPPED, { player, item, slot: 'weapon', weaponIndex: 1 });
            return;
        }

        // Both slots full — replace inactive weapon if new is better
        const inactiveIdx = player.activeWeaponIndex === 0 ? 1 : 0;
        const inactive = player.weapons[inactiveIdx];
        const isBetter = item.rarity > inactive.rarity ||
            (item.attack || 0) > (inactive.attack || 0);

        if (isBetter) {
            player.weapons[inactiveIdx] = item;
            EventBus.emit(Events.GEAR_EQUIPPED, { player, item, slot: 'weapon', weaponIndex: inactiveIdx });
        }
    }

    applyGearStats(player, item) {
        if (item.attack) player.attackPower += item.attack - (this._baseAttack(item) || 0);
        if (item.defense) player.defense += item.defense - (this._baseDefense(item) || 0);
        if (item.maxHp) { player.maxHp += item.maxHp; player.hp += item.maxHp; }
        if (item.manaRegen) player.bonusManaRegen = (player.bonusManaRegen || 0) + item.manaRegen;
        if (item.speedMult) player.moveSpeed = Math.round(player.moveSpeed * item.speedMult);

        // Properties
        for (const prop of item.properties || []) {
            const e = prop.effect;
            if (e.stat === 'moveSpeed' && e.mult) player.moveSpeed = Math.round(player.moveSpeed * e.mult);
            if (e.stat === 'maxHp' && e.flat) { player.maxHp += e.flat; player.hp += e.flat; }
            if (e.stat === 'critChance' && e.flat) player.critChance = (player.critChance || 0) + e.flat;
            if (e.stat === 'manaRegen' && e.flat) player.bonusManaRegen = (player.bonusManaRegen || 0) + e.flat;
        }
    }

    removeGearStats(player, item) {
        // Mirror of applyGearStats, reversed
        if (item.attack) player.attackPower = Math.max(1, player.attackPower - (item.attack - (this._baseAttack(item) || 0)));
        if (item.defense) player.defense = Math.max(0, player.defense - (item.defense - (this._baseDefense(item) || 0)));
        if (item.maxHp) { player.maxHp -= item.maxHp; player.hp = Math.min(player.hp, player.maxHp); }
        if (item.manaRegen) player.bonusManaRegen = Math.max(0, (player.bonusManaRegen || 0) - item.manaRegen);
    }

    _baseAttack(item) { return item._baseAttack || 0; }
    _baseDefense(item) { return item._baseDefense || 0; }

    /**
     * Spawn a guaranteed pickup at a world position.
     * @param {number} x
     * @param {number} y
     * @param {'gear'|'gold'|'health_potion'|'mana_potion'} type
     * @param {number|object} [value] - gold amount or gear data
     */
    spawnPickup(x, y, type, value) {
        const pickupGroup = this.scene.pickups;
        if (!pickupGroup) return;

        let data = {};
        if (type === 'gold') {
            data = { amount: typeof value === 'number' ? value : 30 };
        } else if (type === 'gear') {
            const classKey = this.scene.player?.classKey || 'warrior';
            const rarity = Math.max(1, rollRarity()); // minimum uncommon
            const slot = Phaser.Utils.Array.GetRandom(['weapon', 'armor', 'accessory']);
            data = rollGearItem(slot, rarity, classKey);
        } else {
            data = value || {};
        }

        const pickup = new Pickup(this.scene, x, y, type, data);
        pickupGroup.add(pickup);
        return pickup;
    }

    /**
     * Spawn a guaranteed rare item (used by Shrine of Sacrifice).
     */
    spawnRareItem(x, y, classKey = 'warrior') {
        // Minimum Rare rarity (index 2)
        const rarity = Math.max(2, rollRarity());
        const slot = Phaser.Utils.Array.GetRandom(['weapon', 'armor']);
        const item = rollGearItem(slot, rarity, classKey);
        const pickup = new Pickup(this.scene, x, y, 'gear', item);
        this.scene.pickups?.add(pickup);
    }

    destroy() {
        EventBus.off(Events.ENEMY_DIED, this.onEnemyDied, this);
        EventBus.off(Events.PICKUP_COLLECTED, this.onPickupCollected, this);
    }
}
