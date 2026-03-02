import { ENTITY_STATES } from '../utils/Constants.js';
import { EventBus, Events } from '../utils/EventBus.js';
import { ClassData } from '../config/ClassData.js';
import { GameConfig } from '../config/GameConfig.js';
import { distance } from '../utils/MathUtils.js';

/**
 * Companion — an AI-controlled ally that fights alongside the player.
 * Uses the same class stats at 70% effectiveness.
 */
export class Companion extends Phaser.Physics.Arcade.Sprite {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     * @param {string} classKey
     * @param {object} player - reference to the player entity
     */
    constructor(scene, x, y, classKey, player) {
        const classData = ClassData[classKey];
        super(scene, x, y, `player_${classKey}`, 0);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.classKey = classKey;
        this.classData = classData;
        this.owner = player;
        this.setDepth(9);

        // Physics body - 32x32 pixel art sprites
        const bodyRadius = 12;
        this.body.setCircle(bodyRadius,
            (32 / 2) - bodyRadius,
            (32 / 2) - bodyRadius
        );

        // Stats at 70% effectiveness
        const EFF = 0.7;
        this.maxHp = Math.floor(classData.hp * EFF);
        this.hp = this.maxHp;
        this.attackPower = Math.floor(classData.attack * EFF);
        this.defense = Math.floor(classData.defense * EFF);

        const speedMap = {
            slow: GameConfig.PLAYER_SPEED_SLOW,
            medium: GameConfig.PLAYER_SPEED_MEDIUM,
            fast: GameConfig.PLAYER_SPEED_FAST,
        };
        this.moveSpeed = (speedMap[classData.speed] || GameConfig.PLAYER_SPEED_MEDIUM) * EFF;

        // State
        this.alive = true;
        this.state = ENTITY_STATES.IDLE;
        this.isInvincible = false;
        this.target = null; // current enemy target

        // Attack cooldown
        this.attackCooldownDuration = 1000 / (classData.attackSpeed * EFF);
        this.attackCooldownTimer = 0;

        // AI behavior config per class
        this.aiType = this._getAiType();
        this.preferredRange = this._getPreferredRange();
        this.aggroRange = 200;

        // Formation offset index (set externally after creation)
        this.formationIndex = 0;

        // Revival
        this.downed = false;
        this.downedTimer = 0;
        this.reviveTimer = 0;
        this.maxDownTime = 30000; // permadeath after 30s

        // Animation state
        this._lastAnimKey = '';
        this._facingDir = 'south';
        const textureKey = `player_${classKey}`;
        this._hasWalkAnims = scene.anims.exists(`${textureKey}_walk_south`);
        if (this._hasWalkAnims) {
            this.play(`${textureKey}_idle_south`, true);
        }

    }

    _getAiType() {
        switch (this.classKey) {
            case 'warrior': return 'bodyguard';
            case 'wizard': return 'artillery';
            case 'archer': return 'skirmisher';
            case 'valkyrie': return 'sweeper';
            case 'necromancer': return 'multiplier';
            default: return 'bodyguard';
        }
    }

    _getPreferredRange() {
        switch (this.classKey) {
            case 'warrior': return 40;    // close
            case 'wizard': return 180;   // far
            case 'archer': return 160;   // far
            case 'valkyrie': return 60;    // medium
            case 'necromancer': return 140;   // mid-far
            default: return 80;
        }
    }

    takeDamage(amount) {
        if (!this.alive || this.downed) return 0;
        const actual = Math.max(1, amount - this.defense);
        this.hp -= actual;

        if (this.hp <= 0) {
            this.hp = 0;
            this._goDown();
        }

        return actual;
    }

