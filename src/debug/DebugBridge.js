/**
 * DebugBridge — exposes game internals to window.GAUNTLET_DEBUG
 * for the debug balance panel and browser console access.
 */
import { ClassData } from '../config/ClassData.js';
import { EnemyData } from '../config/EnemyData.js';
import { GameConfig } from '../config/GameConfig.js';
import { getDifficultyConfig } from '../config/DifficultyConfig.js';
import { EventBus, Events } from '../utils/EventBus.js';

export function initDebugBridge(game) {
    const bridge = {
        ClassData,
        EnemyData,
        GameConfig,
        game,

        /** Get the active GameScene (or null). */
        getScene() {
            return game.scene.getScene('GameScene');
        },

        /** Get the live player entity (or null). */
        getPlayer() {
            return this.getScene()?.player || null;
        },

        /** Get all live enemies as an array. */
        getEnemies() {
            return this.getScene()?.enemies?.getChildren() || [];
        },

        /** Get all live companions as an array. */
        getCompanions() {
            return this.getScene()?.companions || [];
        },

        /**
         * Push player stat changes to config AND live entities.
         * @param {string} classKey - e.g. 'warrior'
         * @param {object} changes - e.g. { attack: 25, hp: 150, defense: 10 }
         */
        pushPlayerStats(classKey, changes) {
            const cfg = ClassData[classKey];
            if (!cfg) return;

            // Update config
            if (changes.attack !== undefined) cfg.attack = changes.attack;
            if (changes.defense !== undefined) cfg.defense = changes.defense;
            if (changes.hp !== undefined) cfg.hp = changes.hp;
            if (changes.attackSpeed !== undefined) cfg.attackSpeed = changes.attackSpeed;
            if (changes.speed !== undefined) cfg.speed = changes.speed;

            // Update live player if matching class
            const player = this.getPlayer();
            if (player && player.classKey === classKey) {
                this._applyPlayerChanges(player, changes);
            }

            // Update companions of matching class
            for (const comp of this.getCompanions()) {
                if (comp.classKey === classKey) {
                    this._applyPlayerChanges(comp, changes);
                }
            }
        },

        _applyPlayerChanges(entity, changes) {
            if (changes.attack !== undefined) {
                entity.attackPower = changes.attack;
            }
            if (changes.defense !== undefined) {
                entity.defense = changes.defense;
            }
            if (changes.hp !== undefined) {
                const oldMax = entity.maxHp;
                entity.maxHp = changes.hp;
                entity.hp = Math.round(entity.hp * (changes.hp / oldMax));
                entity.hp = Math.min(entity.hp, entity.maxHp);
            }
            if (changes.attackSpeed !== undefined) {
                entity.attackSpeedRate = changes.attackSpeed;
                entity.attackCooldownDuration = 1000 / changes.attackSpeed;
            }
            if (changes.speed !== undefined) {
                const speedMap = {
                    slow: GameConfig.PLAYER_SPEED_SLOW,
                    medium: GameConfig.PLAYER_SPEED_MEDIUM,
                    fast: GameConfig.PLAYER_SPEED_FAST,
                };
                entity.moveSpeed = speedMap[changes.speed] || GameConfig.PLAYER_SPEED_MEDIUM;
            }
        },

        /**
         * Push enemy stat changes to config AND all live enemies of that type.
         * @param {string} enemyKey - e.g. 'swarmer'
         * @param {object} changes - e.g. { damage: 15, hp: 30 }
         */
        pushEnemyStats(enemyKey, changes) {
            const cfg = EnemyData[enemyKey];
            if (!cfg) return;

            // Update config
            if (changes.damage !== undefined) cfg.damage = changes.damage;
            if (changes.defense !== undefined) cfg.defense = changes.defense;
            if (changes.hp !== undefined) cfg.hp = changes.hp;
            if (changes.speed !== undefined) cfg.speed = changes.speed;
            if (changes.knockbackResistance !== undefined) cfg.knockbackResistance = changes.knockbackResistance;

            // Update live enemies of this type
            for (const enemy of this.getEnemies()) {
                if (enemy.enemyData === cfg) {
                    if (changes.damage !== undefined) enemy.damage = changes.damage;
                    if (changes.defense !== undefined) enemy.defense = changes.defense;
                    if (changes.hp !== undefined) {
                        const oldMax = enemy.maxHp;
                        enemy.maxHp = changes.hp;
                        enemy.hp = Math.round(enemy.hp * (changes.hp / oldMax));
                        enemy.hp = Math.min(enemy.hp, enemy.maxHp);
                    }
                    if (changes.speed !== undefined) enemy.moveSpeed = changes.speed;
                    if (changes.knockbackResistance !== undefined) enemy.knockbackResistance = changes.knockbackResistance;
                }
            }
        },

        /**
         * Push global config changes.
         * @param {object} changes - e.g. { KNOCKBACK_FORCE: 300 }
         */
        pushGlobalConfig(changes) {
            for (const [key, value] of Object.entries(changes)) {
                if (key in GameConfig) {
                    GameConfig[key] = value;
                }
            }
        },

        /**
         * Teleport to a specific floor.
         * @param {number} floorNumber - Target floor (1-25)
         */
        teleportToFloor(floorNumber) {
            try {
                const scene = this.getScene();
                if (!scene) {
                    console.warn('[DebugBridge] No active GameScene');
                    return false;
                }

                const targetFloor = Math.max(1, Math.min(25, Math.floor(floorNumber)));
                console.log(`[DebugBridge] Teleporting to floor ${targetFloor}`);

                // Restart the scene with the new floor number
                // This ensures a clean state without duplicate colliders/listeners
                scene.scene.restart({
                    floor: targetFloor,
                    classKey: scene.classKey,
                    companions: scene.companionKeys
                });

                console.log(`[DebugBridge] Teleport initiated to floor ${targetFloor}`);
                return true;
            } catch (err) {
                console.error('[DebugBridge] Teleport failed:', err);
                return false;
            }
        },

        /**
         * Get current floor number.
         */
        getCurrentFloor() {
            return this.getScene()?.currentFloor || 1;
        },

        /**
         * Toggle god mode (invincibility).
         */
        toggleGodMode() {
            try {
                const player = this.getPlayer();
                if (!player) {
                    console.warn('[DebugBridge] No player for god mode');
                    return false;
                }
                player._godMode = !player._godMode;
                player.isInvincible = player._godMode;
                console.log(`[DebugBridge] God mode: ${player._godMode ? 'ON' : 'OFF'}`);
                return player._godMode;
            } catch (err) {
                console.error('[DebugBridge] toggleGodMode failed:', err);
                return false;
            }
        },

        /**
         * Check if god mode is active.
         */
        isGodMode() {
            return this.getPlayer()?._godMode || false;
        },

        /**
         * Give gold to player.
         */
        giveGold(amount) {
            try {
                const scene = this.getScene();
                if (!scene) return;
                scene.gold = (scene.gold || 0) + amount;
                EventBus.emit(Events.GOLD_CHANGED, { gold: scene.gold });
                console.log(`[DebugBridge] Gave ${amount} gold, total: ${scene.gold}`);
            } catch (err) {
                console.error('[DebugBridge] giveGold failed:', err);
            }
        },

        /** Spawn multiplier — scales maxActiveEnemies on all spawners. Seeded from difficulty. */
        spawnMultiplier: getDifficultyConfig().spawnMultiplier || 1,

        /** Get all live spawners. */
        getSpawners() {
            return this.getScene()?.spawners?.getChildren() || [];
        },

        /** Apply current spawnMultiplier to all live spawners + global cap. */
        pushSpawnMultiplier(mult) {
            this.spawnMultiplier = mult;
            this._spawnMultOverride = true;
            GameConfig.MAX_ENEMIES_PER_ROOM = Math.round(GameConfig.BASE_MAX_ENEMIES_PER_ROOM * mult);
            for (const spawner of this.getSpawners()) {
                if (!spawner.alive) continue;
                spawner.maxActiveEnemies = Math.round(spawner._baseMaxActive * mult);
            }
            console.log(`[DebugBridge] Spawn multiplier: ${mult}x, global cap: ${GameConfig.MAX_ENEMIES_PER_ROOM}`);
        },

        /**
         * Heal player to full.
         */
        fullHeal() {
            try {
                const player = this.getPlayer();
                if (!player) {
                    console.warn('[DebugBridge] No player to heal');
                    return;
                }
                player.hp = player.maxHp;
                player.mana = player.maxMana;
                EventBus.emit(Events.PLAYER_HEALTH_CHANGED, { hp: player.hp, maxHp: player.maxHp });
                EventBus.emit(Events.PLAYER_MANA_CHANGED, { mana: player.mana, maxMana: player.maxMana });
                console.log(`[DebugBridge] Full heal: HP=${player.hp}/${player.maxHp}, Mana=${player.mana}/${player.maxMana}`);
            } catch (err) {
                console.error('[DebugBridge] fullHeal failed:', err);
            }
        },
    };

    window.GAUNTLET_DEBUG = bridge;
    return bridge;
}
