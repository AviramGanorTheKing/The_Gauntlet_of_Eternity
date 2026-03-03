import { ENTITY_STATES } from '../utils/Constants.js';
import { EventBus, Events } from '../utils/EventBus.js';
import { distance } from '../utils/MathUtils.js';
import { GameConfig } from '../config/GameConfig.js';

/**
 * Boss — base entity for all boss encounters.
 * Manages 3-phase state machine, attack pattern sequencing, telegraph visuals,
 * and HP-threshold phase transitions.
 */
export class Boss extends Phaser.Physics.Arcade.Sprite {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     * @param {object} bossData - config from BossData
     */
    constructor(scene, x, y, bossData) {
        const texKey = `boss_${bossData.key}`;
        const hasRealAnim = scene.anims.exists(`${texKey}_idle`);

        // Use real boss sprite from boss_sheet if animation exists, else generate procedural
        if (hasRealAnim) {
            // Use boss_sheet texture — the animation will set the correct frame
            super(scene, x, y, 'boss_sheet', 1);
        } else if (!scene.textures.exists(texKey)) {
            const gfx = scene.make.graphics({ add: false });
            gfx.fillStyle(bossData.color, 1);
            gfx.fillCircle(bossData.size, bossData.size, bossData.size);
            gfx.lineStyle(2, 0xffffff, 0.3);
            gfx.strokeCircle(bossData.size, bossData.size, bossData.size * 0.6);
            gfx.generateTexture(texKey, bossData.size * 2, bossData.size * 2);
            gfx.destroy();
            super(scene, x, y, texKey);
        } else {
            super(scene, x, y, texKey);
        }

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.bossData = bossData;
        this._bossTexKey = texKey;
        this._hasRealAnim = hasRealAnim;
        this.setDepth(8);

        // Play idle animation if real sprite available
        if (hasRealAnim) {
            this.play(`${texKey}_idle`, true);
        }

        // Physics body — use 96×96 frame size for real sprites, bossData.size for procedural
        const spriteSize = hasRealAnim ? 96 : bossData.size * 2;
        const bodyRadius = hasRealAnim ? 36 : Math.floor(bossData.size * 0.8);
        this.body.setCircle(bodyRadius,
            (spriteSize / 2) - bodyRadius,
            (spriteSize / 2) - bodyRadius
        );
        this.body.setImmovable(true); // bosses don't get pushed around

        // Stats
        this.maxHp = bossData.hp;
        this.hp = this.maxHp;
        this.defense = bossData.defense || 0;
        this.moveSpeed = bossData.speed || 0;
        this.damage = 0; // set per attack

        // State
        this.alive = true;
        this.state = ENTITY_STATES.IDLE;
        this.target = null;

        // Phase management
        this.currentPhase = 0;
        this.phases = bossData.phases;

        // Attack cooldown tracking — one timer per attack slot
        this.attackTimers = [];
        this._initPhaseTimers();

        // PERFORMANCE: Track active update listeners and delayed calls for cleanup
        this._activeUpdateListeners = [];
        this._activeDelayedCalls = [];
        this._activeGraphics = [];

        // Telegraph indicator
        this._telegraphGfx = scene.add.graphics().setDepth(7);

        // Boss name display
        this._nameText = scene.add.text(x, y - bossData.size - 20, bossData.name, {
            fontFamily: 'monospace', fontSize: '10px',
            color: '#ffcccc', stroke: '#000', strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5).setDepth(9);
    }

    setTarget(target) {
        this.target = target;
    }

    /**
     * Bosses don't deal contact damage through the standard system.
     * They handle their own damage via attack patterns.
     */
    canDealContactDamage() {
        return false;
    }

    // ── Phase Management ─────────────────────────────────────────────────────

    _initPhaseTimers() {
        const phase = this.phases[this.currentPhase];
        this.attackTimers = phase.attacks.map(() => 0);
    }

    _checkPhaseTransition() {
        const hpFrac = this.hp / this.maxHp;
        const phase = this.phases[this.currentPhase];

        if (this.currentPhase < this.phases.length - 1 && hpFrac <= phase.hpThreshold) {
            this.currentPhase++;
            this._initPhaseTimers();

            // Phase transition flash
            if (this.scene) {
                this.scene.cameras.main.flash(300, 255, 100, 100);
            }

            // Emit event for UI/audio
            EventBus.emit('BOSS_PHASE_CHANGE', {
                boss: this,
                phase: this.currentPhase + 1,
                name: this.phases[this.currentPhase].name
            });

            // Subclass hook for phase-specific effects
            this.onPhaseTransition(this.currentPhase);
        }
    }

    /** Override in subclasses for boss-specific phase transition visuals. */
    onPhaseTransition(phaseIndex) {}

    /** Override in subclasses for boss-specific death visuals. */
    _deathEffect() {}

    // ── Damage ────────────────────────────────────────────────────────────────

    takeDamage(amount) {
        if (!this.alive) return 0;

        const actual = Math.max(1, amount - this.defense);
        this.hp -= actual;

        // White flash
        this.setTintFill(0xffffff);
        const scene = this.scene;
        const boss = this;
        if (scene) {
            scene.time.delayedCall(80, () => {
                if (boss.active) boss.clearTint();
            });
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        } else {
            this._checkPhaseTransition();
        }

        return actual;
    }

    die() {
        this.alive = false;
        this.state = ENTITY_STATES.DEAD;
        if (this.body) {
            this.body.setVelocity(0, 0);
            this.body.enable = false;
        }

        // PERFORMANCE: Clean up all tracked update listeners
        this._cleanupTrackedResources();

        // Cleanup graphics
        if (this._telegraphGfx?.active) this._telegraphGfx.destroy();
        if (this._nameText?.active) this._nameText.destroy();

        EventBus.emit('BOSS_DEFEATED', {
            boss: this,
            key: this.bossData.key,
            reward: this.bossData.reward
        });

        // Subclass death effect
        this._deathEffect();

        // Dramatic death animation (capture scene reference)
        const scene = this.scene;
        if (scene) {
            scene.cameras.main.flash(500, 255, 255, 255);
            scene.tweens.add({
                targets: this,
                alpha: 0, scaleX: 2, scaleY: 2,
                duration: 800,
                ease: 'Power2',
                onComplete: () => this.destroy()
            });
        } else {
            this.destroy();
        }
    }

    // ── AI Update ───────────────────────────────────────────────────────────

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.alive || !this.target || !this.scene) return;