    _goDown() {
        this.downed = true;
        this.downedTimer = 0;
        this.body.setVelocity(0, 0);
        this.setAlpha(0.4);
        this.setTint(0x888888);

        // Down indicator
        this._downText = this.scene.add.text(this.x, this.y - 16, 'HELP!', {
            fontFamily: 'monospace', fontSize: '8px',
            color: '#ff4444', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(10);
    }

    revive() {
        this.downed = false;
        this.hp = Math.floor(this.maxHp * 0.5);
        this.setAlpha(1);
        this.clearTint();
        if (this._downText?.active) this._downText.destroy();
    }

    die() {
        this.alive = false;
        this.state = ENTITY_STATES.DEAD;
        this.body.setVelocity(0, 0);
        this.body.enable = false;

        if (this._downText?.active) this._downText.destroy();

        this.scene.tweens.add({
            targets: this,
            alpha: 0, scaleX: 0.3, scaleY: 0.3,
            duration: 400,
            onComplete: () => this.destroy()
        });
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.alive) return;

        // Attack cooldown
        if (this.attackCooldownTimer > 0) {
            this.attackCooldownTimer -= delta;
        }

        // Downed logic
        if (this.downed) {
            this.downedTimer += delta;
            if (this.downedTimer >= this.maxDownTime) {
                this.die(); // permadeath
                return;
            }

            // Check if player is close enough for revival
            const d = distance(this.x, this.y, this.owner.x, this.owner.y);
            if (d < 40) {
                this.reviveTimer += delta;
                if (this.reviveTimer >= 3000) {
                    this.revive();
                    this.reviveTimer = 0;
                }
            } else {
                this.reviveTimer = 0;
            }

            if (this._downText?.active) {
                this._downText.setPosition(this.x, this.y - 16);
            }
            return;
        }

        // AI behavior
        this._updateAI(delta);

        // Walk animation
        if (this._hasWalkAnims) {
            this._updateCompanionAnimation();
        }

        // Fog follow
        const fog = this.scene.fogOfWar;
        if (fog) {
            const ts = GameConfig.TILE_SIZE;
            const tx = (this.x / ts) | 0;
            const ty = (this.y / ts) | 0;
            const vis = fog.isVisible(tx, ty);
            if (this.visible !== vis) {
                this.setVisible(vis);
            }
        }
    }

    _updateAI(delta) {
        // Find target enemy
        const enemies = this.scene.enemies;
        if (!enemies) return;

        let closest = null;
        let closestDist = Infinity;

        for (const enemy of enemies.getChildren()) {
            if (!enemy.alive) continue;
            const d = distance(this.x, this.y, enemy.x, enemy.y);
            if (d < closestDist) {
                closestDist = d;
                closest = enemy;
            }
        }

        this.target = closest;

        if (closest && closestDist <= this.aggroRange) {
            // Combat behavior based on AI type
            this._combatBehavior(closest, closestDist, delta);
        } else {
            // Follow player
            this._followPlayer(delta);
        }
    }

    _combatBehavior(enemy, dist, delta) {
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;

        switch (this.aiType) {
            case 'bodyguard':
            case 'sweeper':
                // Move toward enemy
                if (dist > this.preferredRange * 0.8) {
                    this.body.setVelocity(
                        (dx / len) * this.moveSpeed,
                        (dy / len) * this.moveSpeed
                    );
                } else {
                    this.body.setVelocity(0, 0);
                }
                break;

            case 'artillery':
            case 'multiplier':
                // Keep distance
                if (dist < this.preferredRange * 0.7) {
                    this.body.setVelocity(
                        -(dx / len) * this.moveSpeed,
                        -(dy / len) * this.moveSpeed
                    );
                } else if (dist > this.preferredRange * 1.3) {
                    this.body.setVelocity(
                        (dx / len) * this.moveSpeed * 0.6,
                        (dy / len) * this.moveSpeed * 0.6
                    );
                } else {
                    this.body.setVelocity(0, 0);
                }
                break;

            case 'skirmisher':
                // Circle-strafe
                const perpX = -dy / len;
                const perpY = dx / len;
                const approach = dist > this.preferredRange ? 0.5 : -0.2;
                this.body.setVelocity(
                    (perpX * 0.7 + (dx / len) * approach) * this.moveSpeed,
                    (perpY * 0.7 + (dy / len) * approach) * this.moveSpeed
                );
                break;
        }

        // Attack if in range and off cooldown
        if (dist <= this.classData.attackStyle.range * 1.2 && this.attackCooldownTimer <= 0) {
            this._performAttack(enemy);
        }
    }

    _performAttack(enemy) {
        this.attackCooldownTimer = this.attackCooldownDuration;
        const angle = Math.atan2(enemy.y - this.y, enemy.x - this.x);
        const style = this.classData.attackStyle;

        if (style.type === 'projectile') {
            // Fire a visible projectile (wizard, archer) through CombatSystem
            this.scene.combatSystem?.firePlayerProjectile(
                this, angle, style, this.attackPower
            );
        } else if (style.type === 'cone') {
            // Cone attack (necromancer)
            this.scene.combatSystem?.resolveConeHit(
                this, angle, style, this.attackPower
            );
        } else {
            // Melee (warrior, valkyrie)
            this.scene.combatSystem?.dealDamage(
                this, enemy, this.attackPower, 0.3, angle
            );

            // Melee swing visual
            const gfx = this.scene.add.graphics().setDepth(9);
            const halfArc = Phaser.Math.DegToRad(style.arc || 60) / 2;
            gfx.fillStyle(this.classData.color, 0.3);
            gfx.slice(this.x, this.y, style.range, angle - halfArc, angle + halfArc, false);
            gfx.fillPath();
            this.scene.tweens.add({
                targets: gfx, alpha: 0, duration: 150,
                onComplete: () => gfx.destroy()
            });
        }
    }

    _followPlayer(delta) {
        // Formation offsets so companions spread out behind the player
        const FORMATION_OFFSETS = [
            { angle: Math.PI * 0.75, dist: 40 },   // back-left
            { angle: -Math.PI * 0.75, dist: 40 },   // back-right
            { angle: Math.PI, dist: 50 },             // directly behind
        ];
        const formation = FORMATION_OFFSETS[this.formationIndex % FORMATION_OFFSETS.length];

        // Offset is relative to player's facing angle
        const playerAngle = this.owner.facingAngle || 0;
        const targetX = this.owner.x + Math.cos(playerAngle + formation.angle) * formation.dist;
        const targetY = this.owner.y + Math.sin(playerAngle + formation.angle) * formation.dist;

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 20) {
            const len = dist || 1;
            // Speed up if falling behind
            const speedMult = dist > 100 ? 1.2 : 0.8;
            this.body.setVelocity(
                (dx / len) * this.moveSpeed * speedMult,
                (dy / len) * this.moveSpeed * speedMult
            );
        } else {
            this.body.setVelocity(0, 0);
        }
    }

    _updateCompanionAnimation() {
        const vx = this.body.velocity.x;
        const vy = this.body.velocity.y;
        const moving = Math.abs(vx) > 5 || Math.abs(vy) > 5;

        if (moving) {
            if (Math.abs(vx) > Math.abs(vy)) {
                this._facingDir = vx > 0 ? 'east' : 'west';
            } else {
                this._facingDir = vy > 0 ? 'south' : 'north';
            }
        }

        const textureKey = `player_${this.classKey}`;
        const animKey = moving
            ? `${textureKey}_walk_${this._facingDir}`
            : `${textureKey}_idle_${this._facingDir}`;

        if (animKey !== this._lastAnimKey) {
            this._lastAnimKey = animKey;
            if (this.scene.anims.exists(animKey)) {
                this.play(animKey, true);
            }
        }
    }
}
