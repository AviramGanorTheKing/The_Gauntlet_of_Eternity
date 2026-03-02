import { StatusEffectData } from '../config/StatusEffectData.js';
import { EventBus, Events } from '../utils/EventBus.js';
import { GameConfig } from '../config/GameConfig.js';

/**
 * StatusEffects — manages all status effects on entities.
 * One instance per scene; tracks active effects per entity.
 *
 * Usage:
 *   statusEffects.apply(entity, 'poison');
 *   statusEffects.update(delta);  // call each frame
 */
export class StatusEffects {
    constructor(scene) {
        this.scene = scene;

        // Map<entity, Map<effectId, { data, timer, tickAccum, visualEl }>>
        this._active = new Map();
    }

    /**
     * Apply a status effect to an entity.
     * @param {object} entity - any entity with .hp, .alive, .body
     * @param {string} effectId - key from StatusEffectData
     * @param {object} [source] - optional source entity
     */
    apply(entity, effectId, source = null) {
        if (!entity?.alive) return;

        const def = StatusEffectData[effectId];
        if (!def) return;

        if (!this._active.has(entity)) {
            this._active.set(entity, new Map());
        }

        const entityEffects = this._active.get(entity);

        // Handle stacking rules
        if (entityEffects.has(effectId)) {
            const existing = entityEffects.get(effectId);
            if (def.refreshable) {
                existing.timer = def.duration; // reset timer
            }
            return;
        }

        // Apply speed modifier immediately
        if (def.speedMult !== undefined && entity.body) {
            entity._baseSpeed = entity._baseSpeed ?? entity.moveSpeed;
            entity.moveSpeed = Math.round(entity._baseSpeed * def.speedMult);
        }

        // Freeze stops the body
        if (effectId === 'freeze' && entity.body) {
            entity.body.setVelocity(0, 0);
            entity._frozenNextHitMult = def.nextHitMult || 1;
        }

        // Tint
        if (entity.setTint) entity.setTint(def.color);

        // Visual indicator (stars / particles — simple text icon)
        const icon = this.scene.add.text(entity.x, entity.y - 20, def.icon, {
            fontSize: '14px',
            backgroundColor: '#00000066'
        }).setOrigin(0.5).setDepth(30);

        entityEffects.set(effectId, {
            def,
            timer: def.duration,
            tickAccumulator: 0,
            icon,
            source,
        });

        EventBus.emit(Events.STATUS_APPLIED, { entity, effectId });
    }

    /**
     * Update all active effects each frame.
     * @param {number} delta - ms since last frame
     */
    update(delta) {
        for (const [entity, effects] of this._active) {
            if (!entity.active || !entity.alive) {
                this._clearAll(entity);
                continue;
            }

            for (const [effectId, state] of effects) {
                const def = state.def;
                state.timer -= delta;

                // Move icon with entity
                if (state.icon?.active) {
                    state.icon.x = entity.x;
                    state.icon.y = entity.y - 22;
                }

                // Tick damage
                if (def.tickDamage > 0 && def.tickInterval > 0) {
                    state.tickAccumulator += delta;
                    while (state.tickAccumulator >= def.tickInterval) {
                        state.tickAccumulator -= def.tickInterval;
                        if (entity.hp !== undefined && entity.alive) {
                            entity.hp = Math.max(0, entity.hp - def.tickDamage);
                            EventBus.emit(Events.ENTITY_DAMAGED, { source: null, target: entity, damage: def.tickDamage });
                            // Show tick damage number
                            if (this.scene.combatSystem) {
                                this.scene.combatSystem.showDamageNumber(entity.x, entity.y, def.tickDamage, def.color);
                            }
                            if (entity.hp <= 0 && entity.die) {
                                entity.die();
                            }
                        }

                        // Burn spread
                        if (effectId === 'burn' && def.spreadRadius) {
                            this._spreadBurn(entity, def);
                        }
                    }
                }

                // Expire
                if (state.timer <= 0) {
                    this._removeEffect(entity, effectId, state);
                    effects.delete(effectId);
                }
            }

            if (effects.size === 0) {
                this._active.delete(entity);
            }
        }
    }

    /**
     * Check if an entity has a given effect active.
     */
    has(entity, effectId) {
        return this._active.get(entity)?.has(effectId) ?? false;
    }

    /**
     * Get list of active effect IDs for an entity (for UIScene).
     */
    getActive(entity) {
        return [...(this._active.get(entity)?.keys() ?? [])];
    }

    /**
     * Get remaining time (0-1) for an effect on an entity.
     */
    getProgress(entity, effectId) {
        const state = this._active.get(entity)?.get(effectId);
        if (!state) return 0;
        return state.timer / state.def.duration;
    }

    _removeEffect(entity, effectId, state) {
        if (!entity.active) return;
        const def = state.def;

        // Restore speed
        if (def.speedMult !== undefined && entity._baseSpeed !== undefined) {
            entity.moveSpeed = entity._baseSpeed;
            // Check remaining speed effects
            const effects = this._active.get(entity);
            if (effects) {
                for (const [id, s] of effects) {
                    if (s.def.speedMult !== undefined && id !== effectId) {
                        entity.moveSpeed = Math.round(entity._baseSpeed * s.def.speedMult);
                        break;
                    }
                }
            }
        }

        // Clear tint if no other tinting effects remain
        const effects = this._active.get(entity);
        const hasOtherTint = effects && [...effects.keys()].some(id => id !== effectId && StatusEffectData[id]?.color);
        if (!hasOtherTint && entity.clearTint) entity.clearTint();

        if (state.icon?.active) state.icon.destroy();

        EventBus.emit(Events.STATUS_EXPIRED, { entity, effectId });
    }

    _clearAll(entity) {
        const effects = this._active.get(entity);
        if (!effects) return;
        for (const [effectId, state] of effects) {
            if (state.icon?.active) state.icon.destroy();
        }
        this._active.delete(entity);
    }

    _spreadBurn(sourceEntity, def) {
        if (!this.scene.enemies) return;
        for (const enemy of this.scene.enemies.getChildren()) {
            if (!enemy.alive || enemy === sourceEntity) continue;
            const dx = enemy.x - sourceEntity.x;
            const dy = enemy.y - sourceEntity.y;
            if (dx * dx + dy * dy <= def.spreadRadius * def.spreadRadius) {
                this.apply(enemy, 'burn');
            }
        }
    }

    destroy() {
        for (const [entity] of this._active) {
            this._clearAll(entity);
        }
        this._active.clear();
    }
}