        const phase = this.phases[this.currentPhase];

        // Move toward player (if boss is mobile)
        if (this.moveSpeed > 0) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            if (dist > 60) {
                this.body.setVelocity(
                    (dx / dist) * this.moveSpeed,
                    (dy / dist) * this.moveSpeed
                );
            } else {
                this.body.setVelocity(0, 0);
            }
        }

        // Boss walk animation
        if (this._hasRealAnim) {
            const vx = this.body.velocity.x;
            const vy = this.body.velocity.y;
            const moving = Math.abs(vx) > 3 || Math.abs(vy) > 3;
            const animKey = moving
                ? `${this._bossTexKey}_walk`
                : `${this._bossTexKey}_idle`;
            if (this.anims.currentAnim?.key !== animKey && this.scene.anims.exists(animKey)) {
                this.play(animKey, true);
            }
        }

        // Try each attack in the current phase
        for (let i = 0; i < phase.attacks.length; i++) {
            this.attackTimers[i] -= delta;
            if (this.attackTimers[i] <= 0) {
                const attack = phase.attacks[i];
                this.attackTimers[i] = attack.cooldown;
                this._executeAttack(attack);
            }
        }

        // Update name position
        this._nameText.setPosition(this.x, this.y - this.bossData.size - 16);

        // Fog of war visibility
        const fog = this.scene.fogOfWar;
        if (fog) {
            const ts = GameConfig.TILE_SIZE;
            const tx = (this.x / ts) | 0;
            const ty = (this.y / ts) | 0;
            const vis = fog.isVisible(tx, ty);
            if (this.visible !== vis) {
                this.setVisible(vis);
                this._nameText?.setVisible(vis);
            }
        }
    }

    // ── Attack Execution ──────────────────────────────────────────────────────

    _executeAttack(attack) {
        switch (attack.type) {
            case 'slam': this._attackSlam(attack); break;
            case 'projectile': this._attackProjectile(attack); break;
            case 'homing': this._attackHoming(attack); break;
            case 'summon': this._attackSummon(attack); break;
            case 'charge': this._attackCharge(attack); break;
            case 'barrage': this._attackBarrage(attack); break;
            case 'beam': this._attackBeam(attack); break;
            case 'spin': this._attackSpin(attack); break;
            case 'aoe_zone': this._attackAoeZone(attack); break;
            case 'tendril': this._attackSlam(attack); break; // reuse slam logic
            case 'pulse': this._attackPulse(attack); break;
            case 'combo': this._attackCombo(attack); break;
            case 'cone_breath': this._attackConeBreath(attack); break;
            case 'teleport_slash': this._attackTeleportSlash(attack); break;
            case 'gravity_well': this._attackGravityWell(attack); break;
            default: break;
        }
    }

    // ── Individual Attack Implementations ────────────────────────────────

    _attackSlam(atk) {
        if (!this.target || !this.scene) return;
        const scene = this.scene; // Capture scene reference
        const boss = this;
        const target = this.target;
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        const range = atk.range || 64;
        const arcRad = Phaser.Math.DegToRad(atk.arc || 120);
        const halfArc = arcRad / 2;

        // Telegraph
        const telegraphTime = atk.telegraph || 500;
        const tGfx = scene.add.graphics().setDepth(7);
        tGfx.fillStyle(0xff4444, 0.15);
        tGfx.slice(this.x, this.y, range, angle - halfArc, angle + halfArc, false);
        tGfx.fillPath();

        scene.time.delayedCall(telegraphTime, () => {
            if (!boss.alive) { tGfx.destroy(); return; }
            tGfx.destroy();

            // Actual slam
            const gfx = scene.add.graphics().setDepth(7);
            gfx.fillStyle(0xff6644, 0.4);
            gfx.slice(boss.x, boss.y, range, angle - halfArc, angle + halfArc, false);
            gfx.fillPath();
            scene.tweens.add({ targets: gfx, alpha: 0, duration: 200, onComplete: () => gfx.destroy() });

            // Damage player if in arc
            const d = distance(boss.x, boss.y, target.x, target.y);
            if (d <= range) {
                const aToP = Math.atan2(target.y - boss.y, target.x - boss.x);
                const diff = Math.abs(Phaser.Math.Angle.Wrap(aToP - angle));
                if (diff <= halfArc) {
                    if (!target.isInvincible) {
                        target.takeDamage(atk.damage);
                        EventBus.emit(Events.PLAYER_HEALTH_CHANGED, {
                            hp: target.hp, maxHp: target.maxHp
                        });
                    }
                }
            }
        });
    }

    _attackProjectile(atk) {
        if (!this.target || !this.scene) return;
        const scene = this.scene; // Capture scene reference before it becomes undefined
        const boss = this;
        const target = this.target;
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        const speed = atk.speed || 180;

        const proj = scene.add.graphics().setDepth(8);
        proj.fillStyle(this.bossData.color, 0.9);
        proj.fillCircle(0, 0, 5);
        proj.setPosition(this.x, this.y);
        this._trackGraphics(proj);

        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        let lifetime = 0;

        const cleanup = () => {
            scene.events.off('update', update);
            boss._untrackUpdateListener(update);
            if (proj.active) proj.destroy();
        };

        const update = (time, delta) => {
            if (!proj.active || !boss.alive) { cleanup(); return; }
            lifetime += delta;
            proj.x += vx * (delta / 1000);
            proj.y += vy * (delta / 1000);

            // Hit player
            if (target?.alive && !target.isInvincible) {
                if (distance(proj.x, proj.y, target.x, target.y) < 16) {
                    target.takeDamage(atk.damage);
                    EventBus.emit(Events.PLAYER_HEALTH_CHANGED, {
                        hp: target.hp, maxHp: target.maxHp
                    });
                    cleanup();
                    return;
                }
            }

            if (lifetime > 4000) {
                cleanup();
            }
        };
        scene.events.on('update', update);
        this._trackUpdateListener(update);
    }

    _attackBarrage(atk) {
        if (!this.scene) return;
        const scene = this.scene; // Capture scene reference
        const boss = this;
        const count = atk.count || 5;
        const spread = Phaser.Math.DegToRad(atk.spread || 40);
        const baseAngle = this.target
            ? Math.atan2(this.target.y - this.y, this.target.x - this.x)
            : 0;

        for (let i = 0; i < count; i++) {
            const angle = baseAngle - spread / 2 + (spread / (count - 1 || 1)) * i;
            scene.time.delayedCall(i * 80, () => {
                if (!boss.alive) return;
                boss._attackProjectile({ ...atk, speed: atk.speed || 180 });
            });
        }
    }

    _attackSummon(atk) {
        if (!this.scene) return;
        const scene = this.scene; // Capture scene reference
        const count = atk.count || 1;
        const enemyType = atk.enemy || 'swarmer';

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const sx = this.x + Math.cos(angle) * 48;
            const sy = this.y + Math.sin(angle) * 48;

            // Spawn effect
            const gfx = scene.add.graphics().setDepth(7);
            gfx.fillStyle(this.bossData.color, 0.3);
            gfx.fillCircle(sx, sy, 12);
            scene.tweens.add({
                targets: gfx, alpha: 0, scale: 2, duration: 300,
                onComplete: () => gfx.destroy()
            });

            // Spawn enemy via the scene's spawner logic
            if (scene.spawnEnemyAt) {
                scene.spawnEnemyAt(sx, sy, enemyType);
            }
        }
    }

    _attackHoming(atk) {
        if (!this.target || !this.scene) return;
        const scene = this.scene; // Capture scene reference
        const boss = this;
        const target = this.target;
        const speed = atk.speed || 130;
        const maxLife = atk.duration || 3000;

        const proj = scene.add.graphics().setDepth(8);
        proj.fillStyle(0xff8844, 0.8);
        proj.fillCircle(0, 0, 4);
        proj.setPosition(this.x, this.y);
        this._trackGraphics(proj);

        let lifetime = 0;

        const cleanup = () => {
            scene.events.off('update', update);
            boss._untrackUpdateListener(update);
            if (proj.active) proj.destroy();
        };

        const update = (time, delta) => {
            if (!proj.active || !target?.alive || !boss.alive) {
                cleanup();
                return;
            }
            lifetime += delta;

            const dx = target.x - proj.x;
            const dy = target.y - proj.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            proj.x += (dx / dist) * speed * (delta / 1000);
            proj.y += (dy / dist) * speed * (delta / 1000);

            if (dist < 16 && !target.isInvincible) {
                target.takeDamage(atk.damage);
                EventBus.emit(Events.PLAYER_HEALTH_CHANGED, {
                    hp: target.hp, maxHp: target.maxHp
                });
                cleanup();
                return;
            }

            if (lifetime > maxLife) {
                cleanup();
            }
        };
        scene.events.on('update', update);
        this._trackUpdateListener(update);
    }

    _attackCharge(atk) {
        if (!this.target || !this.scene) return;
        const scene = this.scene; // Capture scene reference
        const boss = this;
        const telegraph = atk.telegraph || 1000;
        const chargeSpeed = atk.speed || 200;

        // Telegraph — flash red
        this.setTint(0xff2222);

        // Line telegraph toward player
        const tGfx = scene.add.graphics().setDepth(7);
        const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        tGfx.lineStyle(6, 0xff4444, 0.2);
        tGfx.lineBetween(this.x, this.y,
            this.x + Math.cos(angle) * 200,
            this.y + Math.sin(angle) * 200);

        scene.time.delayedCall(telegraph, () => {
            if (!boss.alive) { tGfx.destroy(); return; }
            tGfx.destroy();
            boss.clearTint();

            // Charge!
            if (boss.body) {
                boss.body.setVelocity(
                    Math.cos(angle) * chargeSpeed,
                    Math.sin(angle) * chargeSpeed
                );
            }

            // Stop after ~0.5s
            scene.time.delayedCall(500, () => {
                if (boss.alive && boss.body) boss.body.setVelocity(0, 0);
            });
        });
    }

    _attackBeam(atk) {
        if (!this.scene) return;
        const scene = this.scene; // Capture scene reference
        const boss = this;
        const target = this.target;
        const duration = atk.duration || 2000;
        const rotSpeed = atk.rotationSpeed || 0.8;
        let angle = target
            ? Math.atan2(target.y - this.y, target.x - this.x)
            : 0;
        let elapsed = 0;

        const beamGfx = scene.add.graphics().setDepth(7);
        this._trackGraphics(beamGfx);

        const cleanup = () => {
            scene.events.off('update', update);
            boss._untrackUpdateListener(update);
            if (beamGfx.active) beamGfx.destroy();
        };

        const update = (time, delta) => {
            if (!boss.alive) {
                cleanup();
                return;
            }
            elapsed += delta;
            angle += rotSpeed * (delta / 1000);

            beamGfx.clear();
            beamGfx.lineStyle(6, 0xaa44ff, 0.6);
            beamGfx.lineBetween(boss.x, boss.y,
                boss.x + Math.cos(angle) * 300,
                boss.y + Math.sin(angle) * 300);

            // Damage check along beam
            if (target?.alive && !target.isInvincible) {
                const px = target.x - boss.x;
                const py = target.y - boss.y;
                const dot = px * Math.cos(angle) + py * Math.sin(angle);
                const cross = Math.abs(px * Math.sin(angle) - py * Math.cos(angle));
                if (dot > 0 && cross < 14) {
                    target.takeDamage(Math.round(atk.damage * (delta / 1000)));
                }
            }

            if (elapsed >= duration) {
                cleanup();
            }
        };
        scene.events.on('update', update);
        this._trackUpdateListener(update);
    }

    _attackSpin(atk) {
        if (!this.scene) return;
        const scene = this.scene; // Capture scene reference
        const boss = this;
        const target = this.target;
        const duration = atk.duration || 1500;
        let elapsed = 0;

        const gfx = scene.add.graphics().setDepth(7);
        this._trackGraphics(gfx);

        const cleanup = () => {
            scene.events.off('update', update);
            boss._untrackUpdateListener(update);
            if (gfx.active) gfx.destroy();
        };

        const update = (time, delta) => {
            elapsed += delta;
            gfx.clear();
            gfx.fillStyle(0x8888aa, 0.3);
            gfx.fillCircle(boss.x, boss.y, atk.radius || 56);

            if (target?.alive && !target.isInvincible) {
                const d = distance(boss.x, boss.y, target.x, target.y);
                if (d < (atk.radius || 56)) {
                    target.takeDamage(Math.round(atk.damage * (delta / 1000)));
                }
            }

            if (elapsed >= duration || !boss.alive) {
                cleanup();
            }
        };
        scene.events.on('update', update);
        this._trackUpdateListener(update);
    }

    _attackAoeZone(atk) {
        if (!this.scene) return;
        const scene = this.scene; // Capture scene reference
        const boss = this;
        const target = this.target;
        const count = atk.count || 3;
        const radius = atk.radius || 80;
        const duration = atk.duration || 3000;

        for (let i = 0; i < count; i++) {
            // Random position near player
            const ox = (Math.random() - 0.5) * 200;
            const oy = (Math.random() - 0.5) * 200;
            const zx = (target?.x || boss.x) + ox;
            const zy = (target?.y || boss.y) + oy;

            const zone = scene.add.graphics().setDepth(6);
            zone.fillStyle(0x44aa22, 0.15);
            zone.fillCircle(zx, zy, radius);
            this._trackGraphics(zone);

            let elapsed = 0;
            const tickInterval = 500;
            let tickTimer = 0;

            const cleanup = () => {
                scene.events.off('update', update);
                boss._untrackUpdateListener(update);
                if (zone.active) zone.destroy();
            };

            const update = (time, delta) => {
                elapsed += delta;
                tickTimer += delta;

                if (tickTimer >= tickInterval) {
                    tickTimer = 0;
                    if (target?.alive && !target.isInvincible) {
                        const d = distance(zx, zy, target.x, target.y);
                        if (d < radius) {
                            target.takeDamage(atk.damage);
                        }
                    }
                }

                if (elapsed >= duration || !boss.alive) {
                    cleanup();
                }
            };
            scene.events.on('update', update);
            this._trackUpdateListener(update);
        }
    }

    _attackPulse(atk) {
        if (!this.scene) return;
        const scene = this.scene; // Capture scene reference
        const target = this.target;
        const radius = atk.radius || 200;

        const gfx = scene.add.graphics().setDepth(7);
        gfx.fillStyle(0x66aa44, 0.3);
        gfx.fillCircle(this.x, this.y, radius);

        scene.tweens.add({
            targets: gfx, alpha: 0, scale: 1.5, duration: 400,
            onComplete: () => gfx.destroy()
        });

        if (target?.alive && !target.isInvincible) {
            const d = distance(this.x, this.y, target.x, target.y);
            if (d < radius) {
                target.takeDamage(atk.damage);
            }
        }
    }

    _attackCombo(atk) {
        if (!this.scene) return;
        const scene = this.scene; // Capture scene reference
        const boss = this;
        const hits = atk.hits || 3;
        for (let i = 0; i < hits; i++) {
            scene.time.delayedCall(i * 300, () => {
                if (!boss.alive) return;
                boss._attackSlam({
                    damage: atk.damage,
                    range: atk.range || 56,
                    arc: atk.arc || 90,
                    telegraph: 150
                });
            });
        }
    }

    _attackConeBreath(atk) {
        if (!this.scene) return;
        const scene = this.scene; // Capture scene reference
        const boss = this;
        const target = this.target;
        const range = atk.range || 120;
        const arcDeg = atk.arc || 60;
        const duration = atk.duration || 1500;
        const angle = target
            ? Math.atan2(target.y - boss.y, target.x - boss.x)
            : 0;

        let elapsed = 0;
        const tickInterval = 200;
        let tickTimer = 0;

        const gfx = scene.add.graphics().setDepth(7);
        this._trackGraphics(gfx);

        const cleanup = () => {
            scene.events.off('update', update);
            boss._untrackUpdateListener(update);
            if (gfx.active) gfx.destroy();
        };

        const update = (time, delta) => {
            elapsed += delta;
            tickTimer += delta;

            gfx.clear();
            const halfArc = Phaser.Math.DegToRad(arcDeg) / 2;
            gfx.fillStyle(0xff4422, 0.2);
            gfx.slice(boss.x, boss.y, range, angle - halfArc, angle + halfArc, false);
            gfx.fillPath();

            if (tickTimer >= tickInterval) {
                tickTimer = 0;
                if (target?.alive && !target.isInvincible) {
                    const d = distance(boss.x, boss.y, target.x, target.y);
                    if (d <= range) {
                        const aToP = Math.atan2(target.y - boss.y, target.x - boss.x);
                        const diff = Math.abs(Phaser.Math.Angle.Wrap(aToP - angle));
                        if (diff <= halfArc) {
                            target.takeDamage(atk.damage);
                        }
                    }
                }
            }

            if (elapsed >= duration || !boss.alive) {
                cleanup();
            }
        };
        scene.events.on('update', update);
        this._trackUpdateListener(update);
    }

    _attackTeleportSlash(atk) {
        if (!this.target || !this.scene) return;
        const scene = this.scene; // Capture scene reference
        const boss = this;
        const target = this.target;

        // Flash out
        this.setAlpha(0.3);

        scene.time.delayedCall(300, () => {
            if (!boss.alive) return;

            // Appear behind player
            const angle = Math.atan2(boss.y - target.y, boss.x - target.x);
            const behindX = target.x + Math.cos(angle) * 40;
            const behindY = target.y + Math.sin(angle) * 40;

            boss.setPosition(behindX, behindY);
            boss.setAlpha(1);

            // Slash
            boss._attackSlam({
                damage: atk.damage,
                range: 56,
                arc: 120,
                telegraph: 100
            });
        });
    }

    _attackGravityWell(atk) {
        if (!this.target || !this.scene) return;
        const scene = this.scene; // Capture scene reference
        const boss = this;
        const target = this.target;
        const wx = target.x + (Math.random() - 0.5) * 80;
        const wy = target.y + (Math.random() - 0.5) * 80;
        const radius = atk.radius || 100;
        const pullForce = atk.pullForce || 80;
        const duration = atk.duration || 3000;
        let elapsed = 0;

        const gfx = scene.add.graphics().setDepth(6);
        this._trackGraphics(gfx);

        const cleanup = () => {
            scene.events.off('update', update);
            boss._untrackUpdateListener(update);
            if (gfx.active) gfx.destroy();
        };

        const update = (time, delta) => {
            elapsed += delta;

            gfx.clear();
            const alpha = 0.15 + 0.1 * Math.sin(elapsed * 0.005);
            gfx.fillStyle(0x8844ff, alpha);
            gfx.fillCircle(wx, wy, radius);

            // Pull player toward center
            if (target?.alive) {
                const d = distance(wx, wy, target.x, target.y);
                if (d < radius && d > 5) {
                    const dx = wx - target.x;
                    const dy = wy - target.y;
                    const len = Math.sqrt(dx * dx + dy * dy) || 1;
                    target.x += (dx / len) * pullForce * (delta / 1000);
                    target.y += (dy / len) * pullForce * (delta / 1000);
                }

                // Tick damage at center
                if (d < 20 && !target.isInvincible) {
                    target.takeDamage(Math.round(atk.damage * (delta / 1000)));
                }
            }

            if (elapsed >= duration || !boss.alive) {
                cleanup();
            }
        };
        scene.events.on('update', update);
        this._trackUpdateListener(update);
    }

    /**
     * PERFORMANCE: Clean up all tracked update listeners, delayed calls, and graphics.
     * Called from die() and destroy() to prevent memory leaks.
     */
    _cleanupTrackedResources() {
        const scene = this.scene;
        if (!scene) return;

        // Remove all tracked update listeners
        if (this._activeUpdateListeners) {
            for (const listener of this._activeUpdateListeners) {
                scene.events.off('update', listener);
            }
            this._activeUpdateListeners = [];
        }

        // Cancel all tracked delayed calls
        if (this._activeDelayedCalls) {
            for (const call of this._activeDelayedCalls) {
                if (call && call.remove) call.remove();
            }
            this._activeDelayedCalls = [];
        }

        // Destroy all tracked graphics
        if (this._activeGraphics) {
            for (const gfx of this._activeGraphics) {
                if (gfx?.active) gfx.destroy();
            }
            this._activeGraphics = [];
        }
    }

    /**
     * Helper to track an update listener for later cleanup.
     */
    _trackUpdateListener(listener) {
        if (this._activeUpdateListeners) {
            this._activeUpdateListeners.push(listener);
        }
    }

    /**
     * Helper to untrack a listener when it naturally completes.
     */
    _untrackUpdateListener(listener) {
        if (this._activeUpdateListeners) {
            const idx = this._activeUpdateListeners.indexOf(listener);
            if (idx !== -1) this._activeUpdateListeners.splice(idx, 1);
        }
    }

    /**
     * Helper to track a delayed call for later cleanup.
     */
    _trackDelayedCall(call) {
        if (this._activeDelayedCalls) {
            this._activeDelayedCalls.push(call);
        }
    }

    /**
     * Helper to track a graphics object for later cleanup.
     */
    _trackGraphics(gfx) {
        if (this._activeGraphics) {
            this._activeGraphics.push(gfx);
        }
    }

    /**
     * Override destroy to clean up graphics objects.
     * Called when direct destruction occurs (e.g., scene cleanup).
     */
    destroy(fromScene) {
        // Clean up tracked resources first
        this._cleanupTrackedResources();

        if (this._telegraphGfx) {
            this._telegraphGfx.destroy();
            this._telegraphGfx = null;
        }
        if (this._nameText) {
            this._nameText.destroy();
            this._nameText = null;
        }
        super.destroy(fromScene);
    }
}
