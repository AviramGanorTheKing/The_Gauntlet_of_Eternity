import { TrapData } from '../config/TrapData.js';
import { GameConfig } from '../config/GameConfig.js';
import { EventBus, Events } from '../utils/EventBus.js';

/**
 * TrapSystem — manages all trap entities on the current floor.
 *
 * Each trap is a zone with a type-driven behavior:
 *  - spike_tile: periodic active window, damages anything that overlaps
 *  - pressure_plate: one-shot on step, fires dart projectiles
 *  - pit_trap: damages and briefly disables movement
 *  - crypt-specific: coffin_burst, cursed_tile
 */
export class TrapSystem {
    /** @param {Phaser.Scene} scene */
    constructor(scene) {
        this.scene = scene;
        this.traps = []; // array of trap state objects
    }

    /**
     * Place traps at given tile positions.
     * @param {Array<{x:number,y:number,trapType:string}>} positions - world pixel coords
     * @param {string} biomeKey
     */
    placeTrapAt(worldX, worldY, trapType) {
        const def = TrapData[trapType];
        if (!def) return;

        const ts = GameConfig.TILE_SIZE;

        // Build trap state
        const trapState = {
            def,
            x: worldX,
            y: worldY,
            active: def.id === 'spike_tile' ? false : true, // spike starts retracted
            cycleTimer: 0,
            triggered: false,
            resetTimer: 0,
        };

        // Visual: colored rectangle
        const trapGfx = this.scene.add.graphics();
        trapState.gfx = trapGfx;
        this._drawTrap(trapState, false);

        // Physics zone
        const zone = this.scene.add.zone(worldX, worldY, ts - 4, ts - 4);
        this.scene.physics.add.existing(zone, true);
        trapState.zone = zone;

        // Overlap with player
        this.scene.physics.add.overlap(this.scene.player, zone, () => {
            this._onPlayerEnter(trapState);
        });

        this.traps.push(trapState);
        return trapState;
    }

    update(time, delta) {
        for (const trap of this.traps) {
            if (!trap.zone?.active) continue;

            switch (trap.def.id) {
                case 'spike_tile':
                    this._updateSpike(trap, delta);
                    break;
                case 'pressure_plate':
                    if (trap.triggered) {
                        trap.resetTimer -= delta;
                        if (trap.resetTimer <= 0) {
                            trap.triggered = false;
                            this._drawTrap(trap, false);
                        }
                    }
                    break;
            }
        }
    }

    _updateSpike(trap, delta) {
        const def = trap.def;
        trap.cycleTimer += delta;

        // Toggle active state based on cycle
        if (trap.cycleTimer >= def.cycleTime) {
            trap.cycleTimer = 0;
        }
        const nowActive = trap.cycleTimer < def.activeTime;
        if (nowActive !== trap.active) {
            trap.active = nowActive;
            this._drawTrap(trap, nowActive);
        }
    }

    _onPlayerEnter(trap) {
        const player = this.scene.player;
        if (!player?.alive || player.isInvincible) return;

        const def = trap.def;

        switch (def.id) {
            case 'spike_tile':
                if (!trap.active) return; // only damage when spikes are up
                this._applyTrapDamage(player, def);
                break;

            case 'pressure_plate':
                if (trap.triggered) return;
                trap.triggered = true;
                trap.resetTimer = def.resetTime;
                this._drawTrap(trap, true);
                this._fireDarts(trap.x, trap.y, def);
                break;

            case 'pit_trap':
                this._applyTrapDamage(player, def);
                // Briefly stun movement
                player.body.setVelocity(0, 0);
                player.isInvincible = true;
                player.setAlpha(0.3);
                this.scene.time.delayedCall(def.fallDuration, () => {
                    if (player.alive) {
                        player.isInvincible = false;
                        player.setAlpha(1);
                    }
                });
                break;

            case 'cursed_tile':
                if (this.scene.statusEffects) {
                    this.scene.statusEffects.apply(player, 'curse');
                }
                break;

            case 'coffin_burst':
                this.scene.spawnEnemyFromSpawner?.(trap.x + 16, trap.y, 'swarmer');
                // Disable coffin after burst
                trap.zone.destroy();
                if (trap.gfx?.active) trap.gfx.destroy();
                break;
        }

        EventBus.emit(Events.TRAP_TRIGGERED, { trap: trap.def.id, x: trap.x, y: trap.y });
    }

    _applyTrapDamage(player, def) {
        const dmg = Math.floor(player.maxHp * def.damagePercent);
        if (dmg <= 0) return;
        const angle = 0;
        this.scene.combatSystem.dealDamageToPlayer({ id: 'trap' }, player, dmg, angle);
    }

    _fireDarts(x, y, def) {
        const count = def.projectileCount || 4;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            this.scene.createEnemyProjectile?.(x, y, Math.cos(angle), Math.sin(angle), def.projectileSpeed || 160, Math.floor(this.scene.player.maxHp * def.damagePercent));
        }
    }

    _drawTrap(trap, active) {
        if (!trap.gfx?.active) return;
        const ts = GameConfig.TILE_SIZE;
        const halfTs = ts / 2;
        trap.gfx.clear();

        if (trap.def.id === 'spike_tile') {
            // Base tile
            trap.gfx.fillStyle(trap.def.color, 1);
            trap.gfx.fillRect(trap.x - halfTs + 1, trap.y - halfTs + 1, ts - 2, ts - 2);

            if (active) {
                // Draw spikes
                trap.gfx.fillStyle(trap.def.activeColor, 1);
                const spikeW = 5;
                const spikeCount = 3;
                for (let i = 0; i < spikeCount; i++) {
                    const sx = trap.x - halfTs + 6 + i * (ts / spikeCount);
                    trap.gfx.fillTriangle(sx, trap.y + halfTs - 4, sx - spikeW, trap.y - halfTs + 4, sx + spikeW, trap.y - halfTs + 4);
                }
            }
        } else if (trap.def.id === 'pressure_plate') {
            trap.gfx.fillStyle(active ? 0x553300 : trap.def.color, 1);
            trap.gfx.fillRect(trap.x - halfTs + 4, trap.y - halfTs + 4, ts - 8, 4);
        } else if (trap.def.id === 'pit_trap') {
            trap.gfx.fillStyle(trap.def.color, 1);
            trap.gfx.fillRect(trap.x - halfTs + 2, trap.y - halfTs + 2, ts - 4, ts - 4);
            // Pit hole
            trap.gfx.fillStyle(0x000000, 1);
            trap.gfx.fillCircle(trap.x, trap.y, ts / 3);
        } else if (trap.def.id === 'coffin_burst' || trap.def.id === 'cursed_tile') {
            trap.gfx.fillStyle(trap.def.color, 0.5);
            trap.gfx.fillRect(trap.x - halfTs + 2, trap.y - halfTs + 2, ts - 4, ts - 4);
        }

        trap.gfx.setDepth(1);
    }

    clearAll() {
        for (const trap of this.traps) {
            if (trap.zone?.active) trap.zone.destroy();
            if (trap.gfx?.active) trap.gfx.destroy();
        }
        this.traps = [];
    }

    destroy() {
        this.clearAll();
    }
}
