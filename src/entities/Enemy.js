import { ENTITY_STATES } from '../utils/Constants.js';
import { EventBus, Events } from '../utils/EventBus.js';
import { distance } from '../utils/MathUtils.js';
import { GameConfig } from '../config/GameConfig.js';

/**
 * Base enemy class. All enemy types extend this.
 */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     * @param {string} textureKey
     * @param {object} data - Enemy config from EnemyData
     */
    constructor(scene, x, y, textureKey, data) {
        super(scene, x, y, textureKey);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.enemyData = data;
        this.setDepth(5);

        // Physics body — circular for smooth wall sliding (32x32 sprites)
        const bodyRadius = 12;
        this.body.setCircle(bodyRadius,
            (32 / 2) - bodyRadius,
            (32 / 2) - bodyRadius
        );

        // Stats
        this.maxHp = data.hp;
        this.hp = this.maxHp;
        this.damage = data.damage;
        this.defense = data.defense || 0;
        this.moveSpeed = data.speed;
        this.knockbackResistance = data.knockbackResistance || 0;

        // State
        this.state = ENTITY_STATES.IDLE;
        this.alive = true;
        this.target = null; // reference to player or companion

        // Contact damage cooldown
        this.attackCooldown = data.attackCooldown || 1000;
        this.lastAttackTime = 0;

        // ── Animation state ──────────────────────────────────────────────
        this._textureKey = textureKey;
        this._lastAnimKey = '';
        this._facingDir = 'south';
        // Check if real sprite animations exist for this enemy
        this._hasWalkAnims = scene.anims.exists(`${textureKey}_walk_south`);
        // Start on idle frame if real sprite loaded
        if (this._hasWalkAnims) {
            this.play(`${textureKey}_idle_south`, true);
        }

    }

    /**
     * Set the chase target (usually the player).
     */
    setTarget(target) {
        this.target = target;
    }

    /**
     * Take damage (called by CombatSystem).
     * @param {number} amount - Raw damage before defense
     * @returns {number} Actual damage taken
     */
    takeDamage(amount) {
        if (!this.alive) return 0;

        const actual = Math.max(1, amount - this.defense);
        this.hp -= actual;

        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        }

        return actual;

    }

    die() {
        this.alive = false;
        this.state = ENTITY_STATES.DEAD;
        this.body.setVelocity(0, 0);
        this.body.enable = false;

        EventBus.emit(Events.ENEMY_DIED, {
            enemy: this,
            x: this.x,
            y: this.y,
            scoreValue: this.enemyData.scoreValue || 0
        });

        // Death animation: shrink and fade
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scaleX: 0.3,
            scaleY: 0.3,
            duration: 300,
            onComplete: () => {
                this.destroy();
            }
        });
    }


    /**
     * Check if this enemy can deal contact damage (respects cooldown).
     */
    canDealContactDamage() {
        const now = this.scene.time.now;
        if (now - this.lastAttackTime >= this.attackCooldown) {
            this.lastAttackTime = now;
            return true;
        }
        return false;
    }

    /**
     * Get distance to target.
     */
    distanceToTarget() {
        if (!this.target) return Infinity;
        return distance(this.x, this.y, this.target.x, this.target.y);
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);

        // Self-manage fog-of-war visibility each frame.
        const fog = this.scene.fogOfWar;
        if (fog) {
            const ts = GameConfig.TILE_SIZE;
            const tx = (this.x / ts) | 0;
            const ty = (this.y / ts) | 0;
            const visible = fog.isVisible(tx, ty);
            if (this.visible !== visible) {
                this.setVisible(visible);
            }
        }

        // Update walk animation based on velocity
        if (this.alive && this._hasWalkAnims) {
            this._updateEnemyAnimation();
        }

        // Override in subclasses for AI behavior
    }

    /**
     * Update walk/idle animation based on current velocity direction.
     */
    _updateEnemyAnimation() {
        const vx = this.body.velocity.x;
        const vy = this.body.velocity.y;
        const moving = Math.abs(vx) > 5 || Math.abs(vy) > 5;

        if (moving) {
            // Determine facing direction from velocity
            if (Math.abs(vx) > Math.abs(vy)) {
                this._facingDir = vx > 0 ? 'east' : 'west';
            } else {
                this._facingDir = vy > 0 ? 'south' : 'north';
            }
        }

        const animKey = moving
            ? `${this._textureKey}_walk_${this._facingDir}`
            : `${this._textureKey}_idle_${this._facingDir}`;

        if (animKey !== this._lastAnimKey) {
            this._lastAnimKey = animKey;
            if (this.scene.anims.exists(animKey)) {
                this.play(animKey, true);
            }
        }
    }

}

