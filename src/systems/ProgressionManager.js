/**
 * ProgressionManager — skill trees, soul shard economy, class unlocking,
 * cosmetics, achievement tracking.
 *
 * Works with SaveManager for persistence.
 * Communicates via EventBus for cross-system updates.
 */

import { PerkData, PerkLookup, RESPEC_COSTS } from '../config/PerkData.js';
import { saveManager } from './SaveManager.js';
import { EventBus, Events } from '../utils/EventBus.js';

/** Soul shard earning rates (per GDD section 4) */
const SHARD_RATES = {
    ROOM_CLEARED: 5,
    FLOOR_BOSS: 50,
    BIOME_BOSS: 150,
    SECRET_ROOM: 25,
    SHRINE_COMPLETED: 10,
    DEATH_PER_FLOOR: 5,
};

/** Biome boss floors */
const BIOME_BOSS_FLOORS = [5, 10, 15, 20, 25];

/** Cosmetic tiers */
const COSMETIC_TIERS = {
    common: { cost: 200, label: 'Color Palette Swap' },
    rare: { cost: 500, label: 'Themed Outfit' },
};

export class ProgressionManager {
    constructor() {
        /** Active perk effects for current run (computed from unlocked perks) */
        this.activeEffects = {};

        /** Shards earned during this run (not yet saved to permanent) */
        this.runShards = 0;

        /** Track shard sources for death screen breakdown */
        this.shardBreakdown = {
            rooms: 0,
            bosses: 0,
            secrets: 0,
            shrines: 0,
            floorBonus: 0,
        };

        this._setupListeners();
    }

    // ── Perk System ──────────────────────────────────────────────────────

    /**
     * Compute active perk effects for a class based on unlocked perks.
     * Call at run start — stores results in this.activeEffects.
     */
    computeActiveEffects(classKey) {
        this.activeEffects = {};
        const unlocked = saveManager.getUnlockedPerks(classKey);

        for (const perkId of unlocked) {
            const perk = PerkLookup[perkId];
            if (!perk) continue;

            const { stat, value } = perk.effect;

            // Additive stats accumulate
            if (typeof value === 'number' && typeof this.activeEffects[stat] === 'number') {
                this.activeEffects[stat] += value;
            } else {
                this.activeEffects[stat] = value;
            }
        }

        return this.activeEffects;
    }

    /**
     * Get the value of a perk effect (0/false if not active).
     */
    getEffect(stat) {
        return this.activeEffects[stat] ?? 0;
    }

    /**
     * Check if a perk effect is active (boolean or truthy).
     */
    hasEffect(stat) {
        return !!this.activeEffects[stat];
    }

    /**
     * Check if a perk can be unlocked (prerequisites met, enough shards).
     */
    canUnlockPerk(classKey, perkId) {
        const perk = PerkLookup[perkId];
        if (!perk) return false;

        // Already unlocked?
        const unlocked = saveManager.getUnlockedPerks(classKey);
        if (unlocked.includes(perkId)) return false;

        // Check prerequisite
        if (perk.requires && !unlocked.includes(perk.requires)) return false;

        // Check shard cost
        const permanent = saveManager.getPermanent();
        if ((permanent.soulShards || 0) < perk.cost) return false;

        return true;
    }

    /**
     * Unlock a perk. Returns true on success.
     */
    unlockPerk(classKey, perkId) {
        if (!this.canUnlockPerk(classKey, perkId)) return false;

        const perk = PerkLookup[perkId];
        saveManager.spendSoulShards(perk.cost);
        saveManager.unlockPerk(classKey, perkId);

        EventBus.emit('perk:unlocked', { classKey, perkId, perk });
        return true;
    }

    /**
     * Get respec cost based on how many times the player has respecced.
     */
    getRespecCost() {
        const permanent = saveManager.getPermanent();
        const count = permanent.respecCount || 0;
        return RESPEC_COSTS[Math.min(count, RESPEC_COSTS.length - 1)];
    }

    /**
     * Respec a class. Returns refunded shard amount, or -1 on failure.
     */
    respecClass(classKey) {
        const cost = this.getRespecCost();
        const permanent = saveManager.getPermanent();

        if (cost > 0 && (permanent.soulShards || 0) < cost) return -1;

        // Calculate refund
        const unlocked = saveManager.getUnlockedPerks(classKey);
        let refund = 0;
        for (const perkId of unlocked) {
            const perk = PerkLookup[perkId];
            if (perk) refund += perk.cost;
        }

        // Spend cost, then clear perks and add refund
        if (cost > 0) saveManager.spendSoulShards(cost);
        saveManager.respecClass(classKey);
        saveManager.addSoulShards(refund);

        EventBus.emit('class:respecced', { classKey, refund });
        return refund;
    }

    /**
     * Get skill tree data for display.
     * Returns branches with unlocked state per node.
     */
    getSkillTreeDisplay(classKey) {
        const tree = PerkData[classKey];
        if (!tree) return null;

        const unlocked = saveManager.getUnlockedPerks(classKey);
        const permanent = saveManager.getPermanent();
        const shards = permanent.soulShards || 0;

        const display = {};
        for (const [branch, perks] of Object.entries(tree)) {
            display[branch] = perks.map(perk => ({
                ...perk,
                unlocked: unlocked.includes(perk.id),
                canUnlock: this.canUnlockPerk(classKey, perk.id),
                affordable: shards >= perk.cost,
                prereqMet: !perk.requires || unlocked.includes(perk.requires),
            }));
        }

        return display;
    }

