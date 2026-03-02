import { ENTITY_STATES } from '../utils/Constants.js';
import { distance } from '../utils/MathUtils.js';
import { GameConfig } from '../config/GameConfig.js';

/**
 * SkeletonMinion — summoned by Necromancer's Raise Skeleton special.
 * Chases nearest enemy, deals melee contact damage, despawns after a timer.
 */
export class SkeletonMinion extends Phaser.Physics.Arcade.Sprite {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     * @param {object} owner  - Player reference (the necromancer)
     * @param {number} duration - lifetime in ms
     */
    constructor(scene, x, y, owner, duration = 30000) {
        super(scene, x, y, 'skeleton_minion');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setDepth(5);
        // Physics body for 32x32 sprite
        const bodyRadius = 10;
        this.body.setCircle(bodyRadius,
            (32 / 2) - bodyRadius,
            (32 / 2) - bodyRadius
        );

        this.owner = owner;
        this.alive = true;
        this.hp = 30;
        this.maxHp = 30;
        this.damage = 8;
        this.moveSpeed = 120;
        this.attackCooldown = 800;
        this.lastAttackTime = 0;
        this.state = ENTITY_STATES.IDLE;

        // Animation state
        this._lastAnimKey = '';
        this._facingDir = 'south';
        this._hasWalkAnims = scene.anims.exists('skeleton_minion_walk_south');
        if (this._hasWalkAnims) {
            this.play('skeleton_minion_idle_south', true);
        }

        // Auto-despawn timer
        this._despawnTimer = scene.time.delayedCall(duration, () => {
            this.die();
        });

        // Spawn visual
        const gfx = scene.add.graphics();
        gfx.fillStyle(0x8844aa, 0.5);
        gfx.fillCircle(x, y, 16);
        gfx.setDepth(9);
        scene.tweens.add({
            targets: gfx, alpha: 0, scale: 1.5, duration: 300,
            onComplete: () => gfx.destroy()
        });
    }

    /**
     * Take damage from enemies.
     */
    takeDamage(amount) {
        if (!this.alive) return 0;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        }
        return amount;
    }

    die() {
        if (!this.alive) return;
        this.alive = false;
        this.state = ENTITY_STATES.DEAD;
        this.body.setVelocity(0, 0);
        this.body.enable = false;

        if (this._despawnTimer) this._despawnTimer.remove(false);

        // Death puff
        this.scene.tweens.add({
            targets: this,
            alpha: 0, scaleX: 0.3, scaleY: 0.3,
            duration: 250,
            onComplete: () => this.destroy()
        });
    }

    /**
     * Can this minion deal contact damage (cooldown check)?
     */
    canDealContactDamage() {
        const now = this.scene.time.now;
        if (now - this.lastAttackTime >= this.attackCooldown) {
            this.lastAttackTime = now;
            return true;
        }
        return false;
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.alive) return;

        // Find nearest enemy and chase
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

        if (closest && closestDist < 300) {
            // Chase
            const dx = closest.x - this.x;
            const dy = closest.y - this.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            this.body.setVelocity(
                (dx / len) * this.moveSpeed,
                (dy / len) * this.moveSpeed
            );
        } else if (this.owner?.alive) {
            // Return to owner if no enemies nearby
            const dx = this.owner.x - this.x;
            const dy = this.owner.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 60) {
                const len = dist || 1;
                this.body.setVelocity(
                    (dx / len) * this.moveSpeed * 0.7,
                    (dy / len) * this.moveSpeed * 0.7
                );
            } else {
                this.body.setVelocity(0, 0);
            }
        }

        // Walk animation
        if (this._hasWalkAnims) {
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
            const animKey = moving
                ? `skeleton_minion_walk_${this._facingDir}`
                : `skeleton_minion_idle_${this._facingDir}`;
            if (animKey !== this._lastAnimKey) {
                this._lastAnimKey = animKey;
                if (this.scene.anims.exists(animKey)) {
                    this.play(animKey, true);
                }
            }
        }

        // Fog-of-war follow owner visibility
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

    /**
     * Override destroy to clean up despawn timer.
     */
    destroy(fromScene) {
        if (this._despawnTimer) {
            this._despawnTimer.remove(false);
            this._despawnTimer = null;
        }
        super.destroy(fromScene);
    }
}
