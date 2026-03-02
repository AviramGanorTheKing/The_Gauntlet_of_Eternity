/**
 * DebugBridge — exposes game internals to window.GAUNTLET_DEBUG
 * for the debug balance panel and browser console access.
 */
import { ClassData } from '../config/ClassData.js';
import { EnemyData } from '../config/EnemyData.js';
import { GameConfig } from '../config/GameConfig.js';

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
    };

    window.GAUNTLET_DEBUG = bridge;
    return bridge;
}
