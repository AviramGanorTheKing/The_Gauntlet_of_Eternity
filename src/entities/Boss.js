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
            this.scene.cameras.main.flash(300, 255, 100, 100);

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
        this.scene.time.delayedCall(80, () => {
            if (this.active) this.clearTint();
        });

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
        this.body.setVelocity(0, 0);
        this.body.enable = false;

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

        // Dramatic death animation
        this.scene.cameras.main.flash(500, 255, 255, 255);
        this.scene.tweens.add({
            targets: this,
            alpha: 0, scaleX: 2, scaleY: 2,
            duration: 800,
            ease: 'Power2',
            onComplete: () => this.destroy()
        });
    }

    // ── AI Update ───────────────────────────────────────────────────────────

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.alive || !this.target) return;

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
        if (!this.target) return;
        const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        const range = atk.range || 64;
        const arcRad = Phaser.Math.DegToRad(atk.arc || 120);
        const halfArc = arcRad / 2;

        // Telegraph
        const telegraphTime = atk.telegraph || 500;
        const tGfx = this.scene.add.graphics().setDepth(7);
        tGfx.fillStyle(0xff4444, 0.15);
        tGfx.slice(this.x, this.y, range, angle - halfArc, angle + halfArc, false);
        tGfx.fillPath();

        this.scene.time.delayedCall(telegraphTime, () => {
            if (!this.alive) { tGfx.destroy(); return; }
            tGfx.destroy();

            // Actual slam
            const gfx = this.scene.add.graphics().setDepth(7);
            gfx.fillStyle(0xff6644, 0.4);
            gfx.slice(this.x, this.y, range, angle - halfArc, angle + halfArc, false);
            gfx.fillPath();
            this.scene.tweens.add({ targets: gfx, alpha: 0, duration: 200, onComplete: () => gfx.destroy() });

            // Damage player if in arc
            const d = distance(this.x, this.y, this.target.x, this.target.y);
            if (d <= range) {
                const aToP = Math.atan2(this.target.y - this.y, this.target.x - this.x);
                const diff = Math.abs(Phaser.Math.Angle.Wrap(aToP - angle));
                if (diff <= halfArc) {
                    if (!this.target.isInvincible) {
                        this.target.takeDamage(atk.damage);
                        EventBus.emit(Events.PLAYER_HEALTH_CHANGED, {
                            hp: this.target.hp, maxHp: this.target.maxHp
                        });
                    }
                }
            }
        });
    }

    _attackProjectile(atk) {
        if (!this.target) return;
        const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        const speed = atk.speed || 180;

        const proj = this.scene.add.graphics().setDepth(8);
        proj.fillStyle(this.bossData.color, 0.9);
        proj.fillCircle(0, 0, 5);
        proj.setPosition(this.x, this.y);

        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        let lifetime = 0;

        const update = (time, delta) => {
            if (!proj.active) return;
            lifetime += delta;
            proj.x += vx * (delta / 1000);
            proj.y += vy * (delta / 1000);

            // Hit player
            if (this.target?.alive && !this.target.isInvincible) {
                if (distance(proj.x, proj.y, this.target.x, this.target.y) < 16) {
                    this.target.takeDamage(atk.damage);
                    EventBus.emit(Events.PLAYER_HEALTH_CHANGED, {
                        hp: this.target.hp, maxHp: this.target.maxHp
                    });
                    this.scene.events.off('update', update);
                    proj.destroy();
                    return;
                }
            }

            if (lifetime > 4000) {
                this.scene.events.off('update', update);
                proj.destroy();
            }
        };
        this.scene.events.on('update', update);
    }

    _attackBarrage(atk) {
        const count = atk.count || 5;
        const spread = Phaser.Math.DegToRad(atk.spread || 40);
        const baseAngle = this.target
            ? Math.atan2(this.target.y - this.y, this.target.x - this.x)
            : 0;

        for (let i = 0; i < count; i++) {
            const angle = baseAngle - spread / 2 + (spread / (count - 1 || 1)) * i;
            this.scene.time.delayedCall(i * 80, () => {
                if (!this.alive) return;
                this._attackProjectile({ ...atk, speed: atk.speed || 180 });
            });
        }
    }

    _attackSummon(atk) {
        const count = atk.count || 1;
        const enemyType = atk.enemy || 'swarmer';

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const sx = this.x + Math.cos(angle) * 48;
            const sy = this.y + Math.sin(angle) * 48;

            // Spawn effect
            const gfx = this.scene.add.graphics().setDepth(7);
            gfx.fillStyle(this.bossData.color, 0.3);
            gfx.fillCircle(sx, sy, 12);
            this.scene.tweens.add({
                targets: gfx, alpha: 0, scale: 2, duration: 300,
                onComplete: () => gfx.destroy()
            });

            // Spawn enemy via the scene's spawner logic
            if (this.scene.spawnEnemyAt) {
                this.scene.spawnEnemyAt(sx, sy, enemyType);
            }
        }
    }

    _attackHoming(atk) {
        if (!this.target) return;
        const speed = atk.speed || 130;
        const maxLife = atk.duration || 3000;

        const proj = this.scene.add.graphics().setDepth(8);
        proj.fillStyle(0xff8844, 0.8);
        proj.fillCircle(0, 0, 4);
        proj.setPosition(this.x, this.y);

        let lifetime = 0;
        const update = (time, delta) => {
            if (!proj.active || !this.target?.alive) {
                this.scene.events.off('update', update);
                if (proj.active) proj.destroy();
                return;
            }
            lifetime += delta;

            const dx = this.target.x - proj.x;
            const dy = this.target.y - proj.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            proj.x += (dx / dist) * speed * (delta / 1000);
            proj.y += (dy / dist) * speed * (delta / 1000);

            if (dist < 16 && !this.target.isInvincible) {
                this.target.takeDamage(atk.damage);
                EventBus.emit(Events.PLAYER_HEALTH_CHANGED, {
                    hp: this.target.hp, maxHp: this.target.maxHp
                });
                this.scene.events.off('update', update);
                proj.destroy();
                return;
            }

            if (lifetime > maxLife) {
                this.scene.events.off('update', update);
                proj.destroy();
            }
        };
        this.scene.events.on('update', update);
    }

    _attackCharge(atk) {
        if (!this.target) return;
        const telegraph = atk.telegraph || 1000;
        const chargeSpeed = atk.speed || 200;

        // Telegraph — flash red
        this.setTint(0xff2222);

        // Line telegraph toward player
        const tGfx = this.scene.add.graphics().setDepth(7);
        const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        tGfx.lineStyle(6, 0xff4444, 0.2);
        tGfx.lineBetween(this.x, this.y,
            this.x + Math.cos(angle) * 200,
            this.y + Math.sin(angle) * 200);

        this.scene.time.delayedCall(telegraph, () => {
            if (!this.alive) { tGfx.destroy(); return; }
            tGfx.destroy();
            this.clearTint();

            // Charge!
            this.body.setVelocity(
                Math.cos(angle) * chargeSpeed,
                Math.sin(angle) * chargeSpeed
            );

            // Stop after ~0.5s
            this.scene.time.delayedCall(500, () => {
                if (this.alive) this.body.setVelocity(0, 0);
            });
        });
    }

    _attackBeam(atk) {
        const duration = atk.duration || 2000;
        const rotSpeed = atk.rotationSpeed || 0.8;
        let angle = this.target
            ? Math.atan2(this.target.y - this.y, this.target.x - this.x)
            : 0;
        let elapsed = 0;

        const beamGfx = this.scene.add.graphics().setDepth(7);

        const update = (time, delta) => {
            if (!this.alive) {
                this.scene.events.off('update', update);
                beamGfx.destroy();
                return;
            }
            elapsed += delta;
            angle += rotSpeed * (delta / 1000);

            beamGfx.clear();
            beamGfx.lineStyle(6, 0xaa44ff, 0.6);
            beamGfx.lineBetween(this.x, this.y,
                this.x + Math.cos(angle) * 300,
                this.y + Math.sin(angle) * 300);

            // Damage check along beam
            if (this.target?.alive && !this.target.isInvincible) {
                const px = this.target.x - this.x;
                const py = this.target.y - this.y;
                const dot = px * Math.cos(angle) + py * Math.sin(angle);
                const cross = Math.abs(px * Math.sin(angle) - py * Math.cos(angle));
                if (dot > 0 && cross < 14) {
                    this.target.takeDamage(Math.round(atk.damage * (delta / 1000)));
                }
            }

            if (elapsed >= duration) {
                this.scene.events.off('update', update);
                beamGfx.destroy();
            }
        };
        this.scene.events.on('update', update);
    }

    _attackSpin(atk) {
        const duration = atk.duration || 1500;
        let elapsed = 0;

        const gfx = this.scene.add.graphics().setDepth(7);

        const update = (time, delta) => {
            elapsed += delta;
            gfx.clear();
            gfx.fillStyle(0x8888aa, 0.3);
            gfx.fillCircle(this.x, this.y, atk.radius || 56);

            if (this.target?.alive && !this.target.isInvincible) {
                const d = distance(this.x, this.y, this.target.x, this.target.y);
                if (d < (atk.radius || 56)) {
                    this.target.takeDamage(Math.round(atk.damage * (delta / 1000)));
                }
            }

            if (elapsed >= duration || !this.alive) {
                this.scene.events.off('update', update);
                gfx.destroy();
            }
        };
        this.scene.events.on('update', update);
    }

    _attackAoeZone(atk) {
        const count = atk.count || 3;
        const radius = atk.radius || 80;
        const duration = atk.duration || 3000;

        for (let i = 0; i < count; i++) {
            // Random position near player
            const ox = (Math.random() - 0.5) * 200;
            const oy = (Math.random() - 0.5) * 200;
            const zx = (this.target?.x || this.x) + ox;
            const zy = (this.target?.y || this.y) + oy;

            const zone = this.scene.add.graphics().setDepth(6);
            zone.fillStyle(0x44aa22, 0.15);
            zone.fillCircle(zx, zy, radius);

            let elapsed = 0;
            const tickInterval = 500;
            let tickTimer = 0;

            const update = (time, delta) => {
                elapsed += delta;
                tickTimer += delta;

                if (tickTimer >= tickInterval) {
                    tickTimer = 0;
                    if (this.target?.alive && !this.target.isInvincible) {
                        const d = distance(zx, zy, this.target.x, this.target.y);
                        if (d < radius) {
                            this.target.takeDamage(atk.damage);
                        }
                    }
                }

                if (elapsed >= duration || !this.alive) {
                    this.scene.events.off('update', update);
                    zone.destroy();
                }
            };
            this.scene.events.on('update', update);
        }
    }

    _attackPulse(atk) {
        const radius = atk.radius || 200;

        const gfx = this.scene.add.graphics().setDepth(7);
        gfx.fillStyle(0x66aa44, 0.3);
        gfx.fillCircle(this.x, this.y, radius);

        this.scene.tweens.add({
            targets: gfx, alpha: 0, scale: 1.5, duration: 400,
            onComplete: () => gfx.destroy()
        });

        if (this.target?.alive && !this.target.isInvincible) {
            const d = distance(this.x, this.y, this.target.x, this.target.y);
            if (d < radius) {
                this.target.takeDamage(atk.damage);
            }
        }
    }

    _attackCombo(atk) {
        const hits = atk.hits || 3;
        for (let i = 0; i < hits; i++) {
            this.scene.time.delayedCall(i * 300, () => {
                if (!this.alive) return;
                this._attackSlam({
                    damage: atk.damage,
                    range: atk.range || 56,
                    arc: atk.arc || 90,
                    telegraph: 150
                });
            });
        }
    }

    _attackConeBreath(atk) {
        const range = atk.range || 120;
        const arcDeg = atk.arc || 60;
        const duration = atk.duration || 1500;
        const angle = this.target
            ? Math.atan2(this.target.y - this.y, this.target.x - this.x)
            : 0;

        let elapsed = 0;
        const tickInterval = 200;
        let tickTimer = 0;

        const gfx = this.scene.add.graphics().setDepth(7);

        const update = (time, delta) => {
            elapsed += delta;
            tickTimer += delta;

            gfx.clear();
            const halfArc = Phaser.Math.DegToRad(arcDeg) / 2;
            gfx.fillStyle(0xff4422, 0.2);
            gfx.slice(this.x, this.y, range, angle - halfArc, angle + halfArc, false);
            gfx.fillPath();

            if (tickTimer >= tickInterval) {
                tickTimer = 0;
                if (this.target?.alive && !this.target.isInvincible) {
                    const d = distance(this.x, this.y, this.target.x, this.target.y);
                    if (d <= range) {
                        const aToP = Math.atan2(this.target.y - this.y, this.target.x - this.x);
                        const diff = Math.abs(Phaser.Math.Angle.Wrap(aToP - angle));
                        if (diff <= halfArc) {
                            this.target.takeDamage(atk.damage);
                        }
                    }
                }
            }

            if (elapsed >= duration || !this.alive) {
                this.scene.events.off('update', update);
                gfx.destroy();
            }
        };
        this.scene.events.on('update', update);
    }

    _attackTeleportSlash(atk) {
        if (!this.target) return;

        // Flash out
        const startX = this.x;
        const startY = this.y;
        this.setAlpha(0.3);

        this.scene.time.delayedCall(300, () => {
            if (!this.alive) return;

            // Appear behind player
            const angle = Math.atan2(this.y - this.target.y, this.x - this.target.x);
            const behindX = this.target.x + Math.cos(angle) * 40;
            const behindY = this.target.y + Math.sin(angle) * 40;

            this.setPosition(behindX, behindY);
            this.setAlpha(1);

            // Slash
            this._attackSlam({
                damage: atk.damage,
                range: 56,
                arc: 120,
                telegraph: 100
            });
        });
    }

    _attackGravityWell(atk) {
        if (!this.target) return;
        const wx = this.target.x + (Math.random() - 0.5) * 80;
        const wy = this.target.y + (Math.random() - 0.5) * 80;
        const radius = atk.radius || 100;
        const pullForce = atk.pullForce || 80;
        const duration = atk.duration || 3000;
        let elapsed = 0;

        const gfx = this.scene.add.graphics().setDepth(6);

        const update = (time, delta) => {
            elapsed += delta;

            gfx.clear();
            const alpha = 0.15 + 0.1 * Math.sin(elapsed * 0.005);
            gfx.fillStyle(0x8844ff, alpha);
            gfx.fillCircle(wx, wy, radius);

            // Pull player toward center
            if (this.target?.alive) {
                const d = distance(wx, wy, this.target.x, this.target.y);
                if (d < radius && d > 5) {
                    const dx = wx - this.target.x;
                    const dy = wy - this.target.y;
                    const len = Math.sqrt(dx * dx + dy * dy) || 1;
                    this.target.x += (dx / len) * pullForce * (delta / 1000);
                    this.target.y += (dy / len) * pullForce * (delta / 1000);
                }

                // Tick damage at center
                if (d < 20 && !this.target.isInvincible) {
                    this.target.takeDamage(Math.round(atk.damage * (delta / 1000)));
                }
            }

            if (elapsed >= duration || !this.alive) {
                this.scene.events.off('update', update);
                gfx.destroy();
            }
        };
        this.scene.events.on('update', update);
    }

    /**
     * Override destroy to clean up graphics objects.
     * Called when direct destruction occurs (e.g., scene cleanup).
     */
    destroy(fromScene) {
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