    // ── Soul Shard Economy ────────────────────────────────────────────────

    /**
     * Award shards for a game event. Accumulates during run.
     */
    awardShards(source, floorNumber) {
        let amount = 0;

        switch (source) {
            case 'room_cleared':
                amount = SHARD_RATES.ROOM_CLEARED;
                this.shardBreakdown.rooms += amount;
                break;
            case 'boss_defeated':
                amount = BIOME_BOSS_FLOORS.includes(floorNumber)
                    ? SHARD_RATES.BIOME_BOSS
                    : SHARD_RATES.FLOOR_BOSS;
                this.shardBreakdown.bosses += amount;
                break;
            case 'secret_found':
                amount = SHARD_RATES.SECRET_ROOM;
                this.shardBreakdown.secrets += amount;
                break;
            case 'shrine_completed':
                amount = SHARD_RATES.SHRINE_COMPLETED;
                this.shardBreakdown.shrines += amount;
                break;
            default:
                break;
        }

        this.runShards += amount;
        EventBus.emit('shards:earned', { amount, total: this.runShards, source });
        return amount;
    }

    /**
     * Calculate death bonus shards.
     */
    calculateDeathBonus(floorsReached) {
        const bonus = floorsReached * SHARD_RATES.DEATH_PER_FLOOR;
        this.shardBreakdown.floorBonus = bonus;
        this.runShards += bonus;
        return bonus;
    }

    /**
     * Finalize run — add accumulated shards to permanent save.
     * Returns total shards earned.
     */
    finalizeRunShards() {
        if (this.runShards > 0) {
            saveManager.addSoulShards(this.runShards);
        }
        const total = this.runShards;
        this.runShards = 0;
        return total;
    }

    /**
     * Get breakdown of shards earned this run.
     */
    getShardBreakdown() {
        return { ...this.shardBreakdown, total: this.runShards };
    }

    /**
     * Reset run tracking.
     */
    resetRunTracking() {
        this.runShards = 0;
        this.shardBreakdown = { rooms: 0, bosses: 0, secrets: 0, shrines: 0, floorBonus: 0 };
    }

    // ── Class Unlocking ────────────────────────────────────────────────────

    /**
     * Check floor-based class unlocks.
     * Valkyrie: reach floor 11
     * Necromancer: beat floor 20 boss
     */
    checkClassUnlocks(floorReached, bossDefeatedOnFloor) {
        const unlocked = [];

        if (floorReached >= 11 && !saveManager.isClassUnlocked('valkyrie')) {
            saveManager.unlockClass('valkyrie');
            unlocked.push('valkyrie');
            EventBus.emit('class:unlocked', { classKey: 'valkyrie' });
        }

        if (bossDefeatedOnFloor === 20 && !saveManager.isClassUnlocked('necromancer')) {
            saveManager.unlockClass('necromancer');
            unlocked.push('necromancer');
            EventBus.emit('class:unlocked', { classKey: 'necromancer' });
        }

        return unlocked;
    }

    // ── Cosmetics ─────────────────────────────────────────────────────────

    /**
     * Purchase a cosmetic with soul shards.
     */
    purchaseCosmetic(cosmeticId, tier) {
        const tierData = COSMETIC_TIERS[tier];
        if (!tierData) return false;

        const permanent = saveManager.getPermanent();
        if ((permanent.soulShards || 0) < tierData.cost) return false;
        if ((permanent.cosmetics || []).includes(cosmeticId)) return false;

        saveManager.spendSoulShards(tierData.cost);
        saveManager.unlockCosmetic(cosmeticId);
        EventBus.emit('cosmetic:unlocked', { cosmeticId, tier });
        return true;
    }

    // ── Achievements ──────────────────────────────────────────────────────

    /**
     * Check and award achievements based on current state.
     */
    checkAchievements(stats) {
        const permanent = saveManager.getPermanent();
        const existing = permanent.achievements || [];
        const newAchievements = [];

        // Beat Abyss with specific class
        if (stats.victory && stats.classKey) {
            const achId = `beat_abyss_${stats.classKey}`;
            if (!existing.includes(achId)) {
                saveManager.addAchievement(achId);
                newAchievements.push(achId);
            }
        }

        // No-hit biome boss
        if (stats.bossNoHit && stats.bossFloor) {
            const achId = `nohit_boss_floor_${stats.bossFloor}`;
            if (!existing.includes(achId)) {
                saveManager.addAchievement(achId);
                newAchievements.push(achId);
            }
        }

        // All secrets in one run
        if (stats.allSecrets) {
            if (!existing.includes('all_secrets_single_run')) {
                saveManager.addAchievement('all_secrets_single_run');
                newAchievements.push('all_secrets_single_run');
            }
        }

        return newAchievements;
    }

    // ── Event Listeners ──────────────────────────────────────────────────

    _setupListeners() {
        EventBus.on('room:cleared', () => this.awardShards('room_cleared'));
        EventBus.on(Events.BOSS_DEFEATED, (data) => {
            this.awardShards('boss_defeated', data?.floor);
        });
        EventBus.on('shrine:activated', () => this.awardShards('shrine_completed'));
    }

    destroy() {
        EventBus.off('room:cleared');
        EventBus.off(Events.BOSS_DEFEATED);
        EventBus.off('shrine:activated');
    }
}
