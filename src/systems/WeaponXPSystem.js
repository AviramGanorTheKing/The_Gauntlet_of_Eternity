import { GameConfig } from '../config/GameConfig.js';
import { EventBus, Events } from '../utils/EventBus.js';

/**
 * WeaponXPSystem — awards XP to the player's active weapon on enemy kills.
 * Handles leveling up and perk unlocking. XP is per-run (lost on death).
 */
export class WeaponXPSystem {
    constructor(scene) {
        this.scene = scene;
        EventBus.on(Events.ENEMY_DIED, this._onEnemyDied, this);
    }

    _onEnemyDied({ enemy }) {
        const player = this.scene.player;
        if (!player?.alive) return;

        const weapon = player.weapons[player.activeWeaponIndex];
        if (!weapon) return;

        let xp = GameConfig.WEAPON_XP_PER_KILL;
        if (enemy?.isElite) xp = GameConfig.WEAPON_XP_PER_KILL_ELITE;
        if (enemy?.isBoss) xp = GameConfig.WEAPON_XP_PER_KILL_BOSS;

        this._addWeaponXP(player, weapon, xp);
    }

    _addWeaponXP(player, weapon, amount) {
        const maxLevel = weapon.maxLevel || 5;
        if (weapon.level >= maxLevel) return;

        weapon.xp += amount;
        const threshold = weapon.xpCurve?.[weapon.level] ?? 50 * weapon.level;

        if (weapon.xp >= threshold) {
            weapon.xp -= threshold;
            weapon.level++;

            // Check for perk unlocks at this level
            for (const perk of weapon.perks || []) {
                if (perk.level === weapon.level && !weapon.unlockedPerks.includes(perk.id)) {
                    weapon.unlockedPerks.push(perk.id);
                    EventBus.emit(Events.WEAPON_PERK_UNLOCKED, { weapon, perk });
                }
            }

            // Recalc stats with new level bonuses
            player._recalcWeaponStats();

            EventBus.emit(Events.WEAPON_LEVELED_UP, {
                weapon,
                level: weapon.level,
            });
        }
    }

    destroy() {
        EventBus.off(Events.ENEMY_DIED, this._onEnemyDied, this);
    }
}
